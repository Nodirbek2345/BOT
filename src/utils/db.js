// ═══════════════════════════════════════════════════════
//  DB.JS — Telegram Cloud Backup bilan ma'lumotlar bazasi
//  Server qayta ishga tushsa ham ma'lumotlar saqlanadi!
//  
//  ⚠️ MUHIM: Render.com muhit o'zgaruvchilariga ADMIN_ID
//     qo'shilishi SHART! Aks holda backup ishlamaydi.
// ═══════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "../../data/menuData.json");
const ATTENDANCE_PATH = path.join(__dirname, "../../data/attendance.json");

// ── Xotira va Bot havolasi ────────────────────────────
let memoryDB = null;
let botInstance = null;
let backupChatId = null;
let isInitialized = false;
let backupTimer = null;

// ── BOT HAVOLASINI SAQLASH ────────────────────────────
function setBotInstance(bot) {
  botInstance = bot;
  backupChatId = process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : 1014957194;

  if (!backupChatId) {
    console.warn("⚠️  ADMIN_ID muhit o'zgaruvchisi topilmadi!");
    console.warn("⚠️  Cloud backup ISHLAMAYDI! Render'da ADMIN_ID qo'shing.");
    console.warn("⚠️  Render → Environment → Add: ADMIN_ID = <sizning Telegram ID>");
  }
}

// ═══════════════════════════════════════════════════════
//  TELEGRAM CLOUD BACKUP — Kuchaytirilgan PRO tizim
// ═══════════════════════════════════════════════════════

// Telegram'dan oxirgi backupni yuklash (bot ishga tushganda)
async function restoreFromTelegram() {
  if (!botInstance || !backupChatId) return null;

  try {
    // 1-usul: Pinned message orqali backupni topish
    const chatInfo = await fetch(
      `https://api.telegram.org/bot${botInstance.token}/getChat?chat_id=${backupChatId}`
    );
    const chatData = await chatInfo.json();

    if (chatData.ok && chatData.result.pinned_message) {
      const pinnedMsg = chatData.result.pinned_message;

      // Agar pinned xabar document bo'lsa
      if (pinnedMsg.document) {
        const fileInfo = await fetch(
          `https://api.telegram.org/bot${botInstance.token}/getFile?file_id=${pinnedMsg.document.file_id}`
        );
        const fileData = await fileInfo.json();

        if (fileData.ok) {
          const fileUrl = `https://api.telegram.org/file/bot${botInstance.token}/${fileData.result.file_path}`;
          const fileResponse = await fetch(fileUrl);
          const jsonText = await fileResponse.text();
          const parsed = JSON.parse(jsonText);

          console.log("☁️ Telegram Cloud Backup'dan ma'lumotlar tiklandi!");
          return parsed;
        }
      }

      // Agar pinned xabar text bo'lsa (kichik bazalar uchun)
      if (pinnedMsg.text && pinnedMsg.text.startsWith("{")) {
        try {
          const parsed = JSON.parse(pinnedMsg.text);
          console.log("☁️ Telegram Cloud Backup (text) dan ma'lumotlar tiklandi!");
          return parsed;
        } catch (e) { }
      }
    }
  } catch (err) {
    console.error("☁️ Cloud backup yuklashda xato:", err.message);
  }
  return null;
}

// Telegram'ga backup yuklash (har safar saqlaganda)
async function backupToTelegram(data) {
  if (!botInstance || !backupChatId) return;

  try {
    const jsonStr = JSON.stringify(data, null, 2);

    // JSON katta bo'lsa, document sifatida yuboramiz
    if (jsonStr.length > 3500) {
      // Vaqtinchalik fayl yaratib yuboramiz
      const tempPath = path.join(__dirname, "../../data/_backup.json");
      const dirPath = path.dirname(tempPath);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(tempPath, jsonStr, "utf-8");

      const sentMsg = await botInstance.sendDocument(backupChatId, tempPath, {
        caption: `☁️ Menu Backup: ${new Date().toLocaleString("uz-UZ")}`
      });

      // Pinlab qo'yamiz (keyingi restart uchun tez topish uchun)
      try {
        await botInstance.pinChatMessage(backupChatId, sentMsg.message_id, { disable_notification: true });
      } catch (e) { }

      // Vaqtinchalik faylni o'chiramiz
      try { fs.unlinkSync(tempPath); } catch (e) { }
    } else {
      // Kichik JSON — text sifatida yuboramiz
      const sentMsg = await botInstance.sendMessage(backupChatId, jsonStr, { disable_notification: true });
      try {
        await botInstance.pinChatMessage(backupChatId, sentMsg.message_id, { disable_notification: true });
      } catch (e) { }
    }
  } catch (err) {
    console.error("☁️ Cloud backup saqlashda xato:", err.message);
  }
}

