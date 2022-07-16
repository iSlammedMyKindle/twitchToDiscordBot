//Made by iSlammedMyKindle in 2022!
//A bot that fuses the twitch chat and the desired discord channel together.

//The bot isn't designed to scale for now. Using this to setup my personal server & twitch chat.
const configFile = require('./config.json'),
    tmijs = require('tmi.js'),
    { authenticateTwitch } = require('./oauth'),
    { Client } = require('discord.js');

var twitchClient; //Defined after retrieving the authentication token.

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
        if(msg == '!hi') twitchClient.say(channel, 'Hello world!!');

        //Send a message to twitch
        //Something fascinating is, if a message is sent by the bot, self will be true. If I use the same username though when I chat, it's false.
        if(!self) targetDiscordChannel.send(`[t][${userState["display-name"]}] ${msg}`);
    });  
})

//discord.js init
/////////////////
const discordClient = new Client({intents: ['GUILDS', 'GUILD_MESSAGES']});
var targetDiscordChannel;

discordClient.on('messageCreate', m=>{
    //Ping it back to twitch as long as it isn't a bot
    if(!m.author.bot && m.channel.id == targetDiscordChannel.id){
        twitchClient.say(configFile.T2S_CHANNELS[0], `[d][${m.author.tag}] ${m.content}`);
    }
});

discordClient.login(configFile.T2S_DISCORD_TOKEN).then(
    async ()=>{
        console.log('Discord bot is live!', discordClient.user.tag);
        targetDiscordChannel = (await discordClient.channels.fetch(configFile.T2S_DISCORD_CHANNEL));
    }
);
//When both are logged in, bot commands and behavior also need to be setup, but they can't without each-other being there.