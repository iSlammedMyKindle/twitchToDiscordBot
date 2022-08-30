import { conjoinedMsg, twitchMsg } from '../messageObjects';
import { authenticateTwitch } from '../oauth';
import { Message } from 'discord.js';
import bridge, { genericPromiseError, configFile } from './bridge';
import tmijs from 'tmi.js';
import fs from 'fs';

let lastUserStateMsg: any = bridge.lastUserStateMsg;
let twitchClient: tmijs.Client = bridge.twitchClient as tmijs.Client;

const twitchMessageSearchCache = bridge.twitchMessageSearchCache;
const messageLinkdListInterface = bridge.messageLinkdListInterface;
const discordTwitchCacheMap = bridge.discordTwitchCacheMap;

//Twitch init
/////////////

function registerTwitch(): void
{
    /**
    * Login to twitch using the access token found in our oauth process
    * @param {string} {access_token} a javascript object containing at minimum, a twitch access token 
    * @param {boolean} shipTokenSave
    */
    function loginToTwitch({ access_token }: { access_token: string; }, skipTokenSave: boolean): void
    {
        //TODO: detect replies by looking at previously recorded messages (userState["reply-parent-msg-id"])
        //If we have the save token flag enabled, save this to "devTwitchToken"
        if(!skipTokenSave && configFile.T2S_DEV_SAVE_TOKEN)
            fs.writeFile('./devTwitchToken', access_token, null, error =>
            {
                if(error) console.error('I hit a snag...', error);
            });

        twitchClient = tmijs.Client({
            options: { debug: true },
            identity: {
                username: configFile.T2S_USER,
                password: 'oauth:' + access_token
            },
            channels: configFile.T2S_CHANNELS
        });



        twitchClient.connect().then(() =>
        {
            console.log('Twitch bot is live! Sending a buffer message...', configFile.T2S_USER);
            //Send a buffer message that allows us to track messages being sent as the twitch bot
            //TODO: if we need to scale this to *much* more than just one twitch channel, this won't be usable, there will need to be another approach to record the ID's of the bot user
            twitchClient.say(configFile.T2S_CHANNELS[0], 'twitch bot buffer message!');
        });

        twitchClient.on('message', (channel: string, userState: tmijs.Userstate, msg: string, self: boolean) =>
        {
            //Send a message to twitch
            //Something fascinating is, if a message is sent by the bot, self will be true. If I use the same username though when I chat, it's false.
            if(!self)
            {
                // Good idea to check if it exists or not, dunno.
                if(!bridge.targetDiscordChannel)
                {
                    throw new Error('Cannot find Discord channel.');
                }

                bridge.targetDiscordChannel.send(`[t][${ userState['display-name'] }] ${ msg }`).then((discordMessage: Message<boolean>) =>
                {
                    //Discord actually stores message object after the promise is fullfilled (unlike twitch), so we can just create this object on the fly

                    //Map both of these results for later querying. Eventually these will go away as we're deleting messages we don't care about anymore.
                    const twitchMessage = new twitchMsg(msg, self, userState, channel);
                    const listNode = messageLinkdListInterface.addNode(new conjoinedMsg(discordMessage, [twitchMessage]));

                    discordTwitchCacheMap.set(twitchMessage, listNode);
                    discordTwitchCacheMap.set(discordMessage, listNode);

                    //Count upwards and delete the oldest message if need be
                    bridge.manageMsgCache();
                }, genericPromiseError);
            }

            //If we reach this and we're looking for this very message, then we have a chance to re-bind the message that we tried to send via discord
            else
            {

                //Record that last given userstate ID (specific to bots)
                if(userState.id)
                {
                    //Set the message to contain the special value: botUserStateId
                    lastUserStateMsg.userState.botUserStateId = userState.id;
                }
                //TODO: this is a paradox you need to solve - find a way to delete the first message that isn't the buffer; the buffer message is *not* in the message cache.
                else
                {
                    console.log('Got the userstate message with no ID -_-');

                    //[trailing bot message] This is a special method of recording the last twitch message because we need to have a method of removing this message after the fact
                    const twitchMessage = new twitchMsg(msg, self, userState, channel);
                    lastUserStateMsg = twitchMessage;

                    //Adding an node intentionally without a discord message because this is the buffer message.
                    const listNode = messageLinkdListInterface.addNode(new conjoinedMsg(undefined, [twitchMessage]));
                    discordTwitchCacheMap.set(twitchMessage, listNode);
                }

                //before we override the last message, lets make sure we delete this twitch message if required (...this is jank)
                //We wait until after the userstate message gets a bot message ID
                if(lastUserStateMsg?.userState.cueForDelete)
                {
                    bridge.twitchDelete(lastUserStateMsg);
                    bridge.manageMsgCache(discordTwitchCacheMap.get(lastUserStateMsg));
                }

                //If we found the twitch message we wanted to connect, we no longer need it in the cache
                if(twitchMessageSearchCache[msg])
                {

                    const existingNode = twitchMessageSearchCache[msg],
                        twitchMessage = new twitchMsg(msg, self, userState, channel);

                    lastUserStateMsg = twitchMessage;

                    existingNode.data.twitchArray.push(twitchMessage);
                    discordTwitchCacheMap.set(twitchMessage, existingNode);

                    //Remove this from the cache since we found it
                    delete twitchMessageSearchCache[msg];
                }
            }
        });
    }

    //Login to twitch
    //There are a lot of things that were named differently because this command has the potential of using environemnt variables, so this will be painful to look at and I'm sorry XP
    if(configFile.T2S_DEV_SAVE_TOKEN && fs.existsSync('./devTwitchToken'))
    {
        //If the file exists, use the thing
        console.log('==Found the token file! (devTwitchToken!) Using that instead of logging in via oauth (if this token is old, delete the file)==');
        loginToTwitch({ access_token: fs.readFileSync('./devTwitchToken') as unknown as string }, true);
    }
    else authenticateTwitch({
        scope: configFile.T2S_SCOPE,
        redirect_uri: configFile.T2S_REDIRECT_URI,
        client_id: configFile.T2S_CLIENT_ID,
        client_secret: configFile.T2S_SECRET
    }).then(loginToTwitch as any);
}

export default registerTwitch;