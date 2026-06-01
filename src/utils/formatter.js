// ═══════════════════════════════════════════════════════
//  FORMATTER — Telegram uchun matn formatlash
// ═══════════════════════════════════════════════════════

/**
 * Gemini javobini Telegram Markdown formati uchun moslashtirish
 * Telegram oddiy Markdown qo'llab-quvvatlaydi: *bold*, _italic_, `code`
 */
function formatForTelegram(text) {
  if (!text) return "";

  let formatted = text
    // **bold** → *bold* (Telegram format)
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    // ### heading → *heading* (bold qilish)
    .replace(/^### (.+)$/gm, "\n*$1*")
    // ## heading → *$1*
    .replace(/^## (.+)$/gm, "\n*$1*")
    // # heading → *$1*
    .replace(/^# (.+)$/gm, "\n*$1*")
    // Ortiqcha bo'sh satrlarni tozalash
    .replace(/\n{4,}/g, "\n\n\n");

  return formatted.trim();
}

/**
 * Xabar uzunligini tekshirish (Telegram limiti 4096)
 */
function truncateMessage(text, maxLength = 4000) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "\n\n... _(davomi qisqartirildi)_";
}

module.exports = { formatForTelegram, truncateMessage };