// ═══════════════════════════════════════════════════════
//  ATTENDANCE BACKUP — Davomat ma'lumotlarini ham saqlash
// ═══════════════════════════════════════════════════════

async function restoreAttendanceFromTelegram() {
  if (!botInstance || !backupChatId) return null;

  try {
    // Admin chatdan oxirgi xabarlarni izlash
    // "attendance_backup" captionli document ni qidiramiz
    // Oddiy yondashuv: /getUpdates orqali izlab, topmasak null qaytaramiz
    // Buni alohida "backup kanal" orqali qilish kerak, lekin hozir
    // lokal fayldagi backupdan foydalanamiz agar mavjud bo'lsa
  } catch (err) {
    console.error("☁️ Attendance cloud restore xato:", err.message);
  }
  return null;
}

async function backupAttendanceToTelegram(data) {
  if (!botInstance || !backupChatId) return;

  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const tempPath = path.join(__dirname, "../../data/_attendance_backup.json");
    const dirPath = path.dirname(tempPath);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(tempPath, jsonStr, "utf-8");

    await botInstance.sendDocument(backupChatId, tempPath, {
      caption: `📋 Attendance Backup: ${new Date().toLocaleString("uz-UZ")}`
    });

    try { fs.unlinkSync(tempPath); } catch (e) { }
  } catch (err) {
    console.error("☁️ Attendance backup xato:", err.message);
  }
}

// ═══════════════════════════════════════════════════════
//  DAVRIY AVTOMATIK BACKUP — Har 10 daqiqada saqlash
// ═══════════════════════════════════════════════════════
function startAutoBackup() {
  if (backupTimer) clearInterval(backupTimer);

  // Har 10 daqiqada avtomatik backup
  backupTimer = setInterval(async () => {
    if (!memoryDB || !botInstance || !backupChatId) return;

    try {
      console.log("☁️ Avtomatik backup boshlanmoqda...");

      // Menu datani backup qilish
      await backupToTelegram(memoryDB);

      // Attendance datani ham backup qilish (agar mavjud bo'lsa)
      try {
        if (fs.existsSync(ATTENDANCE_PATH)) {
          const attData = JSON.parse(fs.readFileSync(ATTENDANCE_PATH, "utf-8"));
          await backupAttendanceToTelegram(attData);
        }
      } catch (e) { }

      console.log("☁️ Avtomatik backup muvaffaqiyatli!");
    } catch (err) {
      console.error("☁️ Avtomatik backup xato:", err.message);
    }
  }, 10 * 60 * 1000); // 10 daqiqa

  console.log("⏰ Avtomatik backup har 10 daqiqada ishlaydi.");
}

