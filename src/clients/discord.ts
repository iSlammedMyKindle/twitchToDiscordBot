import { AnyChannel, Client, Collection, Message, PartialMessage, TextChannel } from 'discord.js';
import { linkedListNode } from '../linkedList';
import { conjoinedMsg } from '../messageObjects';
import bridge, { configFile, genericPromiseError, manageMsgCache, twitchDelete } from './bridge';

const discordClient = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });

function registerDiscord(): void 
{
    discordClient.on('messageCreate', async (m: Message<boolean>) =>
    {
        if(m.author.bot || m.guild === null)
            return;

        if(!bridge.targetDiscordChannel)
            return;

        if(m.channel.id !== bridge.targetDiscordChannel.id)
            return;

        //tmi.js automatically splits up these messages down if they are over 500 characters, so there's no need to worry if discord's message is too big.
        const discordHeader: string = `[d][${ m.author.tag }] `,
            foundIds: { [key: string]: boolean; } = {};

        let finalMessage: string = m.content;

        //Grab the contents of the message, convert discord mentions into usernames for twitch to see
        for(const mention of m.content.matchAll(/<@[0-9]{1,}>/g))
        {
            if(mention === null)
                continue;

            const discordId: string = /[0-9]{1,}/.exec(mention[0])![0];

            if(!foundIds[discordId])
            {
                foundIds[discordId] = true;
                finalMessage = finalMessage.replaceAll(mention[0], '@[m]' + m.mentions.members!.get(discordId)!.user.tag);
            }
        }

        //Also need to filter out custom emoji from discord; would be better to display the custom emoji name
        for(const customEmoji of m.content.matchAll(/<:[A-Za-z]{1,}:[0-9]{1,}>/g))
        {
            const emojiNameAndId: string[] = /[A-Za-z]{1,}:[0-9]{1,}/.exec(customEmoji[0])![0].split(':');

            if(!foundIds[emojiNameAndId[1]])
            {
                //Replace the ID of the custom emoji with just it's name
                foundIds[emojiNameAndId[1]] = true;
                finalMessage = finalMessage.replaceAll(customEmoji[0], '[e]' + emojiNameAndId[0]);
            }
        }


        //Include attachments inside the message if they are present on discord
        if(m.attachments?.size)
            finalMessage += ' ' + [...m.attachments].map(e => e[1].url).join(' ');

        const messageToSend: string = `${ discordHeader }${ finalMessage }`;

        //Create a key-value pair that will be logged as a partially complete fused object. When we find the other piece on the twitch side, it will also be mapped in our collection.
        const listNode: linkedListNode = bridge.messageLinkedListInterface.addNode(new conjoinedMsg(m));
        bridge.twitchMessageSearchCache[messageToSend] = listNode;
        bridge.discordTwitchCacheMap.set(m, listNode);
        bridge.discordTwitchCacheMap.set(m.id, listNode);

        // if the message is a reply
        if(m.type === 'REPLY')
        {
            // fetchReference will fetch the message that was replied to.
            // Somewhere here is going wrong, we want to get the
            // replied message's (the fetchReference)'s Twitch message object
            // although the ID is alwasys weirdly wrong?
            const fetchedReplyMessage: Message<boolean> = await m.fetchReference();
            const replyNode: linkedListNode | undefined = bridge.discordTwitchCacheMap.get(fetchedReplyMessage.id);
            
            console.log(replyNode);
            console.log(replyNode?.data.twitchArray[0]);

            const twitchMsgData = replyNode?.data.twitchArray[0];
            console.log(twitchMsgData?.userState['id'] == replyNode?.data.twitchArray[0].userState['id']);
            // Look at Twitch docs, this is a raw statement cause TMI is bad (:.
            // This just replies to our message using a Twitch ID.
            // THIS IS ALWAYS BEHIND CAUSE TMI IS BAD.
            // THIS WILL NOT WORKY YET-Y
            if(twitchMsgData?.userState.id && !bridge.lastUserStateMsg.userState.botUserStateId)
                bridge.twitchClient?.raw(`@reply-parent-msg-id=${ twitchMsgData!.userState.id } PRIVMSG ${ configFile.T2D_CHANNELS[0] } :${ messageToSend }`);
            else
                bridge.twitchClient?.raw(`@reply-parent-msg-id=${ twitchMsgData!.userState.botUserStateId || twitchMsgData!.userState.id } PRIVMSG ${ configFile.T2D_CHANNELS[0] } :${ messageToSend }`);

            manageMsgCache();
            return;
        }

        //I'm only grabbing the first index here... this will need to change if we scale up.
        const sentmessage = await bridge.twitchClient!.say(configFile.T2D_CHANNELS[0], messageToSend).then(undefined, genericPromiseError);
        console.log(sentmessage);
        //Count upwards and delete the oldest message if need be
        manageMsgCache();
    });

    const discordOnMesgDel = (m: Message<boolean> | PartialMessage): void =>
    {
        const messageFromCache = bridge.discordTwitchCacheMap.get(m);
        if(!messageFromCache) return;

        //Assuming we found a message we deleted on discord, delete it on twitch too
        for(const i of messageFromCache.data.twitchArray)
        {
            //Cue for deletion instead of deleting the twitch side now
            if(i.userState == bridge.lastUserStateMsg.userState && i.self && !i.userState.botUserStateId)
            {
                i.userState.cueForDelete = true;
            }

            else twitchDelete(i);
        }

        //Delete this conjoined message from all cache
        manageMsgCache(messageFromCache);
    };

    discordClient.on('messageDelete', discordOnMesgDel);

    discordClient.on('messageDeleteBulk', (messages: Collection<string, Message<boolean> | PartialMessage>) =>
    {
        for(const mesgKeyValue of messages)
            discordOnMesgDel(mesgKeyValue[1]);
    });

    discordClient.login(configFile.T2D_DISCORD_TOKEN).then(
        async () =>
        {
            console.log('Discord bot is live!', discordClient.user!.tag);

            const fetchChannel: AnyChannel | null = await discordClient.channels.fetch(configFile.T2D_DISCORD_CHANNEL);
            if(!fetchChannel || !fetchChannel.isText())
                throw new Error('Text channel fetched with ID (' + configFile.T2D_DISCORD_CHANNEL + ') is not a text channel.');

            // Cast is there to convert it from any text channel into a TextChannel
            // we already make sure that it is a text channel, and if it isn't we throw
            // and error above (:
            bridge.targetDiscordChannel = fetchChannel as TextChannel;
        }
    );
}

export default registerDiscord;