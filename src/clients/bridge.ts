import tmijs from 'tmi.js';
import { TextChannel } from 'discord.js';
import { linkedListNode, nodeInterface } from '../linkedList';
import { twitchMsg } from '../messageObjects';

/**
 * If an error happens either on twitch or discord, print the thing
 * @param {*} error 
 */
export const genericPromiseError = (error: any) => console.error('Snap, I hit a snag... >.<', error);


class Bridge
{
    public MAX_MSG_CACHE: number = 100;
    public currMsgCount: number = 0;

    public targetDiscordChannel: TextChannel | undefined;

    public twitchClient: tmijs.Client | undefined;


    public discordTwitchCacheMap = new Map();
    public twitchMessageSearchCache: { [key: string]: linkedListNode; } = {};
    public messageLinkdListInterface = new nodeInterface();
    public lastUserStateMsg: any;

    constructor()
    {

    }

    public manageMsgCache(specificNode?: linkedListNode): number | linkedListNode
    {
        if(!specificNode && this.currMsgCount < this.MAX_MSG_CACHE) return this.currMsgCount++;

        //Delete messages once we hit our cache limit, or if we defined a node to delete, destroy that instead
        if(!specificNode)
            specificNode = this.messageLinkdListInterface.beginningNode as linkedListNode; //Garbage collection takes care of this, so need to run delete

        this.messageLinkdListInterface.rebindForDelete(specificNode);

        if(specificNode.data.twitchArray[0])
            this.discordTwitchCacheMap.delete(specificNode.data.twitchArray[0]);

        if(specificNode.data.discord)
            this.discordTwitchCacheMap.delete(specificNode.data.discord);

        return specificNode;
    }

    /**
    * @description Deletes a twitch message
    * @param {twitchMsg} twitchObj A twitchMsg object.
    */
    public twitchDelete(twitchObj: twitchMsg): void
    {
        this.twitchClient!.deletemessage(twitchObj.channel, twitchObj.userState.botUserStateId || twitchObj.userState.id).then(undefined, genericPromiseError);
    }
}

export default new Bridge();