// ═══════════════════════════════════════════════════════
//  ASOSIY INIT — Bot ishga tushganda chaqiriladi
// ═══════════════════════════════════════════════════════
async function initDB(bot) {
  setBotInstance(bot);

  // 1-qadam: Avval lokal fayldan o'qish
  let data = null;
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    data = JSON.parse(raw);
    console.log("📁 Lokal fayldan ma'lumotlar o'qildi.");
  } catch (e) {
    console.log("📁 Lokal fayl topilmadi, Telegram cloud'dan tiklanmoqda...");
  }

  // 2-qadam: Agar lokal fayl bo'lmasa yoki bo'sh bo'lsa, Telegramdan tiklaymiz
  if (!data || !data.buttons || data.buttons.length === 0) {
    const cloudData = await restoreFromTelegram();
    if (cloudData && cloudData.buttons && cloudData.buttons.length > 0) {
      data = cloudData;
      console.log("☁️ Cloud'dan tiklandi! Tugmalar soni:", data.buttons.length);

      // Tiklangan datani lokal faylga ham saqlaymiz
      saveToFile(data);
    }
  }

  // 3-qadam: Agar hech qayerda topilmasa — boshlang'ich ma'lumotlar
  if (!data || !data.buttons || data.buttons.length === 0) {
    console.log("🆕 Birinchi marta ishga tushmoqda, boshlang'ich menyular yaratilmoqda...");
    data = getDefaultData();
  }

  // Bazani normalizatsiya
  if (!data.users) data.users = {};
  if (!data.admins) data.admins = [];
  if (!data.nextId) data.nextId = 1;
  if (!data.settings) data.settings = {};
  if (!data.buttons) data.buttons = [];

  // Admin ID ni qo'shish
  if (process.env.ADMIN_ID && !data.admins.includes(Number(process.env.ADMIN_ID))) {
    data.admins.push(Number(process.env.ADMIN_ID));
  }
  if (!data.admins.includes(1014957194)) {
    data.admins.push(1014957194);
  }

  memoryDB = data;
  isInitialized = true;

  // Lokal faylga ham saqlaymiz
  saveToFile(data);

  // Avtomatik backupni boshlash
  startAutoBackup();

  // Dastlabki cloud backup (server yangi ishga tushganda)
  if (backupChatId) {
    setTimeout(async () => {
      try {
        await backupToTelegram(memoryDB);
        console.log("☁️ Boshlang'ich cloud backup saqlandi!");
      } catch (e) { }
    }, 5000);
  }

  console.log(`✅ Database tayyor! Tugmalar: ${data.buttons.length}, Adminlar: ${data.admins.length}`);
  return data;
}

// ═══════════════════════════════════════════════════════
//  BOSHLANG'ICH MA'LUMOTLAR (faqat birinchi marta)
// ═══════════════════════════════════════════════════════
function getDefaultData() {
  return {
    admins: process.env.ADMIN_ID ? [Number(process.env.ADMIN_ID)] : [1014957194],
    buttons: [
      { id: "btn_1", parentId: "root", text: "⚙️ Xizmatlar", type: "menu", content: "⚙️ Xizmatlar bo'limi:" },
      { id: "btn_r1", parentId: "root", text: "📌 my.edu.uz qo'llanma", type: "answer", content: "my.edu.uz saytida ro'yxatdan o'tish bo'yicha batafsil qo'llanma bering — har bir qadamni alohida tushuntiring" },
      { id: "btn_r2", parentId: "root", text: "✅ Shahodatnoma", type: "answer", content: "Texnikumda o'qishni tugatgandan keyin shahodatnoma (diplom) olish jarayoni va talablari haqida ma'lumot bering" },
      { id: "btn_r3", parentId: "root", text: "💵 Kontrakt to'lov", type: "answer", content: "Kontrakt to'lov miqdorlari, to'lov usullari (online va offline) va to'lov muddatlari haqida to'liq ma'lumot bering" },
      { id: "btn_r4", parentId: "root", text: "📱 Aloqa", type: "answer", content: "Texnikumning barcha aloqa ma'lumotlari: telefon, email, manzil, telegram, ijtimoiy tarmoqlar" },
      { id: "btn_r5", parentId: "root", text: "🧠 Maslahatlar", type: "answer", content: "Texnikumga qabul bo'lmoqchi bo'lgan abituriyentlarga eng muhim va foydali maslahatlar bering" },
      { id: "btn_m1", parentId: "btn_1", text: "📄 Ta'lim yo'nalishlari", type: "answer", content: "Texnikumdagi barcha ta'lim yo'nalishlari: nomlari, davomiyligi, kontrakt narxi va imkoniyatlar haqida to'liq ma'lumot" },
      { id: "btn_m2", parentId: "btn_1", text: "🎓 Qabul 2026–2027", type: "answer", content: "2026-2027 o'quv yili uchun qabul shartlari, muddatlari, test fanlari va zaruriy hujjatlar haqida batafsil" },
      { id: "btn_m3", parentId: "btn_1", text: "📝 Qabul arizalari", type: "menu", content: "🎓 Qabul arizalar:" },
      { id: "btn_q1", parentId: "btn_m3", text: "💻 9-sinf qabul", type: "answer", content: "Surxondaryo yuridik texnikumi: 💻 9-sinf qabul\n👇\n<a href='https://docs.google.com/forms/d/e/1FAIpQLSf3f-2SbXRN8PPgYV_VUfDxsps0hPPQBhiWu9dFz_a8uMt_YA/viewform?usp=dialog'>Online ariza formasi</a>" },
      { id: "btn_q2", parentId: "btn_m3", text: "🎓 11-sinf qabul", type: "answer", content: "Surxondaryo yuridik texnikumi: 🎓 11-sinf qabul\n👇\n<a href='https://docs.google.com/forms/d/e/1FAIpQLSe7bI0SI5KDRB_y5iHCUUeXhHC1REVL7CCQaGAS_gvJ8VOP2g/viewform?usp=dialog'>Online ariza formasi</a>" },
      { id: "btn_m4", parentId: "btn_1", text: "📱 Elektron kutubxona", type: "answer", content: "Texnikumning elektron kutubxona ilovasi: qanday yuklab olish, qanday foydalanish va qanday resurslar mavjud" },
      { id: "btn_m5", parentId: "btn_1", text: "📚 Kutubxona", type: "answer", content: "Surxondaryo Yuridik Texnikumi kutubxonasi: manzil, ish vaqti, mavjud kitoblar fondi va foydalanish tartibi" },
      { id: "btn_m6", parentId: "btn_1", text: "💳 Loyihalar", type: "answer", content: "Texnikumning faol loyihalari, talabalar tashabbuslar, musobaqalar va ijtimoiy tadbirlar haqida" },
      { id: "btn_m7", parentId: "btn_1", text: "🎁 Imtiyozlar", type: "answer", content: "Qabul jarayonida qanday imtiyozlar mavjud va kimlar foydalanishi mumkin — to'liq ro'yxat bering" }
    ],
    users: {},
    nextId: 15,
    settings: {}
  };
}

