import { AnyChannel, Client, Collection, Message, PartialMessage, TextChannel } from 'discord.js';
import { linkedListNode, nodeInterface } from '../linkedList';
import { conjoinedMsg } from '../messageObjects';
import { genericPromiseError } from './bridge';
import tmijs from 'tmi.js';
import configFile from '../../config.json';
import bridge from './bridge';

const discordClient = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
const twitchClient: tmijs.Client = bridge.twitchClient as tmijs.Client;
let targetDiscordChannel: TextChannel | undefined;

const messageLinkdListInterface: nodeInterface = bridge.messageLinkdListInterface;
const twitchMessageSearchCache = bridge.twitchMessageSearchCache;
const discordTwitchCacheMap = bridge.discordTwitchCacheMap;
const lastUserStateMsg = bridge.lastUserStateMsg;

function registerDiscord(): void 
{

    discordClient.on('messageCreate', (m: Message<boolean>) =>
    {
        if(m.author.bot || m.guild === null)
            return;

        if(!targetDiscordChannel)
            return;

        if(m.channel.id !== targetDiscordChannel.id)
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
        const listNode: linkedListNode = messageLinkdListInterface.addNode(new conjoinedMsg(m));
        twitchMessageSearchCache[messageToSend] = listNode;
        discordTwitchCacheMap.set(m, listNode);

        //I'm only grabbing the first index here... this will need to change if we scale up.
        twitchClient.say(configFile.T2S_CHANNELS[0], messageToSend).then(undefined, genericPromiseError);

        //Count upwards and delete the oldest message if need be
        bridge.manageMsgCache();
    });

    const discordOnMesgDel = (m: Message<boolean> | PartialMessage): void =>
    {
        const messageFromCache = discordTwitchCacheMap.get(m);
        if(!messageFromCache) return;

        //Assuming we found a message we deleted on discord, delete it on twitch too
        for(const i of messageFromCache.data.twitchArray)
        {
            //Cue for deletion instead of deleting the twitch side now
            if(i.userState == lastUserStateMsg.userState && i.self && !i.userState.botUserStateId)
            {
                i.userState.cueForDelete = true;
                console.log('The quick brown fox');
            }

            else bridge.twitchDelete(i);
        }

        //Delete this conjoined message from all cache
        bridge.manageMsgCache(messageFromCache);
    };

    discordClient.on('messageDelete', discordOnMesgDel);

    discordClient.on('messageDeleteBulk', (messages: Collection<string, Message<boolean> | PartialMessage>) =>
    {
        for(const mesgKeyValue of messages)
            discordOnMesgDel(mesgKeyValue[1]);
    });

    discordClient.login(configFile.T2S_DISCORD_TOKEN).then(
        async () =>
        {
            console.log('Discord bot is live!', discordClient.user!.tag);

            const fetchChannel: AnyChannel | null = await discordClient.channels.fetch(configFile.T2S_DISCORD_CHANNEL);
            if(!fetchChannel || !fetchChannel.isText())
                throw new Error('Text channel fetched with ID (' + configFile.T2S_DISCORD_CHANNEL + ') is not a text channel.');

            targetDiscordChannel = fetchChannel as TextChannel;
            bridge.targetDiscordChannel = fetchChannel as TextChannel;
        }
    );
    //When both are logged in, bot commands and behavior also need to be setup, but they can't without each-other being there.
}

export default registerDiscord;