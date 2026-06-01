// ═══════════════════════════════════════════════════════
//  MESSAGE HANDLER — Matnli xabarlarni ushlash
//  Cheksiz ichma-ich menyular va izolyatsiya qilingan AI
// ═══════════════════════════════════════════════════════
const C = require("../config/content");
const db = require("../utils/db");
const { addMessage, getHistory } = require("../utils/session");
const { formatForTelegram, truncateMessage } = require("../utils/formatter");
const { buildKeyboard } = require("../bot/keyboards");
const qrService = require("../services/qrService");
const logger = require("../utils/logger");
const { checkSubscription, getSubscriptionKeyboard } = require("../utils/subscription");
const { askGemini } = require("../ai/gemini");
const { adminStates } = require("./adminHandler");

// User states xotirasi
const userStates = new Map();

function registerMessageHandler(bot) {
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const name = msg.from.first_name || "Foydalanuvchi";
    const userText = msg.text.trim();

    // ── Admin state tekshiruvi ──
    if (adminStates.has(chatId) && db.isAdmin(userId)) {
      return; 
    }

    // ── Obuna tekshiruvi ──
    const isSubscribed = await checkSubscription(bot, chatId);
    if (!isSubscribed) {
        await bot.sendMessage(chatId, C.SUBSCRIPTION_TEXT, {
            reply_markup: getSubscriptionKeyboard()
        });
        return;
    }

    // Matn logi
    logger.user(chatId, name, userText);

    // ── Qattiq kodlangan menyular (Bosh menyu) ──
    if (userText === "🔙 Bosh menyu") {
        userStates.delete(chatId); // Har qanday holatni tozalaymiz
        await bot.sendMessage(chatId, "🏠 Bosh menyu — kerakli bo'limni tanlang:", { parse_mode: 'Markdown', reply_markup: buildKeyboard("root") });
        return;
    }

    if (userText === "✏️ Savolim bor") {
        userStates.set(chatId, "ask_ai");
        await bot.sendMessage(chatId, "✍️ Savolingizni to'liq va tushunarli qilib yozing. Bot sizga javob topishga harakat qiladi:", { reply_markup: buildKeyboard("root") });
        return;
    }

    // ── QR Kod kutish holati ──
    if (userStates.get(chatId) === 'qr_waiting') {
        userStates.delete(chatId);
        try {
            await bot.sendChatAction(chatId, 'upload_photo');
            const qrBuffer = await qrService.generateQR(userText);
            await bot.sendPhoto(chatId, qrBuffer, {
                caption: `📎 QR kod tayyor!\n\n📝 Mazmuni: ${userText.substring(0, 100)}`,
            });
        } catch (err) {
            await bot.sendMessage(chatId, "❌ QR kod yaratishda xatolik yuz berdi.");
        }
        return;
    }

    // ── Dinamik Menyular Routeri ──
    const btn = db.findButtonByText(userText);
    
    if (btn) {
        userStates.delete(chatId); // Har ehtimolga qarshi AI holatidan chiqamiz

        // Yordamchi o'zgaruvchilar
        const opts = { parse_mode: "HTML" };
        if (btn.type === "menu") {
             opts.reply_markup = buildKeyboard(btn.id);
        }

        const safeContent = btn.content || "Ma'lumot mavjud emas";

        try {
            if (safeContent.startsWith("MEDIA:")) {
                const media = JSON.parse(safeContent.replace("MEDIA:", ""));
                if (media.text) opts.caption = media.text;

                try {
                    if (media.type === "photo") await bot.sendPhoto(chatId, media.file_id, opts);
                    else if (media.type === "video") await bot.sendVideo(chatId, media.file_id, opts);
                    else if (media.type === "document") await bot.sendDocument(chatId, media.file_id, opts);
                } catch (e) {
                    opts.parse_mode = undefined;
                    if (media.type === "photo") await bot.sendPhoto(chatId, media.file_id, opts);
                    else if (media.type === "video") await bot.sendVideo(chatId, media.file_id, opts);
                    else if (media.type === "document") await bot.sendDocument(chatId, media.file_id, opts);
                }
            } else {
                await bot.sendMessage(chatId, safeContent, opts);
            }
        } catch (err) {
            if (!safeContent.startsWith("MEDIA:")) {
                opts.parse_mode = undefined;
                await bot.sendMessage(chatId, safeContent, opts);
            }
        }
        return;
    }

    // ── AI bilan gaplashish holati (Izolyatsiya qilingan AI) ──
    if (userStates.get(chatId) === "ask_ai") {
        userStates.delete(chatId); // Bir marta javob bergach holatdan chiqadi
        
        await bot.sendChatAction(chatId, "typing");
        const history = getHistory(chatId);
        addMessage(chatId, "user", userText);

        const reply = await askGemini(history, userText);
        addMessage(chatId, "model", reply);

        const formatted = formatForTelegram(reply);
        const safe = truncateMessage(formatted);

        try {
          await bot.sendMessage(chatId, safe, { parse_mode: "Markdown" });
        } catch (err) {
          await bot.sendMessage(chatId, truncateMessage(reply));
        }
        return;
    }

    // Agar so'z hech qaysi qolipga tushmasa va u AI holatida bo'lmasa:
    await bot.sendMessage(chatId, "👇 Iltimos, quyidagi menyulardan birini tanlang:", { reply_markup: buildKeyboard("root") });
  });
}

module.exports = { registerMessageHandler, userStates };
