# Twitch To Discord

Welecome! This is one of the scraps that are helping to run my Discord server. The goal of this bot is to combine the abilities of Discord and Twitch, and allow both chats to communicate between eachother.

This file is designed to provided an overview of how to get the bot setup yourself on a custom environment.

## Setup - Twitch side

1. To start on the Twitch side, first navigate to [the Twitch console](https://dev.twitch.tv/console)
1. Click on the "Applications" tab at the top.
1. From here, you would click "Register Your application". It needs a name that hasn't been used on a bot before, set the `T2D_USER` in config.json to your chosen application name.
1. After the bot is created, go ahead and click "manage" on the new application, you will see options for `Client ID` and `Client Secret`. Create the the secret, and store it for later. Client ID will always be the same, but save this as well. These items in particular should be stored in config.json as `T2D_CLIENT_ID` and `T2D_SECRET`

These new credentials will be there to help you authenticate this bot to use your user. This will be done in your web browser. When finished, the bot should communicate out of the user that authenticated it (e.g iSlammedMyKindle would be used to send messages, but internally, the bot can detect if it was sent via itself or other means besides your own keyboard input.)

There's also one channel you need to insert as well (`T2D_CHANNELS`) - the bot only reads the first one, so in the first array index, pop in your username or whatever user's channel name to listen to that one.

### External server

If you intend on deploying this on an external server, you will need to change the address found in `config.json` -> `T2D_REDIRECT_URI`. Change it to the ip or domain name of the server, and redirects should work accordingly. (note that in this early version, the port is hard-coded to 3000; this will be used to deploy a temporary http server. Keep this in mind as providers like google cloud require that you expose ports before using them)

Another note is that if you try to deploy on a web server outside your local machine; auto-opening the browser is not supported. You will need to manually click on the link that is generated in the terminal to fully launch it. After launching the link, the process should be back to the flow as described above.

## Setup - discord side

1. Visit the [Discord developer portal](https://discord.com/developers/applications); you'll find a button that says "new application", so click that
1. Set the name to whatever you like
1. navigate to your bot, click "Bot", then create the bot using the discord prompts
1. The main item you need here is the discord token, which will go into `config.json` -> `T2S_DISCORD_TOKEN`
1. In the oAuth2 menu, select URL Generator; check `bot`, then in the second box, check "Manage messages", "Send Message", and "Read Messages"
1. copy the link and paste it into your browser; from here you should be able to add the bot to your test server. (Save this link for later, you'll need it to add it to other places when required)

## Setting up a Discord channel

On your Discord server, the channel that will reflects Twitch chat needs to have permissions disabled on it. Twitch is directly based on an IRC standard, which means things like threads are not going to be supported.

Create the channel, and then copy it's Discord ID (enable developer settings in your personal Discord settings to make this work.) You can also find the Discord ID in the URL of your browser if Discord is being used there (it will be the last set of numbers in the link). Place the channel ID inside `config.js` -> `T2D_DISCORD_CHANNEL`.

## `T2S_DEV_SAVE_TOKEN`

You'll need this setting toggled to true if you are just developing the bot. Twitch only offers up to 50 tokens at a given time, so this will prevent you from maxing that out quickly!

## Launching the bot

Run the build script with `npm run build`, then run `npm run start` and a link should show up in the terminal (if you're on localhost/desktop, a browser window should pop up); it will make you authenticate with Twitch. Once that's finished, the bot should be up and running! If you set `T2D_DEV_SAVE_TOKEN` to true, the token that was just created will be saved to a file for when you need to relaunch the bot. If this token expires, you'll need to delete the file to start over. (for now)