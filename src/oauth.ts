import { readFile, readFileSync } from 'fs';
import http, { IncomingMessage, RequestListener, ServerResponse } from 'http';
import { URL } from 'url';
import { join } from 'path';
import https from 'https';
import open from 'open';

interface IParams
{
    client_id?: string,
    scope?: string,
    redirect_uri?: string,
    client_secret?: string,
    https?: IHttps;
}

interface IHttps
{
    use_https?: boolean,
    key_path?: string,
    cert_path?: string,
    passphrase?: string,
    auth_page_path?: string;
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
        if(str[i] === '_')
        {
            res += str[i + 1].toUpperCase();
            i++;
        }
        else res += str[i];
    }

    return res;
}

function objNamingConvert(obj: Record<string, unknown>): Record<string, unknown>
{
    const res: Record<string, unknown> = {};

    for(const i in obj)
        res[underscoreToCammel(i)] = obj[i];

    return res;
}

function startWebServer(url: string | undefined, httpsParams: IHttps | null): Promise<URLSearchParams>
{
    return new Promise(async (resolve, reject) =>
    {
        const page = await fetchPage(httpsParams);

        // Make a one-time server to catch the parameters twitch is wanting to send back. More specifically this it to obtain the token.
        const serverFunc: RequestListener = (req: IncomingMessage, res: ServerResponse) =>
        {
            res.writeHead(200, { 'Content-Type': 'html' });
            res.write(page);
            res.end();
            tempServer.close();
            resolve(new URL(req.url!, url).searchParams);
        };

        const tempServer = httpsParams?.use_https ? https.createServer({
            key: readFileSync(httpsParams?.key_path || ''),
            cert: readFileSync(httpsParams?.cert_path || ''),
            passphrase: httpsParams?.passphrase ?? ''
        }, serverFunc as RequestListener) : http.createServer(serverFunc as RequestListener);

        tempServer.listen(3000);
        tempServer.on('error', e => reject(e));
    });
}

async function authenticateTwitch(params: IParams): Promise<AuthResponse>
{
    const targetUrl: string = encodeURI('https://id.twitch.tv/oauth2/authorize?client_id=' + params.client_id +
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

    const oauthParams: URLSearchParams = await startWebServer(params.redirect_uri, params.https || null);
    return new Promise<AuthResponse>((resolve, reject) =>
    {
        const oauthReq = https.request('https://id.twitch.tv/oauth2/token', {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        }, (res: IncomingMessage) =>
        {
            const resBuffer: Buffer[] = [];

            res.on('data', (chunk: Buffer) => resBuffer.push(chunk));
            res.on('end', () =>
            {
                try
                {
                    resolve(
                        objNamingConvert(
                            JSON.parse(Buffer.concat(resBuffer).toString())
                        ) as unknown as AuthResponse);
                }
                catch(e: unknown)
                {
                    // We can't log into twitch without a token...
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

/**
 * @description Fetch a page, from either a path VIA HTTPS parameters, or a default page VIA passing null.
 * @param {IHTTPS | null} params The HTTPS parameters to check if there is an auth_page_path set. 
 * @returns {Buffer | string} A buffer if a valid path is set, string for our default's backup.
 */
async function fetchPage(params: IHttps | null): Promise<Buffer | string>
{
    return new Promise<Buffer | string>((res) =>
    {
        if(params && params.auth_page_path)
        {
            readFile(params.auth_page_path, (err, data) =>
            {
                // If there is an error, run this function again but without any value, so we can
                // scuffly get our default page (:
                if(err)
                    res(fetchPage(null));

                res(data);
            });
        }

        // if there isnt an auth_page_path;
        const path: string = join(__dirname, '..', 'public', 'auth.html');

        readFile(path, (err, data) =>
        {
            if(err)
            {
                console.log('Failed to get default page at path: ' + path + '. Using backup of our default!');
                res('<h1>Successfully authed</h1>');
            }

            res(data);
        });
    });
}

export default authenticateTwitch;
export { startWebServer };
export type {
    AuthResponse, IParams, IHttps
};