const
    http = require('http'),
    https = require('https'),
    { URL } = require('url'),
    open = require('open');


const listenForTwitch = url=> new Promise((resolve, reject)=>{

    //Make a one-time server to catch the parameters twitch is wanting to send back. More specifically this it to obtain the token.
    const tempServer = http.createServer((req, res)=>{
        res.statusCode = 200;
        res.write('<h1>Hi there, the app should be authenticated now!</h1>');
        res.end();
        tempServer.close();
        resolve(new URL(req.url, url).searchParams);
    });

    tempServer.listen(3000);
    tempServer.on('error', e=>reject(e));
});

async function authenticateTwitch(params){
    const targetUrl = "https://id.twitch.tv/oauth2/authorize?client_id="+params.client_id+
    "&response_type=code&scope="+params.scope+
    "&redirect_uri="+params.redirect_uri;

    console.log('Trying to open this link in a browser ', targetUrl);
    try{
        open(targetUrl);
    }
    catch(e){
        console.error("It wasn't possible to automatically open the link. Try navigating to it by copying & pasting the link");
    }

    const oauthParams = await listenForTwitch(params.redirect_uri);
    return new Promise((resolve, reject)=>{
        const oauthReq = https.request("https://id.twitch.tv/oauth2/token", {
            headers: {'Content-Type': 'application/json'},
            method:'POST',
        }, res=>{
            const resBuffer = [];
        
            res.on('data',chunk=>resBuffer.push(chunk));
            res.on('end', ()=>{
                try{
                    resolve(JSON.parse(Buffer.concat(resBuffer).toString()));
                }
                catch(e){
                    //We can't log into twitch without a token...
                    reject("I couldn't parse the JSON! Stopping because we need a token, but don't have one.", e);
                }
            });
        });

        oauthReq.write(JSON.stringify({
            client_id: params.client_id,
            client_secret: params.client_secret,
            code:oauthParams.get("code"),
            grant_type: 'authorization_code',
            redirect_uri: params.redirect_uri
        }));

        oauthReq.end();
    });
}

module.exports = { authenticateTwitch };