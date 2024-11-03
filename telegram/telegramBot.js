// telegram/telegramBot.js

const TelegramBot = require('node-telegram-bot-api');
const { loadJSON, saveJSON } = require('../data/loadData');
const { generateLastWeekReport, generateLastWeekReport } = require('../helpers/reportUtils');
const config = require('../config/config');
const path = require('path');

const authorizedUsersPath = require('path').join(__dirname, '..', 'data', 'authorized_users.json');
const rfidTagsPath = require('path').join(__dirname, '..', 'data', 'rfid_tags.json');
const attendancePath = require('path').join(__dirname, '..', 'data', 'Attendance.json');

const { getCurrentTime } = require('../helpers/timeUtils');

const bot = new TelegramBot(config.telegramBotToken, { polling: true });

// Load authorized users, RFID tags, and attendance
let authorizedUsers = loadJSON(authorizedUsersPath);
let rfidTags = loadJSON(rfidTagsPath);
let attendance = loadJSON(attendancePath);

// Initialize last action map (RFID: last action)
let lastActionMap = {};
attendance.forEach(entry => {
    lastActionMap[entry.rfid] = entry.action;
});




// Define Bot Commands
const commands = [
    { command: 'start', description: 'گرفتن اطلاعات حضور و غیاب آسیل' },
    { command: 'help', description: 'نمایش پیام راهنما' },
    { command: 'weekly_report', description: 'دریافت ریپورت هفته‌ای' },
    { command: 'monthly_report', description: 'دریافت ریپورت ماهیانه' },
];

// Set Bot Commands
bot.setMyCommands(commands)
    .then(() => {
        console.log('Telegram bot commands set successfully.');
    })
    .catch((error) => {
        console.error('Error setting Telegram bot commands:', error);
    });

// /start Command Handler
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'there';

    if (authorizedUsers.includes(chatId)) {
        const welcomeBackMessage = `سلام, ${firstName}! شما قبلاً احراز هویت شده‌اید. چطور می‌توانم کمک کنم؟`;
        bot.sendMessage(chatId, welcomeBackMessage);
        return;
    }

    const welcomeMessage = `سلام, ${firstName}! برای گرفتن اطلاعات، لطفا کد خصوصی احراز هویت 16 کاراکتری را ارسال نمایید.`;
    bot.sendMessage(chatId, welcomeMessage);
});

// /help Command Handler
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `در اینجا دستورات قابل استفاده را مشاهده می‌کنید:
/start - شروع تعامل با ربات
/help - نمایش پیام راهنما
/weekly_report - دریافت ریپورت هفته‌ای
/monthly_report - دریافت ریپورت ماهیانه
    `;
    bot.sendMessage(chatId, helpMessage);
});

// /weekly_report Command Handler
bot.onText(/\/weekly_report/, (msg) => {
    const chatId = msg.chat.id;

    if (!authorizedUsers.includes(chatId)) {
        bot.sendMessage(chatId, `شما احراز هویت نشده‌اید. لطفا ابتدا با ارسال کد خصوصی 16 کاراکتری، دسترسی خود را فعال نمایید.`);
        return;
    }

    const report = generateLastWeekReport(attendancePath);
    const { startDate, endDate, reports } = report;

    if (reports.length === 0) {
        bot.sendMessage(chatId, `هیچ داده‌ای برای ریپورت هفته‌ای بین تاریخ ${startDate} تا ${endDate} یافت نشد.`);
        return;
    }

    let message = `*ریپورت هفته‌ای از ${startDate} تا ${endDate}:*\n\n`;
    reports.forEach(userReport => {
        message += `*نام:* ${userReport.name}\n`;
        message += `*کد:* ${userReport.rfid}\n`;
        message += `*کل زمان کار:* ${userReport.totalWorkTime}\n`;
        message += `*تعداد روز حضور:* ${userReport.totalDays}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// /monthly_report Command Handler
bot.onText(/\/monthly_report/, (msg) => {
    const chatId = msg.chat.id;

    if (!authorizedUsers.includes(chatId)) {
        bot.sendMessage(chatId, `شما احراز هویت نشده‌اید. لطفا ابتدا با ارسال کد خصوصی 16 کاراکتری، دسترسی خود را فعال نمایید.`);
        return;
    }

    const report = generateLastMonthReport(attendancePath);
    const { startDate, endDate, reports } = report;

    if (reports.length === 0) {
        bot.sendMessage(chatId, `هیچ داده‌ای برای ریپورت ماهیانه بین تاریخ ${startDate} تا ${endDate} یافت نشد.`);
        return;
    }

    let message = `*ریپورت ماهیانه از ${startDate} تا ${endDate}:*\n\n`;
    reports.forEach(userReport => {
        message += `*نام:* ${userReport.name}\n`;
        message += `*کد:* ${userReport.rfid}\n`;
        message += `*کل زمان کار:* ${userReport.totalWorkTime}\n`;
        message += `*تعداد روز حضور:* ${userReport.totalDays}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Handle Non-Command Messages (e.g., Authorization)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Ignore messages that are commands
    if (text.startsWith('/')) {
        // Optionally, inform unauthorized users to authorize
        if (!authorizedUsers.includes(chatId)) {
            bot.sendMessage(chatId, `لطفا ابتدا با ارسال کد خصوصی احراز هویت 16 کاراکتری، دسترسی خود را فعال نمایید.`);
        }
        return;
    }

    // If user is already authorized, handle additional messages
    if (authorizedUsers.includes(chatId)) {
        bot.sendMessage(chatId, `پیام دریافت شد: ${text}`);
        return;
    }

    // Treat message as an authorization attempt
    if (text.length === 16) {
        if (text === config.authKey) {
            // Authorize the user
            authorizedUsers.push(chatId);
            saveJSON(authorizedUsersPath, authorizedUsers);

            bot.sendMessage(chatId, `احراز هویت موفقیت‌آمیز بود! حالا می‌توانید از دستورات ربات استفاده کنید.`);
            console.log(`User authorized: Chat ID ${chatId}`);
        } else {
            bot.sendMessage(chatId, `کد احراز هویت نادرست است. لطفا مجدداً تلاش کنید.`);
            console.log(`Failed authorization attempt for Chat ID ${chatId} with code: ${text}`);
        }
    } else {
        bot.sendMessage(chatId, `برای احراز هویت، لطفا کد خصوصی 16 کاراکتری خود را ارسال نمایید.`);
    }
});



module.exports = bot;
