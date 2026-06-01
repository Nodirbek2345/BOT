// ═══════════════════════════════════════════════════════
//  COMMANDS — Bot buyruqlarini ro'yxatga olish
//  ⚠️ Matnlarni o'zgartirish uchun: src/config/content.js
// ═══════════════════════════════════════════════════════
const C = require("../config/content");
const config = require("../config");
const { buildKeyboard } = require("./keyboards");
const { clearSession } = require("../utils/session");
const { checkSubscription, getSubscriptionKeyboard } = require("../utils/subscription");
const logger = require("../utils/logger");

// Export user state setter for other modules
const userStates = new Map();
function setUserState(chatId, state) { userStates.set(chatId, state); }
function getUserState(chatId) { return userStates.get(chatId); }

/**
 * Barcha buyruqlarni ro'yxatga olish
 * @param {TelegramBot} bot
 */
function registerCommands(bot) {
  // ── /start buyrug'i ───────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || "Foydalanuvchi";
    logger.user(chatId, name, "/start buyrug'i");

    const isSubscribed = await checkSubscription(bot, chatId);
    if (!isSubscribed) {
        await bot.sendMessage(chatId, C.SUBSCRIPTION_TEXT, {
            reply_markup: getSubscriptionKeyboard()
        });
        return;
    }

    // Agar obuna bo'lsa, to'g'ridan-to'g'ri Welcome xabarini yuboramiz
    const db = require("../utils/db");
    const savedWelcome = db.getSetting("welcome_text");
    const defaultWelcome = C.WELCOME_TEXT.join("\n");
    let rawContent = savedWelcome || defaultWelcome;
    rawContent = rawContent.replace(/{name}/g, name);

    const opts = { parse_mode: "HTML", reply_markup: buildKeyboard("root") };

    try {
        if (rawContent.startsWith("MEDIA:")) {
            const media = JSON.parse(rawContent.replace("MEDIA:", ""));
            if (media.text) opts.caption = media.text;

            try {
                if (media.type === "photo") await bot.sendPhoto(chatId, media.file_id, opts);
                else if (media.type === "video") await bot.sendVideo(chatId, media.file_id, opts);
                else if (media.type === "document") await bot.sendDocument(chatId, media.file_id, opts);
            } catch(e) {
                opts.parse_mode = undefined;
                if (media.type === "photo") await bot.sendPhoto(chatId, media.file_id, opts);
                else if (media.type === "video") await bot.sendVideo(chatId, media.file_id, opts);
                else if (media.type === "document") await bot.sendDocument(chatId, media.file_id, opts);
            }
        } else {
            await bot.sendMessage(chatId, rawContent, opts);
        }
    } catch (err) {
        if (!rawContent.startsWith("MEDIA:")) {
            opts.parse_mode = undefined;
            await bot.sendMessage(chatId, rawContent, opts);
        }
    }
  });

  // ── /menu ─────────────────────────────────────────────
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    logger.user(chatId, msg.from.first_name, "/menu buyrug'i");

    const isSubscribed = await checkSubscription(bot, chatId);
    if (!isSubscribed) {
        await bot.sendMessage(chatId, C.SUBSCRIPTION_TEXT, { reply_markup: getSubscriptionKeyboard() });
        return;
    }

    bot.sendMessage(chatId, C.BOSH_MENYU_TEXT, {
      parse_mode: "Markdown",
      reply_markup: buildKeyboard("root"),
    });
  });

  // ── /help ─────────────────────────────────────────────
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    logger.user(chatId, msg.from.first_name, "/help buyrug'i");

    const isSubscribed = await checkSubscription(bot, chatId);
    if (!isSubscribed) return;

    const helpText = [
      `📖 *Yordam — ${C.BOT_NAME} Bot*\n`,
      `Bu bot *${C.TEXNIKUM_NAME}*ning rasmiy AI yordamchisidir.\n`,
      `🔹 Savolingizni yozing — AI javob beradi`,
      `🔹 Tugmalardan foydalaning — tez navigatsiya`,
      `🔹 /qr — QR kod yaratish`,
      `🔹 /clear — suhbat tarixini tozalash\n`,
      `📍 ${C.MANZIL}`,
      `📞 ${C.TELEFON}`,
    ].join("\n");

    bot.sendMessage(chatId, helpText, {
      parse_mode: "Markdown",
      reply_markup: buildKeyboard("root"),
    });
  });

  // ── /qr ───────────────────────────────────────────────
  bot.onText(/\/qr/, async (msg) => {
    const chatId = msg.chat.id;
    logger.user(chatId, msg.from.first_name, "/qr buyrug'i");

    const isSubscribed = await checkSubscription(bot, chatId);
    if (!isSubscribed) return;

    setUserState(chatId, 'qr_waiting');
    bot.sendMessage(chatId, "📎 *QR kod yaratish*\n\nIltimos, QR kodga aylantirmoqchi bo'lgan matn yoki havolani yuboring:", {
        parse_mode: 'Markdown',
    });
  });

  // ── /clear ────────────────────────────────────────────
  bot.onText(/\/clear/, async (msg) => {
    const chatId = msg.chat.id;
    logger.user(chatId, msg.from.first_name, "/clear buyrug'i");
    clearSession(chatId);
    bot.sendMessage(chatId, C.CLEAR_TEXT);
  });

  // Bot buyruqlarini Telegram menyusiga ro'yxatdan o'tkazish
  bot.setMyCommands(C.BOT_COMMANDS);
  
  // Bot ta'rifini o'rnatish (What can this bot do?)
  bot.setMyDescription(C.BOT_DESCRIPTION);

  // Bot qisqa ta'rifini o'rnatish
  bot.setMyShortDescription(C.BOT_SHORT_DESCRIPTION);
}

module.exports = { registerCommands, setUserState, getUserState, userStates };
