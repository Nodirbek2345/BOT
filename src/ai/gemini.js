// ═══════════════════════════════════════════════════════
//  GEMINI AI SERVICE
// ═══════════════════════════════════════════════════════

const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");
const SYSTEM_PROMPT = require("./prompt");
const db = require("../utils/db");
const logger = require("../utils/logger");

let genAI = null;

/**
 * Gemini modelini ishga tushirish
 */
function initGemini() {
  if (!config.GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY topilmadi! .env faylga qo'shing.");
    return false;
  }
  genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
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
  if (!genAI) {
    return "⚠️ AI xizmati hozirda ishlamayapti. Iltimos keyinroq urinib ko'ring.";
  }

  try {
    // 1. Dinamik ma'lumotlarni yig'ish
    const allBtns = db.getAllButtons() || [];
    let dynamicContext = "\n\nQUYIDAGI MA'LUMOTLAR BOTNING JORIY BAZASIDAN OLINDI VA FAQAT SHU BILIMLAR ASOSIDA JAVOB BERING:\n";
    let hasData = false;

    allBtns.forEach(b => {
      if (b.type === 'answer' && b.content) {
        let contentText = b.content;
        if (b.content.startsWith("MEDIA:")) {
          try {
            const m = JSON.parse(b.content.replace("MEDIA:", ""));
            contentText = m.text || "";
          } catch (e) { }
        }
        if (contentText.trim() && contentText !== "Ma'lumot kiritilmagan") {
          dynamicContext += `• Mavzu: "${b.text}" -> Ma'lumot: ${contentText.trim()}\n`;
          hasData = true;
        }
      }
    });

    const finalInstruction = hasData ? SYSTEM_PROMPT + dynamicContext : SYSTEM_PROMPT;

    // 2. Modelni eng so'nggi bilimlar bilan qayta shakllantirish
    const currentModel = genAI.getGenerativeModel({
      model: config.GEMINI_MODEL,
      systemInstruction: finalInstruction,
    });

    const chat = currentModel.startChat({
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
