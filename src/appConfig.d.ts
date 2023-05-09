export = -{} as AppConfig;

// "THING": 'afafa' -> "thing": 'afafa
// only messes with the keys, so that you can use
// an extension such as "paste json as code"
// and not have to manually change the names
// (aka what i did)
type Convert<T> = {
    [P in keyof T as Lowercase<string & P>]: T[P]
};

export interface AppConfig
{
    appSettings: Convert<AppSettings>;
    discord: Convert<Discord>;
    twitch: Convert<Twitch>;
    webServer: Convert<WebServer>;
}

export interface AppSettings
{
    OBSCURE_TAG: boolean;
    SAVE_TOKEN: boolean;
}

export interface Discord
{
    DISCORD_CHANNEL: string;
    DISCORD_TOKEN: string;
    DISCORD_CHAR_LIMIT: number;
}

export interface Twitch
{
    ACCOUNT_USERNAME: string;
    CHANNELS: string[];
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    SCOPE: string;
    REDIRECT_URI: string;
}

export interface WebServer
{
    USE_HTTPS: boolean;
    AUTH_PAGE_PATH: string;
    CERTPATH: string;
    KEYPATH: string;
    PASSPHRASE: string;
}