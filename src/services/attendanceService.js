const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DATA_PATH = path.join(DATA_DIR, 'attendance.json');

class AttendanceService {
    constructor() {
        this.data = this._loadData();
    }

    _loadData() {
        try {
            if (!fs.existsSync(DATA_PATH)) {
                return { groups: [], attendance: {}, authorized_users: [] };
            }
            return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        } catch (e) {
            console.error('Attendance data load error:', e);
            return { groups: [], attendance: {}, authorized_users: [] };
        }
    }

    _saveData() {
        try {
            fs.writeFileSync(DATA_PATH, JSON.stringify(this.data, null, 2));

            // Cloud backup (agar db.js ulanib bo'lgan bo'lsa)
            try {
                const db = require('../utils/db');
                if (db.backupAttendanceToTelegram) {
                    db.backupAttendanceToTelegram(this.data).catch(err => {
                        console.error('☁️ Attendance cloud backup xato:', err.message);
                    });
                }
            } catch (e) { }
        } catch (e) {
            console.error('Attendance data save error:', e);
        }
    }

    /**
     * Kod orqali kirishni tekshirish
     * @param {number} userId 
     * @param {string} code 
     */
    verifyAccess(userId, code) {
        if (code === config.DAVOMAT_CODE) {
            if (!this.data.authorized_users.includes(userId)) {
                this.data.authorized_users.push(userId);
                this._saveData();
            }
            return true;
        }
        return false;
    }

    /**
     * Foydalanuvchi tizimga kirganmi? (Sessiya asosida)
     * @param {number} userId 
     * @param {object} session - user status in map
     */
    isAuthorized(userId, isAuthSession) {
        if (this.data.authorized_users.includes(userId)) return true;
        return isAuthSession === true;
    }

    /**
     * Yetakchining guruhini olish
     * @param {number} userId 
     */
    getGroup(userId) {
        return this.data.groups.find(g => g.leaderId === userId) || this.data.groups[0];
    }

    /**
     * Barcha guruhlarni olish
     */
    getAllGroups() {
        return this.data.groups;
    }

    /**
     * Guruhni ID bo'yicha olish
     */
    getGroupById(groupId) {
        return this.data.groups.find(g => g.id === groupId);
    }

    /**
     * Davomat qilish
     * @param {string} groupId 
     * @param {string} date (YYYY-MM-DD)
     * @param {number} studentId 
     * @param {string} status ('present' | 'absent')
     */
    markAttendance(groupId, date, studentId, status) {
        if (!this.data.attendance[groupId]) {
            this.data.attendance[groupId] = {};
        }
        if (!this.data.attendance[groupId][date]) {
            this.data.attendance[groupId][date] = {};
        }

        this.data.attendance[groupId][date][studentId] = status;
        this._saveData();
    }

    /**
     * Talabaning bugungi holati
     */
    getStudentStatus(groupId, date, studentId) {
        try {
            return this.data.attendance[groupId][date][studentId];
        } catch (e) {
            return null; // Not marked yet
        }
    }

    /**
     * Oylik hisobotni olish
     */
    getMonthlyReport(groupId) {
        const group = this.getGroupById(groupId);
        if (!group) return null;

        let report = {};
        const groupAttendance = this.data.attendance[groupId] || {};

        // Iterate dates
        Object.keys(groupAttendance).forEach(date => {
            const dayRecords = groupAttendance[date];
            Object.keys(dayRecords).forEach(studentId => {
                if (dayRecords[studentId] === 'absent') {
                    if (!report[studentId]) report[studentId] = 0;
                    report[studentId]++;
                }
            });
        });

        return {
            groupName: group.name,
            absences: report, // { studentId: count }
            students: group.students
        };
    }

    // Copy data helper for init
    setInitialData(data) {
        this.data = data;
        this._saveData();
    }
}

module.exports = new AttendanceService();
