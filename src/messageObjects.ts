import { Message } from 'discord.js';
import tmijs from 'tmi.js';

/*Made by iSlammedMyKindle in 2022!
The conjoined message object, it holds the link between a discord and twitch message. We use this to potentially make edits and deletions to messages*/

class conjoinedMsg
{
    public message: Message<boolean> | undefined;
    public twitchArray: twitchMsg[];

    constructor(message: Message<boolean> | undefined = undefined, twitchArray: any[] = [])
    {
        this.message = message;
        this.twitchArray = twitchArray;
    }
}

class twitchMsg
{
    public msg: string = '';
    public self: boolean;
    public userState: tmijs.Userstate;
    public channel: string;

    constructor(msg: string = '', self: boolean, userState: tmijs.Userstate, channel: string)
    {
        this.msg = msg;
        this.self = self;
        this.userState = userState;
        this.channel = channel;
    }
}

export 
{ 
    conjoinedMsg, 
    twitchMsg 
};