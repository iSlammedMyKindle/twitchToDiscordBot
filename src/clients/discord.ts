import { PrivateMessage } from '@twurple/chat';
import { AnyChannel, Client, Collection, Message, PartialMessage, TextChannel } from 'discord.js';
import { linkedListNode } from '../linkedList';
import { conjoinedMsg } from '../messageObjects';
import bridge, { configFile, manageMsgCache, twitchDelete } from './bridge';
import rng from 'random-seed';

const discordClient = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });

function chunkMessage(message: string = '', msgLimit: number = 490)
{
    const res: string[] = [''];
    let resIndex: number = 0;
    let progresStr: string = `[${1}/${Math.ceil(message.length / msgLimit)}]`;

    for(let i: number = 0; i < message.length; i++)
    {
        if(res[resIndex].length === msgLimit)
        {
            resIndex++;
            res[resIndex] = '';
            progresStr = `[${resIndex+1}/${Math.ceil(message.length / msgLimit)}]`;
        }

        // If our current chunk comes after the first, and the current string is blank, add the continue symbol
        if(message.length > msgLimit && !res[resIndex]) res[resIndex] += progresStr;

        res[resIndex] += message[i];
    }

    return res;
}

/**
 * Uses `random-seed` to create a consistent hash. This cna be used for discord ids to obscure who's talking for privacy reasons.
 * @param input Number that we're wanting to obscure
 */
const obscureString = (input: string): number => rng.create(input + (process.env?.T2D_CLIENT_ID || configFile?.T2D_CLIENT_ID)).random();

