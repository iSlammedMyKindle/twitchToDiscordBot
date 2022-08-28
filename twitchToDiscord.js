//Made by iSlammedMyKindle in 2022!
//A bot that fuses the twitch chat and the desired discord channel together.

//The bot isn't designed to scale for now. Using this to setup my personal server & twitch chat.
const configFile = require('./config.json'),
    tmijs = require('tmi.js'),
    { authenticateTwitch } = require('./oauth'),
    { Client } = require('discord.js'),
    fs = require('fs'),
    { nodeInterface } = require('./linkedList'),
    {conjoinedMsg, twitchMsg} = require('./messageObjects');
    MAX_MSG_CACHE = 100; //Not a hard limit, it's more of a practical one

var twitchClient, //Defined after retrieving the authentication token.
    currMsgCount = 0,
    lastUserStateMsg;

/**
 * If an error happens either on twitch or discord, print the thing
 * @param {*} error 
 */
const genericPromiseError =  error=>console.error('Snap, I hit a snag... >.<', error);

//The jank method of finding twitch messages. If we get a message from discord, we send the message as the key here, then we use that to determine if the message is ours and then link it back to discord.
const twitchMessageSearchCache = {},

    //This is a linked list that will contain the last 100 messages.
    messageLinkdListInterface = new nodeInterface(),

    //This map will store discord & twitch messages, with the keys being the message objects. If we need to make edits, then we just go here to determine if the message is something we're storing already
    discordTwitchCacheMap = new Map();

function manageMsgCache(specificNode){
    if(!specificNode && currMsgCount < MAX_MSG_CACHE) return currMsgCount++;

    //Delete messages once we hit our cache limit, or if we defined a node to delete, destroy that instead
    if(!specificNode)
        specificNode = messageLinkdListInterface.beginningNode; //Garbage collection takes care of this, so need to run delete
        
    messageLinkdListInterface.rebindForDelete(specificNode);

    if(specificNode.data.twitchArray[0])
        discordTwitchCacheMap.delete(specificNode.data.twitchArray[0]);
    
    if(specificNode.data.discord)
        discordTwitchCacheMap.delete(specificNode.data.discord);

    return specificNode;
}

var twitchDelete = twitchObj=>{
    twitchClient.deletemessage(twitchObj.channel, twitchObj.userState.botUserStateId || twitchObj.userState.id).then(undefined, genericPromiseError);
}

//Twitch init
/////////////

/**
 * Login to twitch using the access token found in our oauth process
 * @param {string} {access_token} a javascript object containing at minimum, a twitch access token 
 */
