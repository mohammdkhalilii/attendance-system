// helpers/reportUtils.js

const dayjs = require('dayjs');
const jalaali = require('jalaali-js');
const { getLastWeekRange, getLastMonthRange } = require('./timeUtils');

/**
 * Converts Jalali date string to Day.js Gregorian object.
 * @param {string} jalaliDateStr - Format: 'jYYYY-jMM-jDD HH:mm'
 * @returns {dayjs.Dayjs} - Gregorian Day.js object.
 */
function jalaliToGregorian(jalaliDateStr) {
    const [datePart, timePart] = jalaliDateStr.split(' ');
    const [jy, jm, jd] = datePart.split('-').map(Number);
    const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
    const [hour, minute] = timePart.split(':').map(Number);
    return dayjs().year(gy).month(gm - 1).date(gd).hour(hour).minute(minute).second(0).millisecond(0);
}

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
    // Convert startDate and endDate from Jalali to Gregorian
    const [startJY, startJM, startJD] = startDate.split('-').map(Number);
    const [endJY, endJM, endJD] = endDate.split('-').map(Number);
    const { gy: startGY, gm: startGM, gd: startGD } = jalaali.toGregorian(startJY, startJM, startJD);
    const { gy: endGY, gm: endGM, gd: endGD } = jalaali.toGregorian(endJY, endJM, endJD);
    
    const startDateGregorian = dayjs().year(startGY).month(startGM - 1).date(startGD).startOf('day');
    const endDateGregorian = dayjs().year(endGY).month(endGM - 1).date(endGD).endOf('day');
    
    // Filter entries for the specific user and date range
    const userEntries = attendance.filter(entry => {
        if (entry.rfid !== rfid) return false;
        // Convert entry.time to Gregorian
        const entryDate = jalaliToGregorian(entry.time);
        return entryDate.isBetween(startDateGregorian, endDateGregorian, null, '[]'); // inclusive
    });

    // Sort entries by time
    userEntries.sort((a, b) => {
        return jalaliToGregorian(a.time).valueOf() - jalaliToGregorian(b.time).valueOf();
    });

    let totalMinutes = 0;
    const attendanceDays = new Set();

    for (let i = 0; i < userEntries.length; i++) {
        const entry = userEntries[i];
        if (entry.action === 'Enter') {
            const enterTime = jalaliToGregorian(entry.time);
            // Find the next 'Exit' entry after enterTime
            const exitEntry = userEntries.find(e => e.action === 'Exit' && jalaliToGregorian(e.time).isAfter(enterTime));
            if (exitEntry) {
                const exitTime = jalaliToGregorian(exitEntry.time);
                const diff = exitTime.diff(enterTime, 'minute');
                totalMinutes += diff;
                // Add the day in Jalali format
                const day = entry.time.split(' ')[0];
                attendanceDays.add(day);
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
