//Made by iSlammedMyKindle in 2022!
//A bot that fuses the twitch chat and the desired discord channel together.

//The bot isn't designed to scale for now. Using this to setup my personal server & twitch chat.
const configFile = require('./config.json'),
    tmijs = require('tmi.js'),
    { authenticateTwitch } = require('./oauth'),
    { Client } = require('discord.js');

var twitchClient; //Defined after retrieving the authentication token.

//If an error happens either on twitch or discord, print the thing
const genericPromiseError =  error=>console.error('Snap, I hit a snag... >.<', error);

//Twitch init
/////////////

//By-golly this initialization code is much larger than discord.js o_O

//Login to twitch
//There are a lot of things that were named differently because this command has the potential of using environemnt variables, so this will be painful to look at and I'm sorry XP
authenticateTwitch({
    scope: configFile.T2S_SCOPE,
    redirect_uri: configFile.T2S_REDIRECT_URI,
    client_id: configFile.T2S_CLIENT_ID,
    client_secret: configFile.T2S_SECRET
}).then(resJson=>{
    twitchClient = tmijs.Client({
        options: {debug:true},
        identity:{
            username:configFile.T2S_USER,
            password:'oauth:'+resJson.access_token
        },
        channels: configFile.T2S_CHANNELS
    });
    
    twitchClient.connect().then(()=>console.log("Twitch bot is live!", configFile.T2S_USER));
    twitchClient.on('message', (channel, userState, msg, self)=>{
        //Send a message to twitch
        //Something fascinating is, if a message is sent by the bot, self will be true. If I use the same username though when I chat, it's false.
        if(!self) targetDiscordChannel.send(`[t][${userState["display-name"]}] ${msg}`).then(undefined, genericPromiseError);
    })  
})

//discord.js init
/////////////////
const discordClient = new Client({intents: ['GUILDS', 'GUILD_MESSAGES']});
var targetDiscordChannel;

function chunkMessage(message = "", contSymbol = "[...]"){
    const res = [""];
    var resIndex = 0;

    for(let i = 0; i < message.length; i++){

        if(res[resIndex].length == 500){
            resIndex++;
            res[resIndex] = "";
        }

        //If our current chunk comes after the first, and the current string is blank, add the continue symbol
        if(resIndex && !res[resIndex]) res[resIndex] += contSymbol;

        res[resIndex] += message[i];
    }

    return res;
}

discordClient.on('messageCreate', m=>{
    //Ping it back to twitch as long as it isn't a bot
    if(!m.author.bot && m.channel.id == targetDiscordChannel.id){
        //Break the message down if it is over 500 characters to send things over from discord
        const discordHeader = `[d][${m.author.tag}] `;
        if(m.content.length > (500 - discordHeader.length)) {
            const messagesToSend = chunkMessage(discordHeader + m.content);
            let currIndex = 0;
            const recursiveSend = ()=>{
                if(currIndex < messagesToSend.length)
                twitchClient.say(configFile.T2S_CHANNELS[0], messagesToSend[currIndex]).then(()=>{
                    currIndex++;
                    // setTimeout(recursiveSend, 500);
                    recursiveSend();
                });
            }

            recursiveSend();
        }

        else twitchClient.say(configFile.T2S_CHANNELS[0], `${discordHeader}${m.content}`).then(undefined, genericPromiseError);
    }
});

discordClient.login(configFile.T2S_DISCORD_TOKEN).then(
    async ()=>{
        console.log('Discord bot is live!', discordClient.user.tag);
        targetDiscordChannel = (await discordClient.channels.fetch(configFile.T2S_DISCORD_CHANNEL));
    }
);
//When both are logged in, bot commands and behavior also need to be setup, but they can't without each-other being there.