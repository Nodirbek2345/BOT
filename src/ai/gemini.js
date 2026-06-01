// ═══════════════════════════════════════════════════════
//  GEMINI AI SERVICE
// ═══════════════════════════════════════════════════════

const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");
const SYSTEM_PROMPT = require("./prompt");
const logger = require("../utils/logger");

let genAI = null;
let model = null;

/**
 * Gemini modelini ishga tushirish
 */
function initGemini() {
  if (!config.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY topilmadi! .env faylga qo'shing.");
    return false;
  }
  genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: config.GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });
  logger.info(`Gemini model: ${config.GEMINI_MODEL} — tayyor ✓`);
  return true;
}

/**
 * AI ga savol yuborish (suhbat tarixi bilan)
 * @param {Array} history - [{role: "user"|"model", parts: [{text: "..."}]}]
 * @param {string} userMessage - Yangi xabar
 * @returns {string} AI javobi
 */
async function askGemini(history, userMessage) {
  if (!model) {
    return "⚠️ AI xizmati hozirda ishlamayapti. Iltimos keyinroq urinib ko'ring.";
  }

  try {
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: config.MAX_TOKENS,
        temperature: config.TEMPERATURE,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      return "Uzr, javob topa olmadim. Iltimos savolingizni boshqacha ifodalab ko'ring.";
    }

    return text.trim();
  } catch (error) {
    logger.error("Gemini API xatolik:", error.message);

    if (error.message?.includes("quota")) {
      return "⚠️ API kvota tugadi. Iltimos keyinroq urinib ko'ring.";
    }
    if (error.message?.includes("safety")) {
      return "⚠️ Xavfsizlik filtri. Iltimos savolingizni boshqacha ifodalang.";
    }

    return "⚠️ Texnik xatolik yuz berdi. Iltimos qaytadan urinib ko'ring yoki +998 76 223-45-67 ga qo'ng'iroq qiling.";
  }
}

module.exports = { initGemini, askGemini };
