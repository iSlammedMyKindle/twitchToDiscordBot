import { TextChannel } from 'discord.js';
import { linkedListNode, nodeInterface } from '../linkedList';
import { conjoinedMsg, twitchMsg } from '../messageObjects';
import { ChatClient } from '@twurple/chat';
import configFile from '../../config.json';

/**
 * If an error happens either on twitch or discord, print the thing
 * @param {*} error 
 */
export const genericPromiseError = (error: any) => console.error('Snap, I hit a snag... >.<', error);

const Twitch = {
    /* We need to have a non-authenciated Twitch client so that
    we can listen for messages which our authed cliient has sent
    IE: call #say w/ auth client the authed client will not get
    that message w/ the onMessage(...) event.
    but our non-authed client will get the event */
    authChatClient: null as ChatClient | null,
    anonChatClient: null as ChatClient | null
};

const Bridge = {
    twitch: Twitch,
    MAX_MSG_CACHE: 100 as number,
    currMsgCount: 0 as number,
    targetDiscordChannel: undefined as TextChannel | undefined,
    discordTwitchCacheMap: new Map() as Map<any, any>,
    twitchMessageSearchCache: {} as { [key: string]: linkedListNode<conjoinedMsg>; },
    messageLinkedListInterface: new nodeInterface() as nodeInterface<conjoinedMsg>,
};

function manageMsgCache(specificNode?: linkedListNode<conjoinedMsg>): null | linkedListNode<conjoinedMsg>
{
    if(!specificNode && Bridge.currMsgCount < Bridge.MAX_MSG_CACHE)
    {
        Bridge.currMsgCount++;
        return null;
    }

    // Delete messages once we hit our cache limit, or if we defined a node to delete, destroy that instead
    if(!specificNode)
        specificNode = Bridge.messageLinkedListInterface.beginningNode; // Garbage collection takes care of this, so need to run delete

    Bridge.messageLinkedListInterface.rebindForDelete(specificNode);

    if(specificNode!.data?.twitchArray.length)
        for(const item of specificNode!.data.twitchArray)
            Bridge.discordTwitchCacheMap.delete(item);

    if(specificNode!.data?.message)
        Bridge.discordTwitchCacheMap.delete(specificNode!.data!.message);

    return specificNode!;
}

/**
* @description Deletes a twitch message
* @param {twitchMsg} twitchObj A twitchMsg object.
*/
function twitchDelete(twitchObj: twitchMsg): void
{
    Bridge.twitch.authChatClient!.deleteMessage(twitchObj.channel, twitchObj.userState.id).then(undefined, genericPromiseError);
}

export default Bridge;
export
{
    configFile,
    twitchDelete,
    manageMsgCache
};