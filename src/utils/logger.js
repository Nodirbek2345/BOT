// ═══════════════════════════════════════════════════════
//  LOGGER — Oddiy log utility
// ═══════════════════════════════════════════════════════

const time = () => new Date().toLocaleTimeString("uz-UZ", {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

module.exports = {
  info: (...args) => console.log(`[${time()}] ℹ️`, ...args),
  warn: (...args) => console.warn(`[${time()}] ⚠️`, ...args),
  error: (...args) => console.error(`[${time()}] ❌`, ...args),
  success: (...args) => console.log(`[${time()}] ✅`, ...args),
  user: (userId, name, ...args) => console.log(`[${time()}] 👤 [${userId}] ${name}:`, ...args),
};