// ═══════════════════════════════════════════════════════
//  LOAD / SAVE — Xotira + Lokal + Cloud
// ═══════════════════════════════════════════════════════
function loadData() {
  if (memoryDB) return memoryDB;

  // Agar initDB hali chaqirilmagan bo'lsa (fallback)
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    memoryDB = JSON.parse(raw);
  } catch (e) {
    memoryDB = getDefaultData();
  }

  if (!memoryDB.users) memoryDB.users = {};
  if (!memoryDB.admins) memoryDB.admins = [];
  if (!memoryDB.nextId) memoryDB.nextId = 1;
  if (!memoryDB.settings) memoryDB.settings = {};
  if (!memoryDB.buttons) memoryDB.buttons = [];

  return memoryDB;
}

function saveToFile(data) {
  const dirPath = path.dirname(DATA_PATH);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8", (err) => {
    if (err) console.error("📁 Faylga saqlashda xato:", err);
  });
}

function saveData(data) {
  memoryDB = data;

  // 1. Lokal faylga saqlash (tez)
  saveToFile(data);

  // 2. Telegram Cloud'ga backup (asinxron, bot sekinlashmaydi)
  backupToTelegram(data).catch(err => {
    console.error("☁️ Cloud backup xato:", err.message);
  });
}

// ── Admin tekshirish ───────────────────────────────────
function isAdmin(userId) {
  const admins = loadData().admins || [];
  return admins.includes(userId) || userId === 1014957194;
}
function addAdmin(userId) {
  const data = loadData();
  if (!data.admins.includes(userId)) {
    data.admins.push(userId);
    saveData(data);
    return true;
  }
  return false;
}
function removeAdmin(userId) {
  const data = loadData();
  const idx = data.admins.indexOf(userId);
  if (idx !== -1) {
    data.admins.splice(idx, 1);
    saveData(data);
    return true;
  }
  return false;
}
function getAdmins() {
  return loadData().admins;
}

// ── PREMIUM MENYU CRUD ─────────────────────────────────

// Berilgan parentId (papka) ichidagi tugmalarni o'qish
function getButtonsByParent(parentId) {
  return loadData().buttons.filter(b => b.parentId === parentId);
}

// Hamma tugmalarni o'qish (Admin ro'yxati uchun)
function getAllButtons() {
  return loadData().buttons;
}

// Yangi tugma qo'shish (papka xoh javob)
function addButton(parentId, text, type, content) {
  const data = loadData();
  const id = `btn_${data.nextId}`;
  const btn = { id, parentId, text, type, content };
  data.buttons.push(btn);
  data.nextId++;
  saveData(data);
  return btn;
}

