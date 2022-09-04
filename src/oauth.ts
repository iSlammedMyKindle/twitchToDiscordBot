import http from 'http';
import https from 'https';
import open from 'open';
import { URL } from 'url';

interface IParams
{
    client_id: string,
    scope: string,
    redirect_uri: string;
    client_secret: string;
}

// eslint-disable-next-line no-unused-vars
const listenForTwitch: (url: string) => Promise<unknown> = (url: string) => new Promise((resolve: (value: unknown) => void, reject: (value: unknown) => void) =>
{

    //Make a one-time server to catch the parameters twitch is wanting to send back. More specifically this it to obtain the token.
    const tempServer: http.Server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) =>
    {
        res.statusCode = 200;
        res.write('<h1>Hi there, the app should be authenticated now!</h1>');
        res.end();
        tempServer.close();
        resolve(new URL(req.url as string, url).searchParams);
    });

    tempServer.listen(3000);
    tempServer.on('error', (e: Error) => reject(e));
});

async function authenticateTwitch(params: IParams): Promise<unknown>
{
    const targetUrl: string = 'https://id.twitch.tv/oauth2/authorize?client_id=' + params.client_id +
        '&response_type=code&scope=' + params.scope +
        '&redirect_uri=' + params.redirect_uri;

    console.log('Trying to open this link in a browser ', targetUrl);
    try
    {
        open(targetUrl);
    }
    catch(e)
    {
        console.error('It wasn\'t possible to automatically open the link. Try navigating to it by copying & pasting the link');
    }

    const oauthParams: any = await listenForTwitch(params.redirect_uri);
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve: (value: unknown) => void, reject: (value: unknown) => void) =>
    {
        const oauthReq: http.ClientRequest = https.request('https://id.twitch.tv/oauth2/token', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        }, (res: http.IncomingMessage) =>
        {
            const resBuffer: any[] = [];

            res.on('data', (chunk: any) => resBuffer.push(chunk));
            res.on('end', () =>
            {
                try
                {
                    resolve(JSON.parse(Buffer.concat(resBuffer).toString()));
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