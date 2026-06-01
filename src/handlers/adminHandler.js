// ═══════════════════════════════════════════════════════
//  ADMIN HANDLER — Telegram orqali bot boshqaruvi
//  Premium: Cheksiz ichma-ich menyular formati
// ═══════════════════════════════════════════════════════
const db = require("../utils/db");
const logger = require("../utils/logger");

const adminStates = new Map();

function registerAdminHandler(bot) {
  bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!db.isAdmin(userId)) return bot.sendMessage(chatId, "🚫 Sizda admin huquqi yo'q.");

    logger.info(`🔑 Admin panel ochildi: ${msg.from.first_name} [${userId}]`);
    adminStates.set(chatId, { currentFolder: "root" });
    return sendFolderView(bot, chatId, "root");
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!data.startsWith("admin_")) return;
    if (!db.isAdmin(userId)) return bot.answerCallbackQuery(query.id, { text: "🚫 Admin huquqi yo'q", show_alert: true });
    await bot.answerCallbackQuery(query.id);

    const state = adminStates.get(chatId) || { currentFolder: "root" };

    // ── ROOT PANEL ──
    if (data === "admin_cancel") {
      state.action = null;
      state.buttonId = null;
      state.tempName = null;
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return sendFolderView(bot, chatId, state.currentFolder);
    }

    if (data === "admin_close") {
      adminStates.delete(chatId);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, "✅ Admin paneldan chiqildi. Oddiy xizmatlardan foydalanishingiz mumkin.", { reply_markup: require("../bot/keyboards").buildKeyboard("root") });
    }

    if (data === "admin_settings") {
      state.currentFolder = "settings";
      adminStates.set(chatId, state);
      return sendSettingsView(bot, chatId, query.message.message_id);
    }

    if (data === "admin_panel") {
      state.currentFolder = "root";
      adminStates.set(chatId, state);
      return sendFolderView(bot, chatId, "root", query.message.message_id);
    }

    // ── ROOT PANEL ──
    if (data === "admin_broadcast_ask") {
      state.action = "broadcast_wait";
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, "📲 Barcha obunachilarga tarqatmoqchi bo'lgan xabaringizni yuboring (Matn, Rasm, Video yoki Fayl qabul qilinadi):", { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }

    // ── STATS & ADMINS ──
    if (data === "admin_stats") return sendStats(bot, chatId, query.message.message_id);
    if (data === "admin_admins") return sendAdminsMenu(bot, chatId, query.message.message_id);
    if (data === "admin_add_admin") {
      state.action = "add_admin";
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, "👤 Yangi admin Telegram ID sini yozing:\n\nFoydalanuvchining ID sini olish uchun @userinfobot ga yuboring.", { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }
    if (data.startsWith("admin_rmadmin_")) {
      const adminId = parseInt(data.replace("admin_rmadmin_", ""));
      if (adminId === userId) return bot.editMessageText("⚠️ O'zingizni admin ro'yxatidan olib tashlay olmaysiz!", { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: [[{ text: "🔙 Orqaga", callback_data: "admin_admins" }]] } });
      db.removeAdmin(adminId);
      return sendAdminsMenu(bot, chatId, query.message.message_id);
    }

    // ── QO'SHISH ──
    if (data === "admin_add_answer") {
      state.action = "add_answer_name";
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, `ℹ️ Menyu qutisi ichiga yangi **Javob** matni qo'shyapmiz.\n\nTugma nomini yozing (emoji bilan):`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }
    if (data === "admin_add_menu") {
      state.action = "add_menu_name";
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, `📁 Yangi **Papka (Ichki menyu)** qo'shyapmiz.\n\nPapka nomini (klaviaturadagi yozuvni) yozing:`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }

    // ── PAPKAGA KIRISH & ORQAGA ──
    if (data.startsWith("admin_open_")) {
      const folderId = data.replace("admin_open_", "");
      state.currentFolder = folderId;
      adminStates.set(chatId, state);
      return sendFolderView(bot, chatId, folderId, query.message.message_id);
    }
    if (data === "admin_up") {
      if (state.currentFolder !== "root") {
        const currentBtn = db.findButtonById(state.currentFolder);
        state.currentFolder = currentBtn ? currentBtn.parentId : "root";
        adminStates.set(chatId, state);
      }
      return sendFolderView(bot, chatId, state.currentFolder, query.message.message_id);
    }

    // ── TUGMANI BOSHQARISH ──
    if (data.startsWith("admin_editbtn_")) {
      const btnId = data.replace("admin_editbtn_", "");
      return sendButtonManage(bot, chatId, btnId, query.message.message_id);
    }

    // ── TUGMA TURINI O'ZGARTIRISH ──
    if (data.startsWith("admin_toggletype_")) {
      const btnId = data.replace("admin_toggletype_", "");
      const updatedBtn = db.toggleButtonType(btnId);
      if (updatedBtn) {
        try { await bot.answerCallbackQuery(query.id, { text: "Tugma tag-turi o'zgartirildi!" }); } catch (e) { }
        return sendButtonManage(bot, chatId, btnId, query.message.message_id);
      }
    }

    // ── NOM/JAVOB TAHRIRLASH ──
    if (data.startsWith("admin_editname_")) {
      const btnId = data.replace("admin_editname_", "");
      const btn = db.findButtonById(btnId);
      state.action = "edit_name";
      state.buttonId = btnId;
      adminStates.set(chatId, state);
      return bot.sendMessage(chatId, `✏️ *"${btn ? btn.text : ""}"* uchun yangi nomni yozing:`, {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true, selective: true, input_field_placeholder: "Yangi nom..." }
      });
    }
    if (data.startsWith("admin_editcontent_")) {
      const btnId = data.replace("admin_editcontent_", "");
      const btn = db.findButtonById(btnId);
      state.action = "edit_content";
      state.buttonId = btnId;
      adminStates.set(chatId, state);
      return bot.sendMessage(chatId, `📝 *"${btn ? btn.text : ""}"* uchun yangi matn yoki fayl yuboring:`, {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true, selective: true, input_field_placeholder: "Yangi matn..." }
      });
    }
    if (data.startsWith("admin_editcaption_")) {
      const btnId = data.replace("admin_editcaption_", "");
      const btn = db.findButtonById(btnId);
      state.action = "edit_caption_only";
      state.buttonId = btnId;
      adminStates.set(chatId, state);
      return bot.sendMessage(chatId, `💬 *"${btn ? btn.text : ""}"* faylining yangi tag-so'zini yozing:`, {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true, selective: true, input_field_placeholder: "Yangi caption..." }
      });
    }

    // ── SOZLAMALAR TAHRIRI ──
    if (data === "admin_edit_welcome") {
      state.action = "edit_welcome";
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, "✍️ Yangi xush kelibsiz (Bosh) xabarini yozing.\n\nFoydalanuvchi ismini chiqarish uchun `{name}` deb yozing.\n\n(Matn, rasm yoki video yuborishingiz mumkin):", { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }
    if (data === "admin_edit_botname") {
      state.action = "edit_botname";
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, "🤖 Botning yangi ismini yozing (Masalan: Surxondaryo yuridik texnikumi):", { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }
    if (data === "admin_edit_botbio") {
      state.action = "edit_botbio";
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return bot.sendMessage(chatId, "ℹ️ Botning qisqacha tavsifini (Bio) yozing:", { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }

    // ── O'CHIRISH ──
    if (data.startsWith("admin_delbtn_")) {
      const btnId = data.replace("admin_delbtn_", "");
      const btn = db.findButtonById(btnId);
      if (btn) {
        state.action = "confirm_delete";
        state.buttonId = btnId;
        adminStates.set(chatId, state);
        return bot.editMessageText(
          `🗑 *"${btn.text}"* ni haqiqatdan ham o'chirmoqchimisiz?\n\n(Agar bu papka bo'lsa ichidagi hamma narsa o'chib ketadi!)`,
          {
            chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Ha, o'chirish", callback_data: `admin_confirm_del_${btnId}` }],
                [{ text: "❌ Bekor qilish", callback_data: `admin_open_${state.currentFolder}` }]
              ]
            }
          }
        );
      }
    }
    if (data.startsWith("admin_confirm_del_")) {
      const btnId = data.replace("admin_confirm_del_", "");
      db.removeButton(btnId);
      state.action = null;
      adminStates.set(chatId, state);
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
      return sendSuccess(bot, chatId, "🗑 Tugma muvaffaqiyatli o'chirildi!", state.currentFolder);
    }

    // ── KO'CHIRISH (MOVE) ──
    if (data.startsWith("admin_move_")) {
      const btnId = data.replace("admin_move_", "");
      const btnToMove = db.findButtonById(btnId);
      if (!btnToMove) return;

      const allBtns = db.getAllButtons();
      const allMenus = allBtns.filter(b => b.type === "menu" && b.id !== btnId);

      let text = `🚚 *"${btnToMove.text}"* ni qaysi papkaga ko'chirmoqchisiz?`;
      const keyboard = [];

      // Root opsiyasi
      if (btnToMove.parentId !== "root") {
        keyboard.push([{ text: "🏠 Bosh menyuga (Root)", callback_data: `admin_cfm_move_${btnId}::root` }]);
      }

      allMenus.forEach(m => {
        if (btnToMove.parentId !== m.id) {
          keyboard.push([{ text: `📁 ${m.text}`, callback_data: `admin_cfm_move_${btnId}::${m.id}` }]);
        }
      });
      keyboard.push([{ text: "❌ Bekor qilish", callback_data: `admin_editbtn_${btnId}` }]);

      try {
        await bot.editMessageText(text, { chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
      } catch (e) { }
      return;
    }

    if (data.startsWith("admin_cfm_move_")) {
      const payload = data.replace("admin_cfm_move_", "");
      const sepIdx = payload.indexOf("::");
      if (sepIdx === -1) return;
      const btnId = payload.substring(0, sepIdx);
      const newParentId = payload.substring(sepIdx + 2);

      const btn = db.findButtonById(btnId);
      if (btn) {
        const moved = db.moveButton(btnId, newParentId);
        if (moved) {
          try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) { }
          const parentBtn = db.findButtonById(newParentId);
          const parentName = parentBtn ? parentBtn.text : "🏠 BOSH MENYU";
          return sendSuccess(bot, chatId, `🚚 Yangi joyga ko'chirildi: *${parentName}*`, newParentId);
        }
      }
    }
  });

  bot.on("message", async (msg) => {
    // Media faylni o'qiy olish uchun faqat `/` ni tekshiramiz
    if (msg.text && msg.text.startsWith("/")) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const state = adminStates.get(chatId);
    if (!state || !db.isAdmin(userId) || !state.action) return;

    let text = msg.text ? msg.text.trim() : (msg.caption ? msg.caption.trim() : "");

    function encodeMedia(m) {
      let obj = { type: "text", text: m.text || m.caption || "" };
      if (m.photo) { obj.type = "photo"; obj.file_id = m.photo[m.photo.length - 1].file_id; }
      else if (m.video) { obj.type = "video"; obj.file_id = m.video.file_id; }
      else if (m.document) { obj.type = "document"; obj.file_id = m.document.file_id; }
      if (obj.type === "text") {
        return obj.text || "Ma'lumot kiritilmagan";
      }
      return "MEDIA:" + JSON.stringify(obj);
    }

    // ── TUGMA QO'SHISH (JAVOB) ──
    if (state.action === "add_answer_name") {
      if (!text) return bot.sendMessage(chatId, "⚠️ Tugma nomi bo'sh bo'lishi mumkin emas! Matn yuboring:", { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
      state.action = "add_answer_content";
      state.tempName = text;
      adminStates.set(chatId, state);
      return bot.sendMessage(chatId, `✅ Nom qabul qilindi: *${text}*\n\nEndi tugma bosilganda foydalanuvchiga nima deb javob berishini yozing (rasm, video ham jo'natish mumkin):`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }
    if (state.action === "add_answer_content") {
      const dbContent = encodeMedia(msg);
      db.addButton(state.currentFolder, state.tempName, "answer", dbContent);
      state.action = null;
      adminStates.set(chatId, state);
      return sendSuccess(bot, chatId, `✅ *Javob muvaffaqiyatli qo'shildi!*`, state.currentFolder);
    }

    // ── TUGMA QO'SHISH (PAPKA) ──
    if (state.action === "add_menu_name") {
      if (!text) return bot.sendMessage(chatId, "⚠️ Papka nomi bo'sh bo'lishi mumkin emas! Matn yuboring:", { reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
      state.action = "add_menu_content";
      state.tempName = text;
      adminStates.set(chatId, state);
      return bot.sendMessage(chatId, `📁 Papka nomi qabul qilindi: *${text}*\n\nEndi papkaga kirganida tepadagi sarlavha nima bo'lishini matn shaklida yozing (Masalan: "Quyidagilardan birini tanlang"):`, { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "admin_cancel" }]] } });
    }
    if (state.action === "add_menu_content") {
      db.addButton(state.currentFolder, state.tempName, "menu", text);
      state.action = null;
      adminStates.set(chatId, state);
      return sendSuccess(bot, chatId, `📁 *Papka muvaffaqiyatli qo'shildi!*`, state.currentFolder);
    }

    // ── TAHRIRLASH ──
    if (state.action === "edit_name") {
      db.editButton(state.buttonId, text, undefined);
      state.action = null;
      adminStates.set(chatId, state);
      return sendSuccess(bot, chatId, `✅ Nom o'zgartirildi!`, state.currentFolder);
    }
    if (state.action === "edit_content") {
      const dbContent = encodeMedia(msg);
      db.editButton(state.buttonId, undefined, dbContent);
      state.action = null;
      adminStates.set(chatId, state);
      return sendSuccess(bot, chatId, `✅ Javob muvaffaqiyatli o'zgartirildi!`, state.currentFolder);
    }
    if (state.action === "edit_caption_only" && text) {
      const btn = db.findButtonById(state.buttonId);
      if (btn && btn.content && btn.content.startsWith("MEDIA:")) {
        try {
          const m = JSON.parse(btn.content.replace("MEDIA:", ""));
          m.text = text;
          db.editButton(state.buttonId, undefined, "MEDIA:" + JSON.stringify(m));
        } catch (e) { }
      }
      state.action = null;
      adminStates.set(chatId, state);
      return sendSuccess(bot, chatId, `✅ Tag-so'z muvaffaqiyatli o'zgartirildi! (Fayl joyida qoldi)`, state.currentFolder);
    }

    // ── SOZLAMALAR ──
    if (state.action === "edit_welcome") {
      const dbContent = encodeMedia(msg);
      db.setSetting("welcome_text", dbContent);
      state.action = null;
      state.currentFolder = "settings";
      adminStates.set(chatId, state);
      return sendSuccess(bot, chatId, `✅ Bosh xabar muvaffaqiyatli o'zgartirildi!`, "settings");
    }
    if (state.action === "edit_botname") {
      if (!text) return bot.sendMessage(chatId, "⚠️ Ism bo'sh bo'lishi mumkin emas!");

      try {
        await fetch(`https://api.telegram.org/bot${bot.token}/setMyName`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: text })
        });
        db.setSetting("bot_name", text);
        state.action = null;
        state.currentFolder = "settings";
        adminStates.set(chatId, state);
        return sendSuccess(bot, chatId, `✅ Bot ismi muvaffaqiyatli *${text}* ga o'zgartirildi!`, "settings");
      } catch (e) {
        return bot.sendMessage(chatId, `❌ Xatolik yuz berdi: ${e.message}`);
      }
    }
    if (state.action === "edit_botbio") {
      if (!text) return bot.sendMessage(chatId, "⚠️ Bio bo'sh bo'lishi mumkin emas!");

      try {
        await fetch(`https://api.telegram.org/bot${bot.token}/setMyShortDescription`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ short_description: text })
        });
        db.setSetting("bot_bio", text);
        state.action = null;
        state.currentFolder = "settings";
        adminStates.set(chatId, state);
        return sendSuccess(bot, chatId, `✅ Bot qisqa ta'rifi (Bio) muvaffaqiyatli o'zgartirildi!`, "settings");
      } catch (e) {
        return bot.sendMessage(chatId, `❌ Xatolik yuz berdi: ${e.message}`);
      }
    }

    // ── ADMIN QO'SHISH ──
    if (state.action === "add_admin") {
      const newId = parseInt(text);
      if (isNaN(newId)) return bot.sendMessage(chatId, "❌ Noto'g'ri ID. Tarmoqdan chiqildi qiling.");
      const added = db.addAdmin(newId);
      state.action = null;
      adminStates.set(chatId, state);
      const textResponse = added ? `✅ Yangi admin qo'shildi: ${newId}` : `⚠️ Allaqaqchon admin.`;
      return sendSuccess(bot, chatId, textResponse, "root");
    }

    // ── XABAR TARQATISH (BROADCAST) ──
    if (state.action === "broadcast_wait") {
      state.action = null;
      adminStates.set(chatId, state);

      const users = db.getAllUsers();
      bot.sendMessage(chatId, `⏳ Xabar tarqatish boshlandi... Jami: ${users.length} ta obunachiga.`);

      let successCount = 0;
      let blockCount = 0;

      const broadcast = async () => {
        for (const uid of users) {
          try {
            let opts = {};
            if (msg.caption) opts.caption = msg.caption;

            if (msg.photo) {
              await bot.sendPhoto(uid, msg.photo[msg.photo.length - 1].file_id, opts);
            } else if (msg.video) {
              await bot.sendVideo(uid, msg.video.file_id, opts);
            } else if (msg.document) {
              await bot.sendDocument(uid, msg.document.file_id, opts);
            } else {
              await bot.sendMessage(uid, msg.text || "Xabar qabul qilinmadi.");
            }
            successCount++;
          } catch (e) {
            blockCount++;
            if (e.response && e.response.statusCode === 403) {
              db.setUserStatus(uid, false);
            }
          }
          await new Promise(r => setTimeout(r, 50)); // Tebranish oldini olish
        }
        bot.sendMessage(chatId, `✅ Xabar yuborish tugallandi.\n\nYetib bordi: ${successCount}\nBloklaganlar: ${blockCount}`, { reply_markup: { inline_keyboard: [[{ text: "🔙 Panelga qaytish", callback_data: "admin_panel" }]] } });
      };

      broadcast();
      return;
    }
  });
}

