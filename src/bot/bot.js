// ═══════════════════════════════════════════════════════
//  BOT CORE — Telegram Bot Setup
// ═══════════════════════════════════════════════════════

const TelegramBot = require("node-telegram-bot-api");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * Telegram botni yaratish va qaytarish
 * @returns {TelegramBot}
 */
function createBot() {
  if (!config.BOT_TOKEN) {
    logger.error("BOT_TOKEN topilmadi! .env faylga qo'shing.");
    process.exit(1);
  }

  const bot = new TelegramBot(config.BOT_TOKEN, {
    polling: {
      interval: 300,
      autoStart: true,
      params: {
        timeout: 10,
      },
    },
  });

  // Polling xatoliklarini ushlash
  bot.on("polling_error", (error) => {
    logger.error("Polling xatolik:", error.code, error.message);
  });

  // Webhook xatoliklari
  bot.on("webhook_error", (error) => {
    logger.error("Webhook xatolik:", error.code, error.message);
  });

  logger.success("Telegram bot yaratildi ✓");
  return bot;
}

module.exports = { createBot };
