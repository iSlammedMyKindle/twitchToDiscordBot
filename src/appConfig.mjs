// twitchToDiscord doesn't need to always use a config.json in order to work. It can also use environment variables so you don't need to save it on a deployed instance
// EDIT: this is becoming overengineered but awesome nonetheless

// If HTTPS is enabled, all HTTPS related values are required.
const httpsConditional = {
    get required()
    {
        return appConfig.webServer.USE_HTTPS;
    }
};

/**
 * Usage:
 * The top-level key-value is what's used to parse env's for each category
 * The level under that is the category of the setting (for organizational purposes)
 * 
 * Within the category level, the value can either be a boolean (to indicate if this variable is required or not)
 * Or it can be an object. This object can hold a `required` bool, as well as a "getter" function, that can reorganize the final value before it's placed in the app
 */
const configPrefixes = {
    'T2D_':{
        appSettings:{
            'OBSCURE_TAG': false,   
            'SAVE_TOKEN': false,
        },
        discord:{
            'DISCORD_CHANNEL': true,
            'DISCORD_CHAR_LIMIT': { required: false, getter:val=>val*1 }, // Must always be a number
            'DISCORD_TOKEN': true,
        },
        twitch:{
            'ACCOUNT_USERNAME': true,
            'CHANNELS': { required: true, getter:val=>Array.isArray(val) ? val : JSON.parse(val) },
            'CLIENT_ID': true,
            'CLIENT_SECRET': true,
            'REDIRECT_URI': true,
            'SCOPE': true,
        },
        listenerCore:{
            'LC_URL': false,
            'LC_SCOPE':{required: false, getter: val=>(Array.isArray(val) ? val : JSON.parse(val || null))}
        }
    },
    'T2D_HTTPS_':{
        webServer:{
            'USE_HTTPS': false, // Keep on top for the conditionals on the bottom
            'AUTH_PAGE_PATH': httpsConditional,
            'CERTPATH': httpsConditional,
            'KEYPATH': httpsConditional,
            'PASSPHRASE': httpsConditional,
        }
    }
};

let appConfig = {
    appSettings: {},
    discord: {},
    twitch: {},
    webServer: {},
    listenerCore: {}
};

// Run through the config depending on where we get it. If something is required and doesn't exist, throw an error to prevent further execution

// If we hit anything that we don't have, place it here and throw an error later
const requiredVars = [],
    useEnvironmentVariables = process.env.T2D;

let configJson;

if(!useEnvironmentVariables) 
{
    console.log('Could\'nt find the environment variable T2D, opening config.json instead...');
    configJson = (await import('../config.json', { assert:{ type:'json' } })).default;

    // Check if all categories are in the config. If not, throw an error
    const requiredCategories = [];
    for(const key in appConfig)
        if(!configJson[key]) requiredCategories.push(key);
    
    if(requiredCategories.length) throw Error('COULD NOT LOAD THE APP! These remaining categories need to be in your config.json object: \n==\n' + requiredCategories.join('\n') +'\n==');
}

// Process the environment variables
// TRIPPLE FOR-LOOP LEZGOOOOOOOOOOO
for(const envKey in configPrefixes)
{
    for(const category in configPrefixes[envKey])
    {
        for(const variable in configPrefixes[envKey][category])
        {
            let varConfig = configPrefixes[envKey][category][variable];
            let resultVal = useEnvironmentVariables ? process.env[envKey+variable] : configJson[category][variable];
            
            if(typeof varConfig === 'object')
            {
                if(varConfig.required && !resultVal)
                {
                    requiredVars.push(useEnvironmentVariables ? envKey+variable : category + '.' + variable);
                    // Don't do anything else with this variable
                    continue;
                }

                if(varConfig.getter) resultVal = varConfig.getter(resultVal);
            }
            else if(varConfig && 
                !(
                    typeof resultVal === 'string' && resultVal.length || 
                    resultVal !== false || 
                    (resultVal ?? undefined)
                )
            )
            {
                requiredVars.push(useEnvironmentVariables ? envKey+variable : category + '.' + variable);
                // Don't do anything else with this variable
                continue;
            }

            // If the value is valid (not undefined or null), we're fine to assign it
            appConfig[category][variable.toLowerCase()] = resultVal;
        }
    }
}

if(requiredVars.length) throw Error('COULD NOT LOAD THE APP! Please make sure the remaining varibles are filled in before running again: \n==\n'+requiredVars.join('\n') + '\n==');

export default appConfig;