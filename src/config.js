// ═══════════════════════════════════════════════════════
//  CONFIG — Barcha sozlamalar bir joyda
// ═══════════════════════════════════════════════════════

require("dotenv").config();

module.exports = {
  // Telegram
  BOT_TOKEN: process.env.BOT_TOKEN,
  
  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: "gemini-2.5-flash",
  
  // AI sozlamalari
  MAX_TOKENS: 1500,
  TEMPERATURE: 0.7,
  
  // Suhbat
  MAX_HISTORY: 20,       // Har bir foydalanuvchi uchun max xabar soni
  SESSION_TTL: 30 * 60,  // 30 daqiqa (sekundlarda)
  
  // Davomat tizimi
  DAVOMAT_CODE: process.env.DAVOMAT_CODE || "8879",
  
  // Bot ma'lumotlari
  BOT_NAME: "Humo",
  TEXNIKUM_NAME: "Surxondaryo Yuridik Texnikumi",
};
