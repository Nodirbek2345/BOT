// ═══════════════════════════════════════════════════════
//  SESSION MANAGER — Foydalanuvchi suhbat xotirasi
// ═══════════════════════════════════════════════════════

const config = require("../config");

/**
 * Har bir foydalanuvchi uchun suhbat tarixini saqlash
 * Format: Map<userId, { history: [...], lastActive: timestamp }>
 */
const sessions = new Map();

/**
 * Foydalanuvchi sessiyasini olish yoki yaratish
 */
function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      history: [],
      lastActive: Date.now(),
    });
  }
  const session = sessions.get(userId);
  session.lastActive = Date.now();
  return session;
}

/**
 * Suhbat tarixiga xabar qo'shish
 * @param {number} userId
 * @param {"user"|"model"} role
 * @param {string} text
 */
function addMessage(userId, role, text) {
  const session = getSession(userId);
  session.history.push({
    role: role,
    parts: [{ text: text }],
  });

  // Tarixni limitda ushlab turish
  if (session.history.length > config.MAX_HISTORY) {
    session.history = session.history.slice(-config.MAX_HISTORY);
  }
}

/**
 * Suhbat tarixini olish (Gemini formatida)
 */
function getHistory(userId) {
  const session = getSession(userId);
  return session.history;
}

/**
 * Foydalanuvchi sessiyasini tozalash
 */
function clearSession(userId) {
  sessions.delete(userId);
}

/**
 * Eskirgan sessiyalarni tozalash (har 10 daqiqada)
 */
function cleanupSessions() {
  const now = Date.now();
  const ttlMs = config.SESSION_TTL * 1000;

  for (const [userId, session] of sessions) {
    if (now - session.lastActive > ttlMs) {
      sessions.delete(userId);
    }
  }
}

// Har 10 daqiqada eski sessiyalarni tozalash
setInterval(cleanupSessions, 10 * 60 * 1000);

module.exports = { getSession, addMessage, getHistory, clearSession };
