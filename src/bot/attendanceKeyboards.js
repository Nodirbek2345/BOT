const { mainMenuKeyboard } = require("./keyboards");

/**
 * Talabalar ro'yxati (Davomat uchun)
 * Har bir talaba yonida ✅ yoki ❌ tugmasi bo'ladi
 */
function getAttendanceKeyboard(group, date, attendanceData) {
    const inline_keyboard = [];

    group.students.forEach(student => {
        const status = attendanceData[student.id]; // 'present' | 'absent' | undefined
        let icon = '⬜'; // Belgilanmagan
        if (status === 'present') icon = '✅';
        if (status === 'absent') icon = '❌';

        // Tugma bosilganda status o'zgaradi: null -> present -> absent -> null (yoki present <-> absent)
        inline_keyboard.push([
            { text: `${student.name}`, callback_data: `noop` },
            { text: `${icon}`, callback_data: `davomat_toggle_${group.id}_${date}_${student.id}` }
        ]);
    });

    // Saqlash tugmasi
    inline_keyboard.push([{ text: '💾 Yakunlash', callback_data: 'davomat_finish' }]);

    return { inline_keyboard };
}

function getGroupsReplyKeyboard(groups) {
    const keyboard = [];
    for (let i = 0; i < groups.length; i += 2) {
        const row = [{ text: groups[i].name }];
        if (groups[i + 1]) {
            row.push({ text: groups[i + 1].name });
        }
        keyboard.push(row);
    }
    // Ortga
    keyboard.push([{ text: '🔙 Orqaga' }]);
    
    return { 
        keyboard,
        resize_keyboard: true 
    };
}

/**
 * Davomat asosiy menyusi
 */
function getDavomatMenu() {
    return {
        keyboard: [
            [{ text: '📋 Davomat qilish' }, { text: '📊 Oy hisoboti' }],
            [{ text: '⬅️ Chiqish' }]
        ],
        resize_keyboard: true
    };
}

module.exports = {
    getAttendanceKeyboard,
    getGroupsReplyKeyboard,
    getDavomatMenu
};
