// helpers/reportUtils.js

const dayjs = require('dayjs');
const { getLastWeekRange, getLastMonthRange, getCurrentTime, getCurrentTimeJalili } = require('./timeUtils');

/**
 * Loads attendance records from Attendance.json.
 * @param {string} attendancePath - Path to Attendance.json
 * @returns {Array} - Array of attendance entries.
 */
function loadAttendance(attendancePath) {
    const fs = require('fs');
    try {
        if (!fs.existsSync(attendancePath)) {
            fs.writeFileSync(attendancePath, JSON.stringify([]));
            return [];
        }
        const data = fs.readFileSync(attendancePath, 'utf8');
        const parsedData = JSON.parse(data);
        if (Array.isArray(parsedData)) {
            return parsedData;
        } else {
            console.warn('Attendance.json is not an array. Resetting to an empty array.');
            fs.writeFileSync(attendancePath, JSON.stringify([]));
            return [];
        }
    } catch (err) {
        console.error('Error reading Attendance.json:', err);
        fs.writeFileSync(attendancePath, JSON.stringify([]));
        return [];
    }
}

/**
 * Saves attendance records to Attendance.json.
 * @param {string} attendancePath - Path to Attendance.json
 * @param {Array} attendance - Array of attendance entries.
 */
function saveAttendance(attendancePath, attendance) {
    const fs = require('fs');
    try {
        fs.writeFileSync(attendancePath, JSON.stringify(attendance, null, 2));
    } catch (err) {
        console.error('Error writing to Attendance.json:', err);
    }
}

/**
 * Calculates total work time and total attendance days for a user within a date range.
 * @param {string} rfid - User's RFID tag.
 * @param {string} startDate - Start date in Jalali format (jYYYY-jMM-jDD).
 * @param {string} endDate - End date in Jalali format (jYYYY-jMM-jDD).
 * @param {Array} attendance - Array of attendance entries.
 * @returns {Object} - { totalWorkTime: "HH:mm", totalDays: number }
 */
function calculateReport(rfid, startDate, endDate, attendance) {
    // Filter entries for the specific user and date range
    const userEntries = attendance.filter(entry => {
        if (entry.rfid !== rfid) return false;
        const entryDate = entry.time.split(' ')[0]; // Extract date part
        return entryDate >= startDate && entryDate <= endDate;
    });

    // Sort entries by time
    userEntries.sort((a, b) => {
        return dayjs(a.time, 'jYYYY-jMM-jDD HH:mm') - dayjs(b.time, 'jYYYY-jMM-jDD HH:mm');
    });

    let totalMinutes = 0;
    const attendanceDays = new Set();

    for (let i = 0; i < userEntries.length; i++) {
        const entry = userEntries[i];
        if (entry.action === 'Enter') {
            const enterTime = dayjs(entry.time, 'jYYYY-jMM-jDD HH:mm');
            // Find the next 'Exit' entry
            const exitEntry = userEntries.find(e => e.action === 'Exit' && dayjs(e.time, 'jYYYY-jMM-jDD HH:mm').isAfter(enterTime));
            if (exitEntry) {
                const exitTime = dayjs(exitEntry.time, 'jYYYY-jMM-jDD HH:mm');
                const diff = exitTime.diff(enterTime, 'minute');
                totalMinutes += diff;
                attendanceDays.add(entry.time.split(' ')[0]); // Add the day
                // Skip to the exit entry
                i = userEntries.indexOf(exitEntry);
            }
        }
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalWorkTime = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
    const totalDays = attendanceDays.size;

    return { totalWorkTime, totalDays };
}

/**
 * Generates a report for all users within a date range.
 * @param {string} startDate - Start date in Jalali format.
 * @param {string} endDate - End date in Jalali format.
 * @param {Array} attendance - Array of attendance entries.
 * @returns {Object} - { startDate, endDate, reports: [{ rfid, name, totalWorkTime, totalDays }, ...] }
 */
function generateReport(startDate, endDate, attendance) {
    const uniqueUsers = [...new Set(attendance.map(entry => entry.rfid))];
    const reports = uniqueUsers.map(rfid => {
        const userName = attendance.find(entry => entry.rfid === rfid)?.name || 'Unknown';
        const { totalWorkTime, totalDays } = calculateReport(rfid, startDate, endDate, attendance);
        return { rfid, name: userName, totalWorkTime, totalDays };
    });
    return { startDate, endDate, reports };
}

/**
 * Generates a **last week** report.
 * @param {string} attendancePath - Path to Attendance.json
 * @returns {Object} - Report data
 */
function generateLastWeekReport(attendancePath) {
    const { startDate, endDate } = getLastWeekRange();
    const attendance = loadAttendance(attendancePath);
    return generateReport(startDate, endDate, attendance);
}

/**
 * Generates a **last month** report.
 * @param {string} attendancePath - Path to Attendance.json
 * @returns {Object} - Report data
 */
function generateLastMonthReport(attendancePath) {
    const { startDate, endDate } = getLastMonthRange();
    const attendance = loadAttendance(attendancePath);
    return generateReport(startDate, endDate, attendance);
}

module.exports = {
    generateLastWeekReport,    // Updated to generate last week report
    generateLastMonthReport,   // Updated to generate last month report
};
