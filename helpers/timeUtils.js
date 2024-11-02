// helpers/timeUtils.js

const dayjs = require('dayjs');
const jalaali = require('jalaali-js');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Formats a dayjs object to Jalali date string.
 * @param {dayjs.Dayjs} dateObj 
 * @returns {string} - Formatted date string.
 */
function formatJalaliDate(dateObj) {
    const gregorianDate = {
        year: dateObj.year(),
        month: dateObj.month() + 1, // dayjs months are 0-based
        day: dateObj.date(),
        hour: dateObj.hour(),
        minute: dateObj.minute(),
    };
    
    const jDate = jalaali.toJalaali(gregorianDate.year, gregorianDate.month, gregorianDate.day);
    const formattedJalaliDate = `${jDate.jy}-${String(jDate.jm).padStart(2, '0')}-${String(jDate.jd).padStart(2, '0')} ${String(gregorianDate.hour).padStart(2, '0')}:${String(gregorianDate.minute).padStart(2, '0')}`;
    
    return formattedJalaliDate;
}

/**
 * Returns the current time in Solar Hijri (Jalali) calendar as a formatted string.
 * @returns {string} - Formatted Jalali date and time.
 */
function getCurrentTime() {
    const now = dayjs().tz("Asia/Tehran");
    return formatJalaliDate(now);
}

function getCurrentTimeJalili() {
    const now = dayjs();
    const jalalJoon  = new Intl.DateTimeFormat('fa-IR', {dateStyle: 'full', timeStyle: 'short',timeZone: 'Asia/Tehran'}).format(now);

    return jalalJoon;
}

/**
 * Returns the start and end dates for the current week in Jalali format.
 * Week starts on Saturday and ends on Friday.
 * @returns {Object} - { startDate, endDate }
 */
function getCurrentWeekRange() {
    const now = dayjs().tz("Asia/Tehran");
    const startOfWeek = now.startOf('week').add(6, 'day'); // Saturday
    const endOfWeek = now.endOf('week').add(6, 'day'); // Friday

    const startJalali = formatJalaliDate(startOfWeek);
    const endJalali = formatJalaliDate(endOfWeek);

    return { startDate: startJalali.split(' ')[0], endDate: endJalali.split(' ')[0] };
}

/**
 * Returns the start and end dates for the current month in Jalali format.
 * @returns {Object} - { startDate, endDate }
 */
function getCurrentMonthRange() {
    const now = dayjs().tz("Asia/Tehran");
    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');

    const startJalali = formatJalaliDate(startOfMonth);
    const endJalali = formatJalaliDate(endOfMonth);

    return { startDate: startJalali.split(' ')[0], endDate: endJalali.split(' ')[0] };
}

module.exports = {
    getCurrentTime,
    getCurrentWeekRange,
    getCurrentMonthRange,
    getCurrentTimeJalili
};