// Tugmani o'chirish (Agar papka bo'lsa, ichidagilarni ham o'chiramiz recursive)
function removeButton(buttonId) {
  const data = loadData();
  let idsToRemove = [buttonId];

  // Ichki elementlarni rekursiv izlash
  let foundNew = true;
  while (foundNew) {
    foundNew = false;
    for (const b of data.buttons) {
      if (idsToRemove.includes(b.parentId) && !idsToRemove.includes(b.id)) {
        idsToRemove.push(b.id);
        foundNew = true;
      }
    }
  }

  const initialLen = data.buttons.length;
  data.buttons = data.buttons.filter(b => !idsToRemove.includes(b.id));

  if (data.buttons.length !== initialLen) {
    saveData(data);
    return true;
  }
  return false;
}

// Tugmani tahrirlash
function editButton(buttonId, newText, newContent) {
  const data = loadData();
  const found = data.buttons.find(b => b.id === buttonId);

  if (found) {
    if (newText) found.text = newText;
    if (newContent !== undefined && newContent !== null) found.content = newContent;
    saveData(data);
  }
  return found;
}

// Tugma turini o'zgartirish (Javob <-> Papka)
function toggleButtonType(buttonId) {
  const data = loadData();
  const found = data.buttons.find(b => b.id === buttonId);
  if (found) {
    found.type = found.type === "menu" ? "answer" : "menu";
    saveData(data);
    return found;
  }
  return null;
}

// Tugmani boshqa papkaga ko'chirish
function moveButton(buttonId, newParentId) {
  const data = loadData();
  const found = data.buttons.find(b => b.id === buttonId);

  if (found) {
    found.parentId = newParentId;
    saveData(data);
    return true;
  }
  return false;
}

// Tugma izlash (text bo'yicha bosganda topish uchun)
function findButtonByText(text) {
  return loadData().buttons.find(b => b.text === text) || null;
}

function findButtonById(id) {
  return loadData().buttons.find(b => b.id === id) || null;
}

// ── Statistika ─────────────────────────────────────────
function trackUser(userId, first_name) {
  const data = loadData();
  data.users = data.users || {};

  if (!data.users[userId]) {
    data.users[userId] = {
      joinedAt: new Date().toISOString(),
      first_name: first_name,
      active: true
    };
    saveData(data);
    return "new";
  } else if (!data.users[userId].active) {
    data.users[userId].active = true;
    saveData(data);
    return "rejoined";
  }
  return null;
}

function setUserSubscribed(userId) {
  const data = loadData();
  data.users = data.users || {};
  if (!data.users[userId]) {
    data.users[userId] = { joinedAt: new Date().toISOString(), active: true };
  }
  data.users[userId].subscribed = true;
  saveData(data);
}

function isUserSubscribed(userId) {
  const data = loadData();
  return data.users && data.users[userId] && data.users[userId].subscribed === true;
}

function setUserStatus(userId, active) {
  const data = loadData();
  data.users = data.users || {};
  if (data.users[userId] && data.users[userId].active !== active) {
    data.users[userId].active = active;
    saveData(data);
    return active ? "rejoined" : "left";
  }
  return null;
}

function getUserStats() {
  const data = loadData();
  const users = data.users || {};
  let total = 0;
  let activeCount = 0;
  for (const id in users) {
    total++;
    if (users[id].active) activeCount++;
  }
  return { total, activeCount, deletedCount: total - activeCount };
}

// ── Sozlamalar (Makroslar) ──────────────────────────────
function getSetting(key, defaultValue = "") {
  const data = loadData();
  return (data.settings && data.settings[key]) || defaultValue;
}

function setSetting(key, value) {
  const data = loadData();
  if (!data.settings) data.settings = {};
  data.settings[key] = value;
  saveData(data);
}

module.exports = {
  initDB, setBotInstance,
  loadData, saveData,
  isAdmin, addAdmin, removeAdmin, getAdmins,
  getButtonsByParent, getAllButtons, findButtonByText, findButtonById,
  addButton, removeButton, editButton, moveButton, toggleButtonType,
  trackUser, setUserStatus, getUserStats, setUserSubscribed, isUserSubscribed,
  getSetting, setSetting,
  backupAttendanceToTelegram
};
