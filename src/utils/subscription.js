// ═══════════════════════════════════════════════════════
//  SUBSCRIPTION — Majburiy obuna tekshiruvi
//  ⚠️ Matnlarni o'zgartirish uchun: src/config/content.js
// ═══════════════════════════════════════════════════════
const C = require("../config/content");

const subCache = new Set();

async function checkSubscription(bot, userId) {
    if (subCache.has(userId)) return true;

    for (const channel of C.CHANNELS) {
        if (channel.type === 'telegram') {
            try {
                const member = await bot.getChatMember(channel.id, userId);
                if (member.status === 'left' || member.status === 'kicked') {
                    return false;
                }
            } catch (error) {
                console.error(`Subscription check error for ${channel.id}:`, error.message);
                if (error.message.includes('400')) {
                    return true;
                }
                return false;
            }
        }
    }
    
    subCache.add(userId);
    return true;
}

function getSubscriptionKeyboard() {
    const inline_keyboard = C.SUBSCRIPTION_BUTTONS.map(btn => [{ text: btn.text, url: btn.url }]);
    inline_keyboard.push([{ text: C.SUBSCRIPTION_CONFIRM_TEXT, callback_data: "check_subscription" }]);
    return { inline_keyboard };
}

module.exports = { checkSubscription, getSubscriptionKeyboard };
