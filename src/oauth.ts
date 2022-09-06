import https from 'https';
import open from 'open';
import fs from 'fs';import hydra, { IExportOBJ } from '@acelikesghosts/hydra';
import http, { RequestListener } from 'http';
import { configFile } from './clients/bridge';
import { URL } from 'url';

interface request {
    url: string
}

interface response {
    statusCode: number,
    write: Function,
    end: Function
}

interface IParams
{
    client_id: string,
    scope: string,
    redirect_uri: string,
    client_secret: string,
    use_https: boolean
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
interface IResponse 
{
    access_token: string,
    expires_in: number,
    refresh_token: string,
    scope: string[],
    token_type: string;
}

/**
 * @description Change our response from snake case to camel case.
 * @param res 
 * @returns 
 */
function fixResponse(res: IResponse): { accessToken: string, expiresIn: number, refreshToken: string, scope: string[], tokenType: string }
{
    const hydr: IExportOBJ = hydra(res) as IExportOBJ;
    hydr.set('accessToken', res.access_token);
    hydr.set('expiresIn', res.expires_in);
    hydr.set('refreshToken', res.refresh_token);
    hydr.set('scope', res.scope);
    hydr.set('tokenType', res.token_type);

    const obj: any = hydr.value();
    delete obj['access_token'];
    delete obj['expires_in'];
    delete obj['refresh_token'];
    delete obj['scope'];
    delete obj['token_type'];

    return hydr.value() as any;
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
        resolve(new URL(req.url as string, url).searchParams);
    }

    const tempServer = useHttps ? https.createServer({
        key: fs.readFileSync(configFile.T2D_HTTPS.keyPath),
        cert: fs.readFileSync(configFile.T2D_HTTPS.certPath),
        passphrase: configFile.T2D_HTTPS.passphrase ?? ''
    }, serverFunc as RequestListener) : http.createServer(serverFunc as RequestListener);

    tempServer.listen(3000);
    tempServer.on('error', e => reject(e));
});

async function authenticateTwitch(params: IParams): Promise<{ accessToken: string, expiresIn: number, refreshToken: string, scope: string[], tokenType: string }>
{
    const targetUrl = encodeURI('https://id.twitch.tv/oauth2/authorize?client_id=' + params.client_id +
        '&response_type=code&scope=' + params.scope +
        '&redirect_uri=' + params.redirect_uri);

    console.log('Trying to open this link in a browser ', targetUrl);
    try
    {
        open(targetUrl);
    }
    catch (e)
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
                    resolve(fixResponse(JSON.parse(Buffer.concat(resBuffer).toString())));
                }
                catch (e)
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