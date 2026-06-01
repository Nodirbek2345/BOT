// ═══════════════════════════════════════════════════════
//  CALLBACK HANDLER — Inline tugmalarni qayta ishlash
//  Admin callbacklar adminHandler.js da alohida
// ═══════════════════════════════════════════════════════
const C = require("../config/content");
const db = require("../utils/db");
const { buildKeyboard } = require("../bot/keyboards");
const { askGemini } = require("../ai/gemini");
const { addMessage, getHistory } = require("../utils/session");
const { formatForTelegram, truncateMessage } = require("../utils/formatter");
const { checkSubscription, getSubscriptionKeyboard } = require("../utils/subscription");
const logger = require("../utils/logger");

/**
 * Inline klaviatura bosilganda ishlaydigan funksiya
 * @param {TelegramBot} bot
 */
function registerCallbackHandler(bot) {
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const name = query.from.first_name || "Foydalanuvchi";

    // Admin callbacklarini o'tkazib yuborish (adminHandler ushlaydi)
    if (data.startsWith("admin_")) return;

    if (data === "check_subscription") {
      const isSubscribed = await checkSubscription(bot, chatId, true);
      if (isSubscribed) {
        try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
        await bot.sendMessage(chatId, C.SUBSCRIPTION_SUCCESS);

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
            } catch (e) {
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
      } else {
        await bot.answerCallbackQuery(query.id, {
          text: C.SUBSCRIPTION_FAIL,
          show_alert: true
        });
      }
      return;
    }

    const isSubscribed = await checkSubscription(bot, chatId);
    if (!isSubscribed) {
      await bot.answerCallbackQuery(query.id, { text: "Majburiy obunadan o'ting", show_alert: true });
      return;
    }

    await bot.answerCallbackQuery(query.id);
    logger.user(chatId, name, `tugma: ${data}`);

    if (data === "submenu_services") {
      const svcFolder = db.findButtonByText("⚙️ Xizmatlar");
      if (svcFolder) {
        await bot.sendMessage(chatId, C.XIZMATLAR_TEXT, {
          parse_mode: "Markdown",
          reply_markup: buildKeyboard(svcFolder.id),
        });
      }
      return;
    }

    if (data === "back_main") {
      await bot.sendMessage(chatId, C.BOSH_MENYU_TEXT, {
        parse_mode: "Markdown",
        reply_markup: buildKeyboard("root"),
      });
      return;
    }

    if (data === "menu_freetext") {
      await bot.sendMessage(chatId, C.SAVOLIM_BOR_TEXT);
      return;
    }
  });
}

module.exports = { registerCallbackHandler };