// ── RENDER FUNKSIYALARI ──

async function sendSuccess(bot, chatId, text, currentFolder) {
  const keyboard = [];
  if (currentFolder === "settings") {
    keyboard.push([{ text: "⚙️ Sozlamalarga qaytish", callback_data: `admin_settings` }]);
  } else {
    keyboard.push([{ text: "📁 Yana davom etish", callback_data: `admin_open_${currentFolder}` }]);
  }
  keyboard.push([{ text: "🚪 Admindan chiqish", callback_data: "admin_close" }]);

  return bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

async function sendSettingsView(bot, chatId, messageId) {
  const text = `⚙️ **UMUMIY SOZLAMALAR**\n\nBu yerdan botning asosiy ma'lumotlarini (ism, profil tavsifi, xush kelibsiz matni) to'g'ridan-to'g'ri Telegram bazasida o'zgartirishingiz mumkin.`;

  const keyboard = [
    [{ text: "✏️ Bot ismini o'zgartirish", callback_data: "admin_edit_botname" }],
    [{ text: "ℹ️ Bot qisqacha tavsifini (Bio) o'zgartirish", callback_data: "admin_edit_botbio" }],
    [{ text: "✉️ Bosh (Xush kelibsiz) xabarni tahrirlash", callback_data: "admin_edit_welcome" }],
    [{ text: "🔙 Panelga qaytish", callback_data: "admin_panel" }]
  ];

  try {
    if (messageId) {
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
    } else {
      await bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
    }
  } catch (e) { }
}

async function sendFolderView(bot, chatId, folderId, messageId) {
  const currentBtn = folderId === "root" ? null : db.findButtonById(folderId);
  const folderName = currentBtn ? currentBtn.text : "🏠 BOSH MENYU";
  const buttons = db.getButtonsByParent(folderId);

  let text = `📂 **Hozirgi joy:** ${folderName}\n\nO'zgartirish kiritmoqchi bo'lgan qismini tanlang:\n`;

  const keyboard = [];

  // Qutidagi mavjud narsalar (list)
  buttons.forEach(b => {
    const icon = b.type === "menu" ? "📁" : "📄";
    keyboard.push([{ text: `${icon} ${b.text}`, callback_data: `admin_editbtn_${b.id}` }]);
  });

  // Qo'shish funksiyalari
  keyboard.push([
    { text: "➕ Yangi javob qo'shish", callback_data: "admin_add_answer" },
    { text: "➕ Yangi ichki papka", callback_data: "admin_add_menu" }
  ]);

  if (folderId !== "root") {
    keyboard.push([{ text: "🔙 Yuqoriga qaytish", callback_data: "admin_up" }]);
  } else {
    keyboard.push([
      { text: "👥 Barcha Adminlar", callback_data: "admin_admins" },
      { text: "📊 Statistika", callback_data: "admin_stats" }
    ]);
    keyboard.push([{ text: "📨 Hammaga xabar tarqatish", callback_data: "admin_broadcast_ask" }]);
    keyboard.push([{ text: "⚙️ Umumiy Sozlamalar", callback_data: "admin_settings" }]);
    keyboard.push([{ text: "🚪 Admindan chiqish", callback_data: "admin_close" }]);
  }

  const options = { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } };
  if (messageId) {
    try { await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options }); } catch (e) { }
  } else {
    await bot.sendMessage(chatId, text, options);
  }
}

async function sendButtonManage(bot, chatId, btnId, messageId) {
  const btn = db.findButtonById(btnId);
  if (!btn) return;

  const isMenu = btn.type === "menu";
  const safeContent = btn.content || "";
  const isMedia = safeContent.startsWith("MEDIA:");

  // Hozirgi to'liq matnni ko'rsatish
  let currentText = "";
  if (isMedia) {
    try {
      const m = JSON.parse(safeContent.replace("MEDIA:", ""));
      currentText = m.text || "(bo'sh)";
    } catch (e) { currentText = "(bo'sh)"; }
  } else {
    currentText = safeContent || "(bo'sh)";
  }

  // Matni 300 belgidan oshsa, qisqartirish (Telegram limit)
  const displayText = currentText.length > 300 ? currentText.substring(0, 300) + "..." : currentText;

  let text = `⚙️ **Tugma boshqaruvi**\n\n📌 Nomi: *${btn.text}*\n📂 Turi: ${isMenu ? "📁 Papka" : "📄 Javob matni"}\n\n📝 *Joriy matn:*\n\`\`\`\n${isMedia ? displayText : displayText}\n\`\`\``;

  const keyboard = [];
  if (isMenu) {
    keyboard.push([{ text: "📂 Ichkarisiga kirib boshqarish", callback_data: `admin_open_${btn.id}` }]);
  }

  keyboard.push([{
    text: isMenu ? "📄 Turi: Papkaga emas, Javobga o'tkazish" : "📁 Turi: Javob emas, Papkaga o'tkazish",
    callback_data: `admin_toggletype_${btn.id}`
  }]);

  if (isMedia) {
    keyboard.push([
      { text: "✏️ Nomni o'zgartirish", callback_data: `admin_editname_${btn.id}` },
      { text: "💬 Tag-so'zni (Caption) tahrirlash", callback_data: `admin_editcaption_${btn.id}` }
    ]);
    keyboard.push([
      { text: "🔄 Faylni to'liq almashtirish", callback_data: `admin_editcontent_${btn.id}` }
    ]);
  } else {
    keyboard.push([
      { text: "✏️ Nomni o'zgartirish", callback_data: `admin_editname_${btn.id}` },
      { text: "📝 Matn yoki Fayl o'zgartirish", callback_data: `admin_editcontent_${btn.id}` }
    ]);
  }

  keyboard.push([
    { text: "🚚 Boshqa papkaga ko'chirish", callback_data: `admin_move_${btn.id}` }
  ]);
  keyboard.push([
    { text: "🗑 O'chirish (diqqat!)", callback_data: `admin_delbtn_${btn.id}` },
    { text: "🔙 Orqaga", callback_data: `admin_open_${btn.parentId}` }
  ]);

  try {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
  } catch (e) { }
}

async function sendStats(bot, chatId, messageId) {
  const allBtns = db.getAllButtons();
  const menus = allBtns.filter(b => b.type === "menu").length;
  const answers = allBtns.filter(b => b.type === "answer").length;
  const admins = db.getAdmins();
  const userStats = db.getUserStats();

  const text = [
    "📊 *BOT STATISTIKASI*\n",
    `👥 *Foydalanuvchilar:* ${userStats.total}`,
    `🟢 *Faol:* ${userStats.activeCount}`,
    `🔴 *O'chirilgan (Block):* ${userStats.deletedCount}\n`,
    `📁 *Ichki papkalar jami:* ${menus}`,
    `📄 *Javob xabarlari jami:* ${answers}`,
    `👤 *Adminlar soni:* ${admins.length}`,
    `🆔 *Admin IDlar:* ${admins.join(", ")}`,
  ].join("\n");

  try {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🔙 Panelga qaytish", callback_data: "admin_panel" }]] } });
  } catch (e) { }
}

async function sendAdminsMenu(bot, chatId, messageId) {
  const admins = db.getAdmins();
  let text = "👤 *Adminlar*\n\n";
  admins.forEach((id, i) => { text += `${i + 1}. \`${id}\`\n`; });
  const buttons = admins.map(id => ([{ text: `❌ ${id} ni o'chirish`, callback_data: `admin_rmadmin_${id}` }]));
  buttons.push([{ text: "➕ Admin qo'shish", callback_data: "admin_add_admin" }]);
  buttons.push([{ text: "🔙 Panel", callback_data: "admin_panel" }]);

  try {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: { inline_keyboard: buttons } });
  } catch (e) { }
}

module.exports = { registerAdminHandler, adminStates };
