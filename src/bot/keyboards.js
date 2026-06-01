// ═══════════════════════════════════════════════════════
//  KEYBOARDS — Dinamik Reply Keyboards (Premium)
// ═══════════════════════════════════════════════════════
const db = require("../utils/db");

/**
 * Berilgan parentId (papka) ichidagi tugmalardan klaviatura yasaydi
 */
function buildKeyboard(parentId = "root") {
  const buttons = db.getButtonsByParent(parentId);
  const keyboard = [];
  
  // 2 tadan qatorga joylashtirish
  for (let i = 0; i < buttons.length; i += 2) {
    const row = [{ text: buttons[i].text }];
    if (buttons[i + 1]) row.push({ text: buttons[i + 1].text });
    keyboard.push(row);
  }
  
  if (parentId === "root") {
    // Bosh menyu uchun "Savolim bor"
    keyboard.push([{ text: "✏️ Savolim bor" }]);
  } else {
    // Ichki menyular uchun "Bosh menyu"
    keyboard.push([{ text: "🔙 Bosh menyu" }]);
  }

  return {
    keyboard,
    resize_keyboard: true
  };
}

module.exports = { buildKeyboard };
