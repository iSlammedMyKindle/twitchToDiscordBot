# Goals for this bot - aka .**MISSIONS!**

## Discord side of things

* slash command settings
    * a setting to temporarily disable messages coming from either side.
* manage [delete, edit] messages, both from twitch and discord
    * challenge: if a message is > 500, how would editing large messages be handled...
* replies from discord are reflected on twitch
    * may not be technically possible in the way one would normally expect.
* ~~indicate custom emoji~~
    * done for now, but could see some growth in the future.
    * I think this only needs to be done on the discord side... if there's a sequence in twitch that has a channel's custom emoji, we should have something to configure that to render on discord.
* ~~filter out discord IDs, replace them with the name of the discord user~~ - done!
* ~~make a system that goes over the 500 character twitch message limit. [...]~~ ...tmi.js already can do that -_-


## Technical stuff

* refresh the token...
    * ~~create a system for devs that stores the refresh token in a temporary spot.~~
* ~~create a channel template that reflects the limitations of twitch~~ - this will need to be looked at later
    * setup a guideline for cross-custom emoji between discord and twitch
    * see if you can keep track of the user name when replies are generated.
* use jsDoc to document the functions - forever ongoing :o

## Exploits

* **exception handling** - This item will need to be handled as items are brought up.
* see what happens if someone types a [twitch] command from discord into twitch
    * Because the bot already creates a minimal header for discord and twitch messages, it's not completely necessary. However, if the message overflows past 500 characters, there may be a way to exploit this, so we need filters for that somehow