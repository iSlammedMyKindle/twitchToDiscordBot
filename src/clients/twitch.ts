import bridge, { genericPromiseError, manageMsgCache } from './bridge';
import authenticateTwitch, { AuthResponse } from '../oauth';
import { conjoinedMsg, twitchMsg } from '../messageObjects';
import { Message } from 'discord.js';
import { promises as fs } from 'fs';
import { RefreshingAuthProvider, getTokenInfo } from '@twurple/auth';
import { ClearMsg, PrivateMessage, ChatClient } from '@twurple/chat';
import { ApiClient } from '@twurple/api';
import { node } from '../linkedList';
import appConfig from '../appConfig.js';

// Twitch init
// ///////////


// Login to twitch using the access token found in our oauth process
async function loginToTwitch(): Promise<void> 
{
    let tokenData: AuthResponse;

    try 
    {
        if(appConfig.appSettings.save_token) 
        {
            tokenData = JSON.parse(await fs.readFile('./tokens.json', 'utf-8'));
            console.log('Using saved token data found in ./tokens.json');
        }
    }
    catch(error: unknown) 
    {
        /* The only way for an error to be thrown here is if we try to read tokens.json and it 
        doesn't exist, which will only happen if we have
        save_token enabled, so it's safe to just write to tokens.json */
        const res: AuthResponse = await authenticateTwitch(appConfig.twitch, appConfig.webServer);

        await fs.writeFile('./tokens.json', JSON.stringify(res));
        console.log('Saved token data.');

        loginToTwitch();
        return;
    }

    // If bad data is given to our auth provider you'll get a log along the lines of "no valid token avaiable; trying to refresh.." etc.
    const authProvider: RefreshingAuthProvider = new RefreshingAuthProvider(
        {
            'clientId': appConfig.twitch.client_id,
            'clientSecret': appConfig.twitch.client_secret,
            onRefresh: async function(newTokenData) 
            {
                console.warn('yes', arguments);
                return appConfig.appSettings.save_token ? await fs.writeFile('./tokens.json', JSON.stringify(newTokenData, null, 4), 'utf-8') : null;
            }
        }
    );

    // This should only run if saving the token is turned off (appSettings.SAVE_TOKEN)
    if(!tokenData)
        tokenData = await authenticateTwitch(appConfig.twitch, appConfig.webServer);

    bridge.twitch.botUserId = (await getTokenInfo(tokenData.accessToken, appConfig.twitch.client_id)).userId;

    authProvider.addUser(bridge.twitch.botUserId, tokenData! as never, ['chat']);

    // TODO: if we need to scale this to *much* more than just one twitch channel, this won't be usable, there will need to be another approach to record the ID's of the bot user
    bridge.twitch.authChatClient = new ChatClient({ authProvider, channels: [appConfig.twitch.channels[0]] });
    bridge.twitch.anonChatClient = new ChatClient({ authProvider: undefined, channels: [appConfig.twitch.channels[0]] });
    bridge.twitch.apiChatClient = new ApiClient({ authProvider });

    bridge.twitch.authChatClient.connect().then(() =>
        console.log('Authenticated Twitch Client has connected')
    );

    bridge.twitch.anonChatClient.connect().then(() =>
        console.log('Anon Twitch Client has connected')
    );

    // Using anonChatClient so that we recieve the messages we send, yknow.
    bridge.twitch.anonChatClient.onMessage((channel: string, user: string, message: string, userState: PrivateMessage) => 
    {
        if(!bridge.targetDiscordChannel)
            throw new Error('Cannot find Discord channel.');

        const newMessage: string = message.replace(/@([A-Za-z])\w+ /, '');

        // If the person who sent the message's name isn't equal to the bot's name
        // then send the Discord message.
        if(!(appConfig.twitch.account_username === user.toLowerCase()))
        {
            /**
                'reply-parent-display-name': 'testingaccount__',
                'reply-parent-msg-body': 'test',
                'reply-parent-msg-id': 'f279b175-7100-4486-bb96-c188ea102bbd',
                'reply-parent-user-id': '821973125',
                   'reply-parent-user-login': 'testingaccount__',

                Those keys will exist on the userState.tags (Map<String, String>) map, if it
                is a reply.
            */

            // if there is a reply parent display name
            // we know it's a reply.
            if(userState.tags.get('reply-parent-display-name'))
            {
                // get the linked list node from the Twitch ID that was replied to
                const fetchedNode: node<conjoinedMsg> = bridge.discordTwitchCacheMap.get(userState.tags.get('reply-parent-msg-id'));

                if(!fetchedNode)
                    return;

                try
                {
                    fetchedNode.data?.message?.reply(`[t][${ user }] ${ newMessage }`);
                    return;
                }
                catch(err: unknown)
                {
                    console.error(`Failed to reply to Discord message (ID %d)\nError: ${ err }`, fetchedNode.data?.message?.id);
                }
            }

            // We should (hopefully) not get stuck in a loop here due to our
            // checks in discord.ts
            bridge.targetDiscordChannel.send(`[t][${ user }] ${ message }`).then((discordMessage: Message<boolean>) =>
            {
                // Discord actually stores message object after the promise is fullfilled (unlike twitch), so we can just create this object on the fly
                // Map both of these results for later querying. Eventually these will go away as we're deleting messages we don't care about anymore.
                const twitchMessage = new twitchMsg(message, false, userState, channel);
                const listNode = bridge.messageLinkedListInterface.addNode(new conjoinedMsg(discordMessage, [twitchMessage]));

                bridge.discordTwitchCacheMap.set(twitchMessage, listNode);
                bridge.discordTwitchCacheMap.set(twitchMessage.userState.id, listNode);
                bridge.discordTwitchCacheMap.set(discordMessage, listNode);
                bridge.discordTwitchCacheMap.set(discordMessage.id, listNode);

                // Count upwards and delete the oldest message if need be
                manageMsgCache();
            }, genericPromiseError);
        }

        if(bridge.twitchMessageSearchCache[newMessage])
        {
            const existingNode = bridge.twitchMessageSearchCache[newMessage],
                twitchMessage = new twitchMsg(message, true, userState, channel);

            existingNode.data?.twitchArray.push(twitchMessage);
            bridge.discordTwitchCacheMap.set(twitchMessage, existingNode);
            bridge.discordTwitchCacheMap.set(twitchMessage.userState.id, existingNode);

            // Remove this from the cache since we found it
            delete bridge.twitchMessageSearchCache[message];
        }
    });


    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    bridge.twitch.anonChatClient?.onMessageRemove((_channel: string, id: string, _message: ClearMsg) =>
    {
        const linkedNode: node<conjoinedMsg> = bridge.discordTwitchCacheMap.get(id);

        if(!linkedNode)
            return;

        if(linkedNode.data?.message?.deletable)
            linkedNode.data.message.delete();

        manageMsgCache(linkedNode);
    });
}

// Login to twitch
// There are a lot of things that were named differently because this command has the potential of using environemnt variables, so this will be painful to look at and I'm sorry XP
loginToTwitch();