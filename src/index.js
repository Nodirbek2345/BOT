// ═══════════════════════════════════════════════════════
//  INDEX — Bot Entry Point
// ═══════════════════════════════════════════════════════

const config = require("./config");
const { createBot } = require("./bot/bot");
const { registerCommands } = require("./bot/commands");
const { registerCallbackHandler } = require("./handlers/callbackHandler");
const { registerAdminHandler } = require("./handlers/adminHandler");
const { registerMessageHandler } = require("./handlers/messageHandler");
const { initGemini } = require("./ai/gemini");
const logger = require("./utils/logger");
const db = require("./utils/db");
const express = require('express');

// ── Dummy Web Server (Render bepul ishlashi uchun) ─────
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Humo Bot is running!'));
app.listen(PORT, () => {
    logger.info(`Web server started on port ${PORT}`);
});

// ── Banner ────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════╗
║   ⚖️  ${config.TEXNIKUM_NAME}          ║
║   🤖  Humo AI Bot — v1.0                    ║
║   📡  Telegram + Gemini AI                   ║
╚══════════════════════════════════════════════╝
`);

// ── Gemini AI ni ishga tushirish ─────────────────────
const aiReady = initGemini();
if (!aiReady) {
  logger.warn("Bot AI siz ishlaydi — faqat menyu va buyruqlar ishlaydi");
}

// ── Telegram botni yaratish ──────────────────────────
const bot = createBot();

// ── Database + Cloud Backup ishga tushirish ──────────
(async () => {
  // Cloud backup tizimini ishga tushiramiz
  await db.initDB(bot);
  
  // Adminlarga ogohlantirish yuborish
  async function notifyAdmins(text) {
    const admins = db.getAdmins();
    for (const adminId of admins) {
      try { await bot.sendMessage(adminId, text, { parse_mode: "Markdown" }); } catch(e) {}
    }
  }

  // ── Foydalanuvchilarni global kuzatish (Statistika) ──
  bot.on("message", async (msg) => {
    if (msg.from && msg.chat.type === "private") {
      const status = db.trackUser(msg.from.id, msg.from.first_name);
      if (status === "new" || status === "rejoined") {
        const stats = db.getUserStats();
        const verb = status === "new" ? "qo'shildi" : "qaytdi (blokdan chiqardi)";
        const icon = status === "new" ? "🟢" : "🟡";
        await notifyAdmins(`${icon} **Yangi a'zo!**\n\n👤 Kim: [${msg.from.first_name || "Mijoz"}](tg://user?id=${msg.from.id})\n📎 Holat: Botga ${verb}.\n\n📊 Jami faol foydalanuvchilar: ${stats.activeCount} ta`);
      }
    }
  });

  bot.on("my_chat_member", async (update) => {
    if (update.chat.type === "private") {
      const name = update.chat.first_name || update.from?.first_name || "Kechagi foydalanuvchi";
      const status = update.new_chat_member.status;
      
      let dbStatus = null;
      if (status === "kicked" || status === "left") {
        dbStatus = db.setUserStatus(update.chat.id, false);
      } else if (status === "member") {
        dbStatus = db.setUserStatus(update.chat.id, true);
        db.trackUser(update.chat.id, name);
      }

      if (dbStatus === "left") {
        const stats = db.getUserStats();
        await notifyAdmins(`🔴 **A'zo chiqib ketdi**\n\n👤 Kim: [${name}](tg://user?id=${update.chat.id})\n📎 Holat: Botni blokladi (yoki o'chirdi).\n\n📊 Qolgan faollar: ${stats.activeCount} ta`);
      }
    }
  });

  // ── Handlerlarni ulash (tartib muhim!) ───────────────
  registerCommands(bot);
  registerCallbackHandler(bot);
  registerAdminHandler(bot);
  registerMessageHandler(bot);

  logger.success(`${config.BOT_NAME} bot ishga tushdi! Telegram'da foydalanishingiz mumkin.`);
  logger.info(`AI: Gemini ${config.GEMINI_MODEL}`);
  logger.info("Ctrl+C bosib to'xtatishingiz mumkin.\n");
})();

// ── Graceful Shutdown ────────────────────────────────
process.on("SIGINT", () => {
  logger.warn("Bot to'xtatilmoqda...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.warn("Bot to'xtatilmoqda...");
  bot.stopPolling();
  process.exit(0);
});

// Kutilmagan xatoliklarni ushlash
process.on("uncaughtException", (error) => {
  logger.error("Kutilmagan xatolik:", error.message);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason);
});
