import { TextChannel } from 'discord.js';
import { linkedListNode, nodeInterface } from '../linkedList';
import { twitchMsg } from '../messageObjects';
import tmijs from 'tmi.js';
import configFile from '../../config.json';

/**
 * If an error happens either on twitch or discord, print the thing
 * @param {*} error 
 */
export const genericPromiseError = (error: any) => console.error('Snap, I hit a snag... >.<', error);

const Bridge = {
    MAX_MSG_CACHE: 100 as number,
    currMsgCount: 0 as number,
    targetDiscordChannel: undefined as TextChannel | undefined,
    twitchClient: undefined as tmijs.Client | undefined,
    discordTwitchCacheMap: new Map() as Map<any, any>,
    twitchMessageSearchCache: {} as { [key: string]: linkedListNode; },
    messageLinkdListInterface: new nodeInterface() as nodeInterface,
    lastUserStateMsg: null as any
};


function manageMsgCache(specificNode?: linkedListNode): null | linkedListNode
{
    if(!specificNode && Bridge.currMsgCount < Bridge.MAX_MSG_CACHE)
    {
        Bridge.currMsgCount++;
        return null;
    }

    //Delete messages once we hit our cache limit, or if we defined a node to delete, destroy that instead
    if(!specificNode)
        specificNode = Bridge.messageLinkdListInterface.beginningNode as linkedListNode; //Garbage collection takes care of this, so need to run delete

    Bridge.messageLinkdListInterface.rebindForDelete(specificNode);

    if(specificNode.data.twitchArray[0])
        Bridge.discordTwitchCacheMap.delete(specificNode.data.twitchArray[0]);

    if(specificNode.data.discord)
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