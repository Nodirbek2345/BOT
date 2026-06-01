// ═══════════════════════════════════════════════════════════════
//  CONTENT.JS — Barcha matnlar, menyular, havolalar shu yerda!
//  
//  ⚠️ DIQQAT: Botdagi barcha yozuvlarni SHU FAYLDAN o'zgartiring!
//  Boshqa fayllarni tegishingiz shart emas.
//  
//  O'zgartirganingizdan keyin botni qayta ishga tushiring:
//     Ctrl+C bosib to'xtating, keyin: node src/index.js
// ═══════════════════════════════════════════════════════════════

module.exports = {

  // ─── BOT HAQIDA ────────────────────────────────────────────
  BOT_NAME: "Humo",
  TEXNIKUM_NAME: "Surxondaryo Yuridik Texnikumi",
  
  // ─── ALOQA MA'LUMOTLARI ────────────────────────────────────
  MANZIL: "Termiz shahri, Mustaqillik ko'chasi, 15",
  TELEFON: "+998 76 223-45-67",
  QABUL_MUDDATI: "1 iyul – 15 avgust 2026",

  // ─── IJTIMOIY TARMOQLAR (obuna tekshirish) ────────────────
  // type: "telegram" — bot tekshira oladi (getChatMember bilan)
  // type: "external" — bot tekshira olmaydi (faqat havola)
  CHANNELS: [
    { name: "Telegram", url: "https://t.me/surslofficial", id: "@surslofficial", type: "telegram" },
    { name: "YouTube",  url: "https://www.youtube.com/@surslofficial", type: "external" },
    { name: "Instagram", url: "https://www.instagram.com/surslofficial", type: "external" },
  ],

  // ─── OBUNA OYNASI (Start bosilganda chiqadi) ──────────────
  SUBSCRIPTION_TEXT: "Assalomu alaykum botimizga xush kelibsiz.\n\nTelegram ✅\nobuna bo'ling ✅",
  
  // Obuna tugmalari (Inline Keyboard)
  SUBSCRIPTION_BUTTONS: [
    { text: "Telegram kanalga obuna bo'ling ⬇️", url: "https://t.me/surslofficial" },
    { text: "Youtube kanalga obuna bo'ling ⬇️", url: "https://www.youtube.com/@surslofficial" },
    { text: "Instagram sahifamizga obuna bo'ling ✅", url: "https://www.instagram.com/surslofficial" },
  ],
  SUBSCRIPTION_CONFIRM_TEXT: "✅ Tasdiqlash",
  SUBSCRIPTION_SUCCESS: "✅ Obunangiz muvaffaqiyatli tasdiqlandi! Endi botdan foydalanishingiz mumkin.",
  SUBSCRIPTION_FAIL: "❌ Hali kanallarga obuna bo'lmagansiz! Barcha kanallarga obuna bo'ling.",

  // ─── WELCOME XABARI (Obuna tasdiqlanganidan keyin) ─────────
  // {name} o'rniga foydalanuvchi ismi avtomatik qo'yiladi
  WELCOME_TEXT: [
    "Assalomu alaykum, *{name}*! 👋\n",
    "Men *Humo* — Surxondaryo Yuridik Texnikumining rasmiy AI yordamchisiman. ⚖️\n",
    "📍 Termiz shahri, Mustaqillik ko'chasi, 15",
    "📞 +998 76 223-45-67",
    "📅 Qabul: 1 iyul – 15 avgust 2026\n",
    "Quyidagi tugmalardan birini tanlang yoki menga to'g'ridan-to'g'ri savol yozing! ⬇️",
  ],

  // ─── BOSH MENYU TUGMALARI (Reply Keyboard) ─────────────────
  // Har bir qator [] ichida, har bir tugma { text: "..." } tarzida
  MAIN_MENU: [
    [
      { text: "📌 my.edu.uz qo'llanma" },
      { text: "✅ Shahodatnoma" },
    ],
    [
      { text: "💵 Kontrakt to'lov" },
      { text: "📱 Aloqa" },
    ],
    [
      { text: "🧠 Maslahatlar" },
      { text: "⚙️ Xizmatlar" },
    ],
    [
      { text: "✏️ Savolim bor" }
    ],
  ],

  // ─── XIZMATLAR SUBMENYUSI ──────────────────────────────────
  SERVICES_MENU: [
    [
      { text: "📄 Ta'lim yo'nalishlari" },
      { text: "🎓 Qabul 2026–2027" },
    ],
    [
      { text: "📝 Qabul arizalari" },
      { text: "📱 Elektron kutubxona" },
    ],
    [
      { text: "📚 Kutubxona" },
      { text: "💳 Loyihalar" },
    ],
    [
      { text: "🏠 Yotoqxona & Stipendiya" },
      { text: "🎁 Imtiyozlar" },
    ],
    [
      { text: "🔙 Bosh menyu" },
    ],
  ],

  // ─── MENYU TUGMALARI → AI SAVOLLARI XARITASI ───────────────
  // Foydalanuvchi tugmani bosganida, AI ga shu savol yuboriladi
  // Yangi tugma qo'shsangiz, shu yerga qo'shing
  MENU_QUESTIONS: {
    "📌 my.edu.uz qo'llanma": "my.edu.uz saytida ro'yxatdan o'tish bo'yicha batafsil qo'llanma bering — har bir qadamni alohida tushuntiring",
    "✅ Shahodatnoma": "Texnikumda o'qishni tugatgandan keyin shahodatnoma (diplom) olish jarayoni va talablari haqida ma'lumot bering",
    "💵 Kontrakt to'lov": "Kontrakt to'lov miqdorlari, to'lov usullari (online va offline) va to'lov muddatlari haqida to'liq ma'lumot bering",
    "📱 Aloqa": "Texnikumning barcha aloqa ma'lumotlari: telefon, email, manzil, telegram, ijtimoiy tarmoqlar",
    "🧠 Maslahatlar": "Texnikumga qabul bo'lmoqchi bo'lgan abituriyentlarga eng muhim va foydali maslahatlar bering",
    
    "📄 Ta'lim yo'nalishlari": "Texnikumdagi barcha ta'lim yo'nalishlari: nomlari, davomiyligi, kontrakt narxi va imkoniyatlar haqida to'liq ma'lumot",
    "🎓 Qabul 2026–2027": "2026-2027 o'quv yili uchun qabul shartlari, muddatlari, test fanlari va zaruriy hujjatlar haqida batafsil",
    "📝 Qabul arizalari": "Qabul uchun ariza topshirish tartibi: online va offline usullar, my.edu.uz orqali qanday ariza beriladi",
    "📱 Elektron kutubxona": "Texnikumning elektron kutubxona ilovasi: qanday yuklab olish, qanday foydalanish va qanday resurslar mavjud",
    "📚 Kutubxona": "Surxondaryo Yuridik Texnikumi kutubxonasi: manzil, ish vaqti, mavjud kitoblar fondi va foydalanish tartibi",
    "💳 Loyihalar": "Texnikumning faol loyihalari, talabalar tashabbuslar, musobaqalar va ijtimoiy tadbirlar haqida",
    "🏠 Yotoqxona & Stipendiya": "Yotoqxona narxlari, sharoitlari va stipendiya miqdorlari haqida batafsil ma'lumot bering",
    "🎁 Imtiyozlar": "Qabul jarayonida qanday imtiyozlar mavjud va kimlar foydalanishi mumkin — to'liq ro'yxat bering",
  },

  // ─── TELEGRAM MENYU BUYRUQLARI (chap pastdagi Menu tugmasi) ─
  BOT_COMMANDS: [
    { command: "start", description: "Botni ishga tushirish" },
    { command: "menu", description: "Bosh menyu" },
    { command: "help", description: "Yordam" },
    { command: "qr", description: "QR kod yaratish" },
    { command: "clear", description: "Suhbat tarixini tozalash" },
  ],

  // ─── BOT TAVSIFI (What can this bot do?) ───────────────────
  BOT_DESCRIPTION: `Yuridik texnikum o'quvchilari uchun yanada qulaylik yaratish maqsadida ishlab chiqilgan!
Quyidagi ijtimoiy tarmoqlarda bizni kuzatib boring va yangiliklardan xabardor bo'lib boring:

📘 Facebook: https://www.facebook.com/surslofficial

📸 Instagram: https://www.instagram.com/surslofficial

▶️ YouTube: https://www.youtube.com/@surslofficial

🌐 Texnikum sayti: https://www.sursl.uz

✈️ Telegram kanali: https://t.me/surslofficial`,

  // ─── QISQA TAVSIF (Bio / About) ───────────────────────────
  BOT_SHORT_DESCRIPTION: "Surxondaryo yuridik texnikumining rasmiy axborot va AI yordamchi boti.",

  // ─── BOSHQA MATNLAR ────────────────────────────────────────
  SAVOLIM_BOR_TEXT: "Iltimos, o'z savolingizni yozib yuboring! Men o'zbek tilida tushunarli va aniq javob berishga harakat qilaman. 🤝",
  BOSH_MENYU_TEXT: "🏠 *Bosh menyu* — kerakli bo'limni tanlang:",
  XIZMATLAR_TEXT: "⚙️ *Asosiy xizmatlar* — bo'limni tanlang:",
  CLEAR_TEXT: "🧹 Suhbat tarixi tozalandi. Yangi savol berishingiz mumkin.",
};