discordClient.on('messageCreate', async (m: Message<boolean>) =>
{
    if((m.author.bot || m.guild === null) ||
        !bridge.targetDiscordChannel ||
        m.channel.id !== bridge.targetDiscordChannel.id) return;

    // tmi.js automatically splits up these messages down if they are over 500 characters, so there's no need to worry if discord's message is too big.
    const obscureTag = process.env?.T2D_OBSCURE_TAG || configFile?.T2D_OBSCURE_TAG;
    const discordHeader: string = `[d][${ obscureTag ? m.author.username + '~' + ((obscureString(m.author.discriminator) * 1000)).toFixed() : m.author.tag }] `,
        foundIds: { [key: string]: boolean; } = {};

    let finalMessage: string = m.content;

    // Grab the contents of the message, convert discord mentions into usernames for twitch to see
    for(const mention of m.content.matchAll(/<@[0-9]{1,}>/g))
    {
        if(mention === null)
            continue;

        const discordId: string = /[0-9]{1,}/.exec(mention[0])![0];

        if(!foundIds[discordId])
        {
            foundIds[discordId] = true;
            let usrStr: string;
            const targetUser = m.mentions.members!.get(discordId)!.user;
            if(obscureTag)
                usrStr = targetUser.username + '~' + ((obscureString(m.author.discriminator) * 1000)).toFixed();
            else usrStr = targetUser.tag;
            
            finalMessage = finalMessage.replaceAll(mention[0], '@[m]' + usrStr);
        }
    }

    // Also need to filter out custom emoji from discord; would be better to display the custom emoji name
    for(const customEmoji of m.content.matchAll(/<:[A-Za-z]{1,}:[0-9]{1,}>/g))
    {
        const emojiNameAndId: string[] = /[A-Za-z]{1,}:[0-9]{1,}/.exec(customEmoji[0])![0].split(':');

        if(!foundIds[emojiNameAndId[1]])
        {
            // Replace the ID of the custom emoji with just it's name
            foundIds[emojiNameAndId[1]] = true;
            finalMessage = finalMessage.replaceAll(customEmoji[0], '[e]' + emojiNameAndId[0]);
        }
    }


    // Include attachments inside the message if they are present on discord
    if(m.attachments?.size)
        finalMessage += ' ' + [...m.attachments].map(e => e[1].url).join(' ');

    const charLimit = (process.env.T2D_DISCORD_CHAR_LIMIT ? process.env.T2D_DISCORD_CHAR_LIMIT : configFile.T2D_DISCORD_CHAR_LIMIT) || 4000;

    if(m.content.length > charLimit)
    {
        m.reply('It looks like this message went over the ' + charLimit + ' character limit. Because of that I\'ll need to shorten the message down with "[...]", sorry about that :/');
        finalMessage = finalMessage.substring(0, charLimit as number) + '[...]';
    }

    const messageToSend: string = `${ discordHeader }${ finalMessage }`;

    // Create a key-value pair that will be logged as a partially complete fused object. When we find the other piece on the twitch side, it will also be mapped in our collection.
    const listNode: linkedListNode<conjoinedMsg> = bridge.messageLinkdListInterface.addNode(new conjoinedMsg(m));
    bridge.discordTwitchCacheMap.set(m, listNode);
    bridge.discordTwitchCacheMap.set(m.id, listNode);

    // COMPLETELY AND UTTERLY JANK METHOD of getting our own twitch messages because the version TMI version of this is inconsistent with it's message management
    // We need consistent keys in order to properly map all twitch chunks back to the original discord message
    const chunkedTwitchMessages = chunkMessage(messageToSend);
    for(const msg of chunkedTwitchMessages)
        bridge.twitchMessageSearchCache[msg] = listNode;

    let currIndex: number = 0;
    function recursiveSend(chunkedTwitchMessages: string[], reply?: { userState: PrivateMessage; }): void
    {
        // I don't know what to name this.
        function incrementAndStuff(): void
        {
            currIndex++;
            setTimeout(() => recursiveSend(chunkedTwitchMessages, reply ?? undefined), 250);
        }

        if(currIndex < chunkedTwitchMessages.length)
            reply?.userState
                ?
                bridge.twitch.authChatClient?.say(configFile.T2D_CHANNELS[0], chunkedTwitchMessages[currIndex], {
                    replyTo: reply.userState
                }).then(incrementAndStuff)
                :
                bridge.twitch.authChatClient?.say(configFile.T2D_CHANNELS[0], chunkedTwitchMessages[currIndex]).then(incrementAndStuff);
    }


    if(m.type === 'REPLY')
    {
        const fetchedMessageReply: Message<boolean> = await m.fetchReference();
        /* The Twitch message of the Discord message we replied to.
        Going based off of IDs due to the fact that the Mesasge object will be different
        if it's a reply. */
        const replyNode: linkedListNode<conjoinedMsg> | undefined = bridge.discordTwitchCacheMap.get(fetchedMessageReply.id);

        /* We are only going to reply to the first Twitch message element, due to the fact it makes
        no difference to which we reply to.
        Cause it will always respond to the "starting" reply message one. */

        recursiveSend(chunkedTwitchMessages, {
            userState: replyNode?.data!.twitchArray[0]?.userState as PrivateMessage || null
        });

        manageMsgCache();
        return;
    }

    recursiveSend(chunkedTwitchMessages);

    // Count upwards and delete the oldest message if need be
    manageMsgCache();
});

/**
* Message deletion event, if we have a Twitch OBJ bound to the Discord one already we delete the Twitch one.
* @param {Message<boolean> | PartialMessage} m
* @returns {void} Nothing.
*/
const discordOnMesgDel = (m: Message<boolean> | PartialMessage): void =>
{
    const messageFromCache = bridge.discordTwitchCacheMap.get(m);
    if(!messageFromCache) return;

    // Assuming we found a message we deleted on discord, delete it on twitch too
    for(const i of messageFromCache.data.twitchArray)
        twitchDelete(i);

    // Delete this conjoined message from all cache
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

        /* Cast is there to convert it from any text channel into a TextChannel
        we already make sure that it is a text channel, and if it isn't we throw
        and error above (: */
        bridge.targetDiscordChannel = fetchChannel as TextChannel;
    }
);
