// ═══════════════════════════════════════════════════════
//  AI SERVICE (Gemini + Groq)
// ═══════════════════════════════════════════════════════

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const config = require("../config");
const SYSTEM_PROMPT = require("./prompt");
const db = require("../utils/db");
const logger = require("../utils/logger");

let genAI = null;
let groq = null;
let useGroqFlag = false;

/**
 * AI modellarini ishga tushirish
 */
function initGemini() {
  if (config.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    logger.info(`Gemini model: ${config.GEMINI_MODEL} — tayyor ✓`);
  } else {
    logger.warn("GEMINI_API_KEY topilmadi!");
  }

  if (config.GROQ_API_KEY) {
    groq = new Groq({ apiKey: config.GROQ_API_KEY });
    logger.info(`Groq model: ${config.GROQ_MODEL} — tayyor ✓`);
  } else {
    logger.warn("GROQ_API_KEY topilmadi!");
  }

  if (!genAI && !groq) return false;
  return true;
}

async function callGemini(history, userMessage, instruction) {
  const currentModel = genAI.getGenerativeModel({
    model: config.GEMINI_MODEL,
    systemInstruction: instruction,
  });

  const chat = currentModel.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: config.MAX_TOKENS,
      temperature: config.TEMPERATURE,
    },
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text().trim();
}

async function callGroq(history, userMessage, instruction) {
  // Groq tarix formatini to'g'rilash
  const groqHistory = history.map(h => ({
    role: h.role === "model" ? "assistant" : "user",
    content: h.parts[0].text
  }));

  const messages = [
    { role: "system", content: instruction },
    ...groqHistory,
    { role: "user", content: userMessage }
  ];

  const completion = await groq.chat.completions.create({
    messages: messages,
    model: config.GROQ_MODEL,
    temperature: config.TEMPERATURE,
    max_tokens: config.MAX_TOKENS,
  });

  return completion.choices[0]?.message?.content?.trim();
}

/**
 * AI ga savol yuborish (suhbat tarixi bilan)
 * @param {Array} history 
 * @param {string} userMessage 
 * @returns {string} AI javobi
 */
async function askGemini(history, userMessage) {
  if (!genAI && !groq) {
    return "⚠️ AI xizmati hozirda ishlamayapti. Iltimos keyinroq urinib ko'ring.";
  }

  try {
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

    // Har gal almashib turish
    useGroqFlag = !useGroqFlag;
    let tryGroqFirst = useGroqFlag && groq;
    let tryGeminiFirst = !tryGroqFirst && genAI;

    // Agar flag tushganda o'sha API bo'lmasa, teskarisiga o'zgaradi
    if (tryGroqFirst && !groq) { tryGroqFirst = false; tryGeminiFirst = true; }
    if (tryGeminiFirst && !genAI) { tryGeminiFirst = false; tryGroqFirst = true; }

    let text;

    try {
      if (tryGroqFirst) {
        text = await callGroq(history, userMessage, finalInstruction);
      } else {
        text = await callGemini(history, userMessage, finalInstruction);
      }
    } catch (e) {
      logger.error(`Birlamchi AI xatoligi (${tryGroqFirst ? 'Groq' : 'Gemini'}):`, e.message);
      // Fallback
      if (tryGroqFirst && genAI) {
        text = await callGemini(history, userMessage, finalInstruction);
      } else if (tryGeminiFirst && groq) {
        text = await callGroq(history, userMessage, finalInstruction);
      } else {
        throw e;
      }
    }

    if (!text || text.length === 0) {
      return "Uzr, javob topa olmadim. Iltimos savolingizni boshqacha ifodalab ko'ring.";
    }

    return text;
  } catch (error) {
    logger.error("AI API xatoligi (Ikkala model ham):", error.message);

    if (error.message?.includes("quota")) {
      return "⚠️ API kvota tugadi. Iltimos keyinroq urinib ko'ring.";
    }
    if (error.message?.includes("safety")) {
      return "⚠️ Xavfsizlik filtri. Iltimos savolingizni boshqacha ifodalang.";
    }

    return "⚠️ Texnik xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.";
  }
}

module.exports = { initGemini, askGemini };
