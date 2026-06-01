// ═══════════════════════════════════════════════════════
//  SUBSCRIPTION — Majburiy obuna tekshiruvi
//  ⚠️ Matnlarni o'zgartirish uchun: src/config/content.js
// ═══════════════════════════════════════════════════════
const C = require("../config/content");
const db = require("./db"); // O'zgarishlar doimiy bo'lishi uchun db

const failCache = new Map(); // Anti-spam uchun

async function checkSubscription(bot, userId, isConfirming = false) {
    if (db.isUserSubscribed(userId)) return true;

    // Agar oxirgi 10 soniyada tekshirilgan va obuna bo'lmagan bo'lsa, API ga so'rov yubormaslik (tepadan tezkor false qaytarish)
    if (!isConfirming && failCache.has(userId)) {
        if (Date.now() - failCache.get(userId) < 10000) {
            return false;
        }
    }

    for (const channel of C.CHANNELS) {
        if (channel.type === 'telegram') {
            try {
                const member = await bot.getChatMember(channel.id, userId);
                if (member.status === 'left' || member.status === 'kicked') {
                    failCache.set(userId, Date.now());
                    return false;
                }
            } catch (error) {
                console.error(`Subscription check error for ${channel.id}:`, error.message);
                // Agar botni kanalga admin qilinmagan bo'lsa (400 xatolik borsa),
                if (error.message.includes('400')) {
                    if (isConfirming) {
                        db.setUserSubscribed(userId);
                        return true;
                    }
                }
                failCache.set(userId, Date.now());
                return false;
            }
        }
    }

    db.setUserSubscribed(userId);
    return true;
}

function getSubscriptionKeyboard() {
    const inline_keyboard = C.SUBSCRIPTION_BUTTONS.map(btn => [{ text: btn.text, url: btn.url }]);
    inline_keyboard.push([{ text: C.SUBSCRIPTION_CONFIRM_TEXT, callback_data: "check_subscription" }]);
    return { inline_keyboard };
}

module.exports = { checkSubscription, getSubscriptionKeyboard };
