const https = require('https');
require('dotenv').config();
const config = require('./config/content');

const TOKEN = process.env.BOT_TOKEN;

const req = (method, payload) => {
    return new Promise((resolve) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TOKEN}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const request = https.request(options, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                console.log(`[${payload.language_code || 'default'}] ${method} -> ${body}`);
                resolve(body);
            });
        });
        request.on('error', console.error);
        request.write(data);
        request.end();
    });
};

async function pushAll() {
    console.log("Forcing description updates across locales...");
    const locales = ["", "uz", "en", "ru"];

    for (const locale of locales) {
        await req('setMyDescription', { 
            description: config.BOT_DESCRIPTION,
            language_code: locale
        });
        await req('setMyShortDescription', { 
            short_description: config.BOT_SHORT_DESCRIPTION,
            language_code: locale
        });
    }

    console.log("Done.");
}

pushAll();
