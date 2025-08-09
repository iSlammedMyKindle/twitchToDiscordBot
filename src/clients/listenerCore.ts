/* Made by iSlammedMyKindle in 2023!

Pretty much a lazy-bones method of getting more info about a twitch channel. This feature is optional.
The design issue is that for eventSub to work, there must be a token for the broadcaster ID.

In my opinion it would be messy to have multiple tokens authenticated for one app, so instead of refreshing multiple tokens, I'm
going to use twitchListenerCore as a workaround. (https://github.com/iSlammedMyKindle/twitchListenerCore)
The core already has the broadcaster ID and it's designed for situations like this, so it only makes sense to pick stuff up from there.
If the config in T2D doesn't have a url, we won't try to connect.

This will take in a variety of information, such as redeems, bits, follows and subs*/

import WebSocket from 'ws';
import appConfig from '../appConfig.js';
import bridge from './bridge.js';

// Mock
// const bridge = {
//     targetDiscordChannel:{
//         send:msg=>console.log(msg)
//     }
// };

const listeners = {
    'redeem':({ userDisplayName, rewardCost, rewardTitle })=> bridge.targetDiscordChannel.send('## *__' + userDisplayName + '__ redeemed: __' + rewardTitle + '__ for __' + rewardCost + ' points!__* 🎉'),
    'cheer':({userDisplayName, bits, message})=> bridge.targetDiscordChannel.send('## *__' + userDisplayName + '__ just sent __' + bits + ' bits!__* 💎' + ( message ? '\n> ' + message : '')),
    'follow': ({userDisplayName})=> bridge.targetDiscordChannel.send('## *__'+ userDisplayName + '__ just followed the channel!* ❤️'),
    'sub': ({userDisplayName, isGift, tier})=>
    {
        bridge.targetDiscordChannel.send('## *__' + userDisplayName + '__ ' + (isGift ? 'was just gifted a sub' : 'subscribed') + ' to the channel!* ⭐');
        
        // I have no idea what the tier variable is going to return due to the lack of a proper twurple mock. I think it's a string, but just to make sure, I'm going to print it here instead when it actually happens
        console.warn(userDisplayName, 'sub tier', tier);
    }
};

// Only start a connection if we have the url in the config
if(appConfig.listenerCore.lc_url)
{
    const ws = new WebSocket('wss://' + appConfig.listenerCore.lc_url + ':9001');
    ws.on('open', ()=>
    {
        console.log('Connected to listenerCore!');
        ws.send(JSON.stringify(appConfig.listenerCore.lc_scope));
        
        ws.on('message', buff=>
        {
            const resJson = JSON.parse(buff.toString());
    
            if(resJson.accepted) console.log('listenerCore accepted:', resJson.accepted);
            if(resJson.rejected) console.log('listenerCore rejected:', resJson.rejected);
    
            if(listeners[resJson.event]) listeners[resJson.event](resJson);
        });
    });

}