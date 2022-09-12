import https from 'https';
import open from 'open';
import fs from 'fs';
import http, { RequestListener } from 'http';
import { configFile } from './clients/bridge';
import { URL } from 'url';

interface request
{
    url: string;
}

interface response
{
    statusCode: number,
    write: Function,
    end: Function;
}

interface IParams
{
    client_id: string,
    scope: string,
    redirect_uri: string,
    client_secret: string,
    use_https: boolean;
}

/**
 * {
    "accessToken": "",
    "expiresIn": 14405,
    "refreshToken": "",
    "scope": [
        "channel:moderate",
        "chat:edit",
        "chat:read"
    ],
    "tokenType": "bearer"
}
 */
interface AuthResponse 
{
    accessToken: string,
    expiresIn: number,
    refreshToken: string,
    scope: string[],
    tokenType: string;
}

function underscoreToCammel(str: string): string
{
    let res: string = '';
    for(let i = 0; i < str.length; i++)
    {
        if(str[i] == '_')
        {
            res += str[i + 1].toUpperCase();
            i++;
        }
        else res += str[i];
    }

    return res;
}

function objNamingConvert(obj: any): {}
{
    const res: any = {};

    for(const i in obj)
        res[underscoreToCammel(i)] = obj[i];

    return res;
}

const listenForTwitch = (url: string, useHttps: boolean = false) => new Promise((resolve, reject) =>
{

    //Make a one-time server to catch the parameters twitch is wanting to send back. More specifically this it to obtain the token.
    const serverFunc = (req: request, res: response) =>
    {
        res.statusCode = 200;
        res.write('<h1>Hi there, the app should be authenticated now!</h1>');
        res.end();
        tempServer.close();
        resolve(new URL(req.url, url).searchParams);
    };

    const tempServer = useHttps ? https.createServer({
        key: fs.readFileSync(configFile.T2D_HTTPS.keyPath),
        cert: fs.readFileSync(configFile.T2D_HTTPS.certPath),
        passphrase: configFile.T2D_HTTPS.passphrase ?? ''
    }, serverFunc as RequestListener) : http.createServer(serverFunc as RequestListener);

    tempServer.listen(3000);
    tempServer.on('error', e => reject(e));
});

async function authenticateTwitch(params: IParams): Promise<AuthResponse>
{
    const targetUrl = encodeURI('https://id.twitch.tv/oauth2/authorize?client_id=' + params.client_id +
        '&response_type=code&scope=' + params.scope +
        '&redirect_uri=' + params.redirect_uri);

    console.log('Trying to open this link in a browser ', targetUrl);
    try
    {
        open(targetUrl);
    }
    catch(e)
    {
        console.error('It wasn\'t possible to automatically open the link. Try navigating to it by copying & pasting the link');
    }

    const oauthParams: any = await listenForTwitch(params.redirect_uri, params.use_https);
    return new Promise((resolve, reject) =>
    {
        const oauthReq = https.request('https://id.twitch.tv/oauth2/token', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        }, res =>
        {
            const resBuffer: any[] = [];

            res.on('data', chunk => resBuffer.push(chunk));
            res.on('end', () =>
            {
                try
                {
                    resolve(objNamingConvert(JSON.parse(Buffer.concat(resBuffer).toString())) as AuthResponse);
                }
                catch(e)
                {
                    //We can't log into twitch without a token...
                    reject('I couldn\'t parse the JSON! Stopping because we need a token, but don\'t have one.' + e);
                }
            });
        });

        oauthReq.write(JSON.stringify({
            client_id: params.client_id,
            client_secret: params.client_secret,
            code: oauthParams.get('code'),
            grant_type: 'authorization_code',
            redirect_uri: params.redirect_uri
        }));

        oauthReq.end();
    });
}

export
{
    authenticateTwitch
};

export type {
    AuthResponse
};