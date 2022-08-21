/*Made by iSlammedMyKindle in 2022!
The conjoined message object, it holds the link between a discord and twitch message. We use this to potentially make edits and deletions to messages*/

module.exports = {
    conjoinedMsg: function(discord = undefined, twitchArray = []){
        this.discord = discord;
        this.twitchArray = twitchArray;
    },
    twitchMsg: function(msg = "", self, userState, channel){
        this.msg = msg;
        this.userState = userState;
        this.channel = channel;
        this.self = self;
    }
}