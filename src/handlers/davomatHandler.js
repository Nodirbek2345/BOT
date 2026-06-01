// ═══════════════════════════════════════════════════════
//  DAVOMAT HANDLER — Davomat tizimi logikasi
// ═══════════════════════════════════════════════════════

const service = require('../services/attendanceService');
const keyboards = require('../bot/attendanceKeyboards');
const { mainMenuKeyboard } = require('../bot/keyboards');
const config = require('../config');
const logger = require('../utils/logger');

// Cache session status locally for text handlers.
// Aslida getSession ishlatsak ham bo'ladi, men oddiy map qildim.
const authSessions = new Set();

/**
 * Parolni tekshirish
 */
async function handleAuthEntry(bot, msg) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (service.verifyAccess(chatId, text)) {
        authSessions.add(chatId);
        await bot.sendMessage(chatId, "✅ Parol qabul qilindi. Davomat bo‘limi ochildi.", {
            reply_markup: keyboards.getDavomatMenu()
        });
        // Remove password msg if possible to stay secure
        try { await bot.deleteMessage(chatId, msg.message_id); } catch (e) { }
        return true;
    }
    
    await bot.sendMessage(chatId, "❌ Parol noto‘g‘ri. Davomat tizimiga kirish bekor qilindi. Bosh menyu uchun /menu.");
    return false;
}

/**
 * Text menyusidagi davomat buyruqlarini qayta ishlash
 */
async function handleDavomatCommands(bot, msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    const isAuthorized = service.isAuthorized(chatId, authSessions.has(chatId));

    if (!isAuthorized) {
        await bot.sendMessage(chatId, "🔒 Davomat tizimiga ruxsatingiz yo'q. Bosh menyuga qaytarildi.", {
            reply_markup: mainMenuKeyboard()
        });
        return;
    }

    if (text === '📋 Davomat qilish') {
        const groups = service.getAllGroups();
        if (groups.length === 0) {
            await bot.sendMessage(chatId, "❌ Guruhlar topilmadi.");
            return;
        }

        // Hamma uchun guruh tanlash (Admin bo'ladimi yo'qmi)
        await bot.sendMessage(chatId, "📋 Qaysi guruh uchun davomat qilmoqchisiz?", {
            reply_markup: keyboards.getGroupsReplyKeyboard(groups)
        });
        return;
    }

    // Checking if text is a known group name (Reply Keyboard Selection)
    const groups = service.getAllGroups();
    const selectedGroup = groups.find(g => g.name === text);
    if (selectedGroup) {
        const today = new Date().toLocaleDateString('uz-UZ', {timeZone: 'Asia/Tashkent'}).split('.').reverse().join('-');
        const currentData = {};
        selectedGroup.students.forEach(s => {
            currentData[s.id] = service.getStudentStatus(selectedGroup.id, today, s.id);
        });

        await bot.sendMessage(chatId, `📅 *Davomat:* ${today}\n👥 *Guruh:* ${selectedGroup.name}\n\nBelgilash uchun ismlar yonidagi kvadratlarni bosing:`, {
            parse_mode: 'Markdown',
            reply_markup: keyboards.getAttendanceKeyboard(selectedGroup, today, currentData)
        });
        return;
    }

    if (text === '🔙 Orqaga') {
        await bot.sendMessage(chatId, "📋 Davomat menyusidasiz:", {
            reply_markup: keyboards.getDavomatMenu()
        });
        return;
    }

    if (text === '📊 Oy hisoboti') {
        const group = service.getGroup(chatId); // gets first or assigned group
        if (!group) {
            await bot.sendMessage(chatId, "❌ Guruh yo'q.");
            return;
        }

        const report = service.getMonthlyReport(group.id);
        if (!report) {
            await bot.sendMessage(chatId, "📊 Hisobot bo'sh.");
            return;
        }

        let reportMsg = `📊 *Davomat Hisoboti: ${report.groupName}*\n\n`;
        let count = 0;

        Object.keys(report.absences).forEach(studentId => {
            const student = report.students.find(s => s.id == studentId);
            if (student) {
                reportMsg += `${count + 1}. ${student.name} — *${report.absences[studentId]}* kun qoldirdi\n`;
                count++;
            }
        });

        if (count === 0) reportMsg += "✅ Barcha talabalar to'liq kelgan!";

        await bot.sendMessage(chatId, reportMsg, { parse_mode: "Markdown" });
        return; // Fixed typo
    }

    if (text === '⬅️ Chiqish') {
        authSessions.delete(chatId);
        await bot.sendMessage(chatId, "🏠 Asosiy menyuga qaytildi.", {
            reply_markup: { remove_keyboard: true }
        });
        await bot.sendMessage(chatId, "📋 Kerakli bo'limni tanlang:", {
            reply_markup: mainMenuKeyboard()
        });
        return;
    }

    // Noma'lum davomat
    await bot.sendMessage(chatId, "Davomat menyusidasiz:", {
        reply_markup: keyboards.getDavomatMenu()
    });
}

/**
 * Davomat callbacklarini qayta ishlash
 */
async function handleDavomatCallback(bot, query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    // Toggle tugmasi `davomat_toggle_GROUPID_DATE_STUDENTID`
    if (data.startsWith('davomat_toggle_')) {
        const parts = data.split('_');
        const groupId = parts[2];
        const date = parts[3];
        const studentId = parts[4];

        // Statusni o'zgartirish
        const currentStatus = service.getStudentStatus(groupId, date, studentId);
        let newStatus = 'present';
        if (currentStatus === 'present') newStatus = 'absent';
        if (currentStatus === 'absent') newStatus = null; // Reset status back to empty
        if (!currentStatus) newStatus = 'present';

        service.markAttendance(groupId, date, studentId, newStatus);

        // UI-ni yangilash
        const group = service.getGroupById(groupId);
        const currentData = {};
        group.students.forEach(s => {
            currentData[s.id] = service.getStudentStatus(group.id, date, s.id);
        });

        try {
            await bot.editMessageReplyMarkup(keyboards.getAttendanceKeyboard(group, date, currentData), {
                chat_id: chatId,
                message_id: messageId
            });
        } catch (e) {
            // Unmodified xatolikni yashirish
        }
        await bot.answerCallbackQuery(query.id);
        return true;
    }

    if (data === 'davomat_finish') {
        try { await bot.deleteMessage(chatId, messageId); } catch(e) {}
        await bot.sendMessage(chatId, "✅ Davomat yakunlandi va yopildi.");
        await bot.answerCallbackQuery(query.id);
        return true;
    }

    return false;
}

module.exports = {
    handleDavomatCommands,
    handleDavomatCallback,
    handleAuthEntry
};
