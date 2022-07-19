# Goals for this bot

* ~~make a system that goes over the 500 character twitch message limit. [...]~~ ...tmi.js already can do that -_-
* exception handling
* slash command settings
* manage [delete, edit] messages, both from twitch and discord
    * challenge: if a message is > 500, how would editing large messages be handled...
* replies from discord are relfected on twitch
    * may not be technically possible in the way one would normally expect.
* indicate custom emoji
* refresh the token...
* ~~create a system for devs that stores the refresh token in a temporary spot.~~
* create a channel template that reflects the limitations of twitch
    * setup a guideline for cross-custom emoji between discord and twitch
* use jsDoc to document the functions
* see what happens if someone types a [twitch] command from discord into twitch
    * Because the bot alredy creates a minimal header for discord and twitch messages, it's not completely necessary. However, if the message overflows past 500 characters, there may be a way to exploit this, so we need filters for that somehow