import tmijs from 'tmi.js';
import configFile from '../../config.json';
import { TextChannel } from 'discord.js';
import { linkedListNode, nodeInterface } from '../linkedList';
import { twitchMsg } from '../messageObjects';

/**
 * If an error happens either on twitch or discord, print the thing
 * @param {*} error 
 */
export const genericPromiseError = (error: any) => console.error('Snap, I hit a snag... >.<', error);

interface IBridge
{
    MAX_MSG_CACHE: number;
    currMsgCount: number;
    targetDiscordChannel: TextChannel | undefined,
    twitchClient: tmijs.Client | undefined,
    discordTwitchCacheMap: Map<any, any>
    twitchMessageSearchCache: { [key: string]: linkedListNode; };
    messageLinkdListInterface: nodeInterface;
    lastUserStateMsg: any
}

const Bridge: IBridge = {
    MAX_MSG_CACHE: 100,
    currMsgCount: 0,
    targetDiscordChannel: undefined,
    twitchClient: undefined,
    discordTwitchCacheMap: new Map(),
    twitchMessageSearchCache: {},
    messageLinkdListInterface: new nodeInterface(),
    lastUserStateMsg: null
}


function manageMsgCache(specificNode?: linkedListNode): number | linkedListNode
{
    if (!specificNode && Bridge.currMsgCount < Bridge.MAX_MSG_CACHE) return Bridge.currMsgCount++;

    //Delete messages once we hit our cache limit, or if we defined a node to delete, destroy that instead
    if (!specificNode)
        specificNode = Bridge.messageLinkdListInterface.beginningNode as linkedListNode; //Garbage collection takes care of this, so need to run delete

        Bridge.messageLinkdListInterface.rebindForDelete(specificNode);

    if (specificNode.data.twitchArray[0])
    Bridge.discordTwitchCacheMap.delete(specificNode.data.twitchArray[0]);

    if (specificNode.data.discord)
        Bridge.discordTwitchCacheMap.delete(specificNode.data.discord);

    return specificNode;
}

/**
* @description Deletes a twitch message
* @param {twitchMsg} twitchObj A twitchMsg object.
*/
function twitchDelete(twitchObj: twitchMsg): void
{
    Bridge.twitchClient!.deletemessage(twitchObj.channel, twitchObj.userState.botUserStateId || twitchObj.userState.id).then(undefined, genericPromiseError);
}

export default Bridge;
export
{
    configFile,
    twitchDelete,
    manageMsgCache
};