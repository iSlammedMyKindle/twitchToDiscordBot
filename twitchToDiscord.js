//Made by iSlammedMyKindle in 2022!
//A bot that fuses the twitch chat and the desired discord channel together.

//The bot isn't designed to scale for now. Using this to setup my personal server & twitch chat.
const configFile = require('./config.json'),
    tmijs = require('tmi.js'),
    { authenticateTwitch } = require('./oauth'),
    { Client } = require('discord.js'),
    fs = require('fs'),
    { nodeInterface } = require('./linkedList');

var twitchClient; //Defined after retrieving the authentication token.

/**
 * If an error happens either on twitch or discord, print the thing
 * @param {*} error 
 */
const genericPromiseError =  error=>console.error('Snap, I hit a snag... >.<', error);

//This object stores discord and twitch messages using thier IDs. A singular object containing the respective discord & twitch message will be present here, but two IDs can query this one object.
const messageCollection = {};

//This is a linked list that will contain the last 100 messages.
const messageLinkdListInterface = new nodeInterface();

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
    
    twitchClient.connect().then(()=>console.log("Twitch bot is live!", configFile.T2S_USER));
    twitchClient.on('message', (channel, userState, msg, self)=>{
        //Send a message to twitch
        //Something fascinating is, if a message is sent by the bot, self will be true. If I use the same username though when I chat, it's false.
        if(!self) targetDiscordChannel.send(`[t][${userState["display-name"]}] ${msg}`).then(undefined, genericPromiseError);
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

        twitchClient.say(configFile.T2S_CHANNELS[0], `${discordHeader}${finalMessage}`).then(undefined, genericPromiseError);
    }
});

discordClient.login(configFile.T2S_DISCORD_TOKEN).then(
    async ()=>{
        console.log('Discord bot is live!', discordClient.user.tag);
        targetDiscordChannel = (await discordClient.channels.fetch(configFile.T2S_DISCORD_CHANNEL));
    }
);
//When both are logged in, bot commands and behavior also need to be setup, but they can't without each-other being there.