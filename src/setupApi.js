const https = require('https');
require('dotenv').config();
const TOKEN = process.env.BOT_TOKEN;

const req = (method, payload) => {
    const data = JSON.stringify(payload);
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${TOKEN}/${method}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    const request = https.request(options, res => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => console.log(method, '->', body));
    });
    request.on('error', console.error);
    request.write(data);
    request.end();
};

console.log("Pushing Telegram UI updates...");

req('setMyCommands', {
    commands: [
        { command: "start", description: "Botni ishga tushirish" },
        { command: "menu", description: "Bosh menyu" },
        { command: "help", description: "Yordam" },
        { command: "qr", description: "QR kod yaratish" },
        { command: "clear", description: "Suhbat tarixini tozalash" }
    ]
});

req('setMyDescription', {
    description: `Yuridik texnikum o‘quvchilari uchun yanada qulaylik yaratish maqsadida ishlab chiqilgan!\nQuyidagi ijtimoiy tarmoqlarda bizni kuzatib boring va yangiliklardan xabardor bo'lib boring:\n\n📘 Facebook: https://www.facebook.com/surslofficial\n\n📸 Instagram: https://www.instagram.com/surslofficial\n\n▶️ YouTube: https://www.youtube.com/@surslofficial\n\n🌐 Texnikum sayti: https://www.sursl.uz\n\n✈️ Telegram kanali: https://t.me/surslofficial`
});

req('setMyShortDescription', {
    short_description: "Surxondaryo yuridik texnikumining rasmiy axborot va AI yordamchi boti."
});

req('setChatMenuButton', {
    menu_button: { type: 'commands' }
});