function loginToTwitch({access_token}, skipTokenSave){
    //TODO: detect replies by looking at previously recorded messages (userState["reply-parent-msg-id"])
    //If we have the save token flag enabled, save this to "devTwitchToken"
    if(!skipTokenSave && configFile.T2S_DEV_SAVE_TOKEN)
        fs.writeFile('./devTwitchToken', access_token, undefined, error=>{
            if(error) console.error("I hit a snag...", error);
        });

    twitchClient = tmijs.Client({
        options: {debug:true},
        identity:{
            username:configFile.T2S_USER,
            password:'oauth:'+access_token
        },
        channels: configFile.T2S_CHANNELS
    });
    
    twitchClient.connect().then(()=>{
        console.log("Twitch bot is live! Sending a buffer message...", configFile.T2S_USER);
        //Send a buffer message that allows us to track messages being sent as the twitch bot
        //TODO: if we need to scale this to *much* more than just one twitch channel, this won't be usable, there will need to be another approach to record the ID's of the bot user
        twitchClient.say(configFile.T2S_CHANNELS[0], 'twitch bot buffer message!');
    });

    twitchClient.on('message', (channel, userState, msg, self)=>{
        //Send a message to twitch
        //Something fascinating is, if a message is sent by the bot, self will be true. If I use the same username though when I chat, it's false.
        if(!self){
            targetDiscordChannel.send(`[t][${userState["display-name"]}] ${msg}`).then(discordMessage=>{
               //Discord actually stores message object after the promise is fullfilled (unlike twitch), so we can just create this object on the fly
   
               //Map both of these results for later querying. Eventually these will go away as we're deleting messages we don't care about anymore.
               const twitchMessage = new twitchMsg(msg, self, userState, channel);
               const listNode = messageLinkdListInterface.addNode(new conjoinedMsg(discordMessage, [twitchMessage]));
   
               discordTwitchCacheMap.set(twitchMessage, listNode);
               discordTwitchCacheMap.set(discordMessage, listNode);
   
               //Count upwards and delete the oldest message if need be
               manageMsgCache();
            }, genericPromiseError);
        }

        //If we reach this and we're looking for this very message, then we have a chance to re-bind the message that we tried to send via discord
        else{

            //Record that last given userstate ID (specific to bots)
            if(userState.id){
                //Set the message to contain the special value: botUserStateId
                lastUserStateMsg.userState.botUserStateId = userState.id;
            }
            //TODO: this is a paradox you need to solve - find a way to delete the first message that isn't the buffer; the buffer message is *not* in the message cache.
            else{
                console.log("Got the userstate message with no ID -_-");

                //[trailing bot message] This is a special method of recording the last twitch message because we need to have a method of removing this message after the fact
                let twitchMessage = new twitchMsg(msg, self, userState, channel);
                lastUserStateMsg = twitchMessage;

                //Adding an node intentionally without a discord message because this is the buffer message.
                const listNode = messageLinkdListInterface.addNode(new conjoinedMsg(undefined, [twitchMessage]));
                discordTwitchCacheMap.set(twitchMessage, listNode);
            }

            //before we override the last message, lets make sure we delete this twitch message if required (...this is jank)
            //We wait until after the userstate message gets a bot message ID
            if(lastUserStateMsg?.userState.cueForDelete){
                twitchDelete(lastUserStateMsg);
                manageMsgCache(discordTwitchCacheMap.get(lastUserStateMsg));
            }

            //If we found the twitch message we wanted to connect, we no longer need it in the cache
            if(twitchMessageSearchCache[msg]){

                let existingNode = twitchMessageSearchCache[msg],
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
if(configFile.T2S_DEV_SAVE_TOKEN && fs.existsSync('./devTwitchToken')){
    //If the file exists, use the thing
    console.log('==Found the token file! (devTwitchToken!) Using that instead of logging in via oauth (if this token is old, delete the file)==');
    loginToTwitch({access_token: fs.readFileSync('./devTwitchToken')}, true);
}

else authenticateTwitch({
    scope: configFile.T2S_SCOPE,
    redirect_uri: configFile.T2S_REDIRECT_URI,
    client_id: configFile.T2S_CLIENT_ID,
    client_secret: configFile.T2S_SECRET
}).then(loginToTwitch);

//discord.js init
/////////////////
const discordClient = new Client({intents: ['GUILDS', 'GUILD_MESSAGES']});
var targetDiscordChannel;

discordClient.on('messageCreate', m=>{
    //Ping it back to twitch as long as it isn't a bot
    if(!m.author.bot && m.channel.id == targetDiscordChannel.id){
        //tmi.js automatically splits up these messages down if they are over 500 characters, so there's no need to worry if discord's message is too big.
        const discordHeader = `[d][${m.author.tag}] `,
            foundIds = {};

        let finalMessage = m.content;

            //Grab the contents of the message, convert discord mentions into usernames for twitch to see
            for(const mention of m.content.matchAll(/\<@[0-9]{1,}\>/g)){
                const discordId = /[0-9]{1,}/.exec([mention[0]])[0];
                if(!foundIds[discordId]){
                    foundIds[discordId] = true;
                    finalMessage = finalMessage.replaceAll(mention[0], '@[m]'+m.mentions.members.get(discordId).user.tag);
                }
            }

        //Also need to filter out custom emoji from discord; would be better to display the custom emoji name
        for(const customEmoji of m.content.matchAll(/\<\:[A-Za-z]{1,}:[0-9]{1,}\>/g)){
            let emojiNameAndId = /[A-Za-z]{1,}:[0-9]{1,}/.exec(customEmoji[0])[0].split(':');

            if(!foundIds[emojiNameAndId[1]]){
                //Replace the ID of the custom emoji with just it's name
                foundIds[emojiNameAndId[1]] = true;
                finalMessage = finalMessage.replaceAll(customEmoji[0], '[e]'+emojiNameAndId[0]);
            }
        }


        //Include attachments inside the message if they are present on discord
        if(m.attachments?.size) finalMessage += ' ' + [...m.attachments].map(e=>e[1].url).join(' ');

        const messageToSend = `${discordHeader}${finalMessage}`;


        //Create a key-value pair that will be logged as a partially complete fused object. When we find the other piece on the twitch side, it will also be mapped in our collection.
        const listNode = messageLinkdListInterface.addNode(new conjoinedMsg(m));
        twitchMessageSearchCache[messageToSend] = listNode;
        discordTwitchCacheMap.set(m, listNode);

        //I'm only grabbing the first index here... this will need to change if we scale up.
        twitchClient.say(configFile.T2S_CHANNELS[0], messageToSend).then(undefined, genericPromiseError);

        //Count upwards and delete the oldest message if need be
        manageMsgCache();
    }
});

const discordOnMesgDel = m=>{
    const messageFromCache = discordTwitchCacheMap.get(m);
    if(!messageFromCache) return;

    //Assuming we found a message we deleted on discord, delete it on twitch too
    for(const i of messageFromCache.data.twitchArray){
        //Cue for deletion instead of deleting the twitch side now
        if(i.userState == lastUserStateMsg.userState && i.self && !i.userState.botUserStateId){
            i.userState.cueForDelete = true;
            console.log("The quick brown fox");
        }
        
        else twitchDelete(i);
    }

    //Delete this conjoined message from all cache
    manageMsgCache(messageFromCache);
}

discordClient.on('messageDelete', discordOnMesgDel);

discordClient.on('messageDeleteBulk', messages=>{
    for(let mesgKeyValue of messages)
        discordOnMesgDel(mesgKeyValue[1]);
});

discordClient.login(configFile.T2S_DISCORD_TOKEN).then(
    async ()=>{
        console.log('Discord bot is live!', discordClient.user.tag);
        targetDiscordChannel = (await discordClient.channels.fetch(configFile.T2S_DISCORD_CHANNEL));
    }
);
//When both are logged in, bot commands and behavior also need to be setup, but they can't without each-other being there.