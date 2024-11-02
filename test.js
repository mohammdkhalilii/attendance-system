
// index.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const dayjs = require('dayjs');
const jalaali = require('jalaali-js');

const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// dayjs.tz.setDefault("Asia/Tehran")





// =========================
// Helper Functions
// =========================

/**
 * Returns the current time in UTC+3:30 as a formatted string.
 * Format: YYYY-MM-DD HH:mm:ss
 */
// function getCurrentTime() {
//     const date = new Date();
//     // Convert to UTC time in milliseconds
//     const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
//     // Define the offset for UTC+3:30 in milliseconds
//     const offset = 3.5 * 60 * 60 * 1000;
//     const dateUTCplus3_30 = new Date(utc + offset);
//     // Format the date as YYYY-MM-DD HH:mm:ss
//     const year = dateUTCplus3_30.getFullYear();
//     const month = String(dateUTCplus3_30.getMonth() + 1).padStart(2, '0');
//     const day = String(dateUTCplus3_30.getDate()).padStart(2, '0');


//     const hours = String(dateUTCplus3_30.getHours()).padStart(2, '0');
//     const minutes = String(dateUTCplus3_30.getMinutes()).padStart(2, '0');
//     return `${year}-${month}-${day} ${hours}:${minutes}`;
// }

function getCurrentTime() {
    const now = dayjs();
    const folan = dayjs().tz("Asia/Tehran");

    // const gregorianDate = {
    //     year: now.year(),
    //     month: now.month() + 1, // dayjs months are 0-based
    //     day: now.date(),
    //     hour: now.hour(),
    //     minute: now.minute(),
    // };
    console.log(now,folan);
    
    // const jalalJoon  = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {dateStyle: 'full', timeStyle: 'short'}).format(folan);
    const jalalJoon  = new Intl.DateTimeFormat('fa-IR', {dateStyle: 'full', timeStyle: 'short'}).format(now);
    const jalalJoonz  = new Intl.DateTimeFormat('fa-IR', {dateStyle: 'full', timeStyle: 'short'}).format(folan);


    console.log(jalalJoon,jalalJoonz);
    



    // const jDate = jalaali.toJalaali(gregorianDate.year, gregorianDate.month, gregorianDate.day);
    // const formattedJalaliDate = `${jDate.jy}-${String(jDate.jm).padStart(2, '0')}-${String(jDate.jd).padStart(2, '0')} ${String(gregorianDate.hour).padStart(2, '0')}:${String(gregorianDate.minute).padStart(2, '0')}`;
    return jalalJoon;
}

// =========================
// File Paths
// =========================

const authorizedUsersPath = path.join(__dirname, 'authorized_users.json');
const rfidTagsPath = path.join(__dirname, 'rfid_tags.json');
const attendancePath = path.join(__dirname, 'Attendance.json');

// =========================
// Data Loading Functions
// =========================

/**
 * Loads authorized users from authorized_users.json.
 * Returns an array of chat IDs.
 */
function loadAuthorizedUsers() {
    try {
        const data = fs.readFileSync(authorizedUsersPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading authorized_users.json:', err);
        return [];
    }
}

/**
 * Loads RFID tags from rfid_tags.json.
 * Returns an object mapping RFID tags to user names.
 */
function loadRFIDTags() {
    try {
        const data = fs.readFileSync(rfidTagsPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading rfid_tags.json:', err);
        return {};
    }
}

/**
 * Loads attendance records from Attendance.json.
 * Returns an array of attendance entries.
 */
function loadAttendance() {
    try {
        if (!fs.existsSync(attendancePath)) {
            fs.writeFileSync(attendancePath, JSON.stringify([]));
        }
        const data = fs.readFileSync(attendancePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading Attendance.json:', err);
        return [];
    }
}

/**
 * Saves attendance records to Attendance.json.
 * @param {Array} attendance - Array of attendance entries.
 */
function saveAttendance(attendance) {
    try {
        fs.writeFileSync(attendancePath, JSON.stringify(attendance, null, 2));
    } catch (err) {
        console.error('Error writing to Attendance.json:', err);
    }
}

// =========================
// Initialize Data
// =========================

let authorizedUsers = loadAuthorizedUsers();
let rfidTags = loadRFIDTags();
let attendance = loadAttendance();

// Initialize last action map (RFID: last action)
let lastActionMap = {};

// Populate lastActionMap based on the latest attendance entry for each RFID
attendance.forEach(entry => {
    lastActionMap[entry.rfid] = entry.action;
});

// =========================
// Initialize Telegram Bot
// =========================

const token = process.env.TELEGRAM_BOT_TOKEN;
const authKey = process.env.AUTH_KEY;

if (!token) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not set in the .env file.');
    process.exit(1);
}

if (!authKey || authKey.length !== 16) {
    console.error('Error: AUTH_KEY is not set correctly in the .env file. It must be 16 characters long.');
    process.exit(1);
}

// Create a Telegram bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Define the list of commands (in Persian as per user requirement)
const commands = [
    { command: 'start', description: 'گرفتن اطالاعات حضور و غیاب آسیل' },
    { command: 'weekly_report', description: 'گرفتن ریپورت هفته‌ای' },
    { command: 'monthly_report', description: 'گرفتن ریپورت ماهیانه' },
];

// Set the commands using setMyCommands
bot.setMyCommands(commands)
    .then(() => {
        console.log('Commands successfully set.');
    })
    .catch((error) => {
        console.error('Error setting commands:', error);
    });

// =========================
// Telegram Bot Command Handlers
// =========================

// /start command handler
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'there';

    // Check if user is already authorized
    if (authorizedUsers.includes(chatId)) {
        const welcomeBackMessage = `سلام, ${firstName}! شما قبلاً احراز هویت شده‌اید. چطور می‌توانم کمک کنم؟`;
        bot.sendMessage(chatId, welcomeBackMessage);
        return;
    }

    const welcomeMessage = `سلام, ${firstName}! برای گرفتن اطلاعات، لطفا کد خصوصی احراز هویت 16 کاراکتری را ارسال نمایید.`;
    
    bot.sendMessage(chatId, welcomeMessage);
});

// /help command handler
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `در اینجا دستورات قابل استفاده را مشاهده می‌کنید:
    /start - شروع تعامل با ربات
    /weekly_report - دریافت ریپورت هفته‌ای
    /monthly_report - دریافت ریپورت ماهیانه
    `;
    bot.sendMessage(chatId, helpMessage);
});

// /weekly_report command handler
bot.onText(/\/weekly_report/, (msg) => {
    const chatId = msg.chat.id;

    // Check authorization
    if (!authorizedUsers.includes(chatId)) {
        bot.sendMessage(chatId, `شما احراز هویت نشده‌اید. لطفا ابتدا با ارسال کد خصوصی 16 کاراکتری، دسترسی خود را فعال نمایید.`);
        return;
    }

    bot.sendMessage(chatId, 'ریپورت هفته‌ای:');
    // Implement your weekly report logic here
});

// /monthly_report command handler
bot.onText(/\/monthly_report/, (msg) => {
    const chatId = msg.chat.id;

    // Check authorization
    if (!authorizedUsers.includes(chatId)) {
        bot.sendMessage(chatId, `شما احراز هویت نشده‌اید. لطفا ابتدا با ارسال کد خصوصی 16 کاراکتری، دسترسی خود را فعال نمایید.`);
        return;
    }

    bot.sendMessage(chatId, 'ریپورت ماهیانه:');
    // Implement your monthly report logic here
});

// Handle any other text messages (including authorization)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Ignore messages that are commands (handled separately)
    if (text.startsWith('/')) {
        // Optionally, inform unauthorized users to authorize
        if (!authorizedUsers.includes(chatId)) {
            bot.sendMessage(chatId, `لطفا ابتدا با ارسال کد خصوصی احراز هویت 16 کاراکتری، دسترسی خود را فعال نمایید.`);
        }
        return;
    }

    // If user is already authorized, handle commands or messages as needed
    if (authorizedUsers.includes(chatId)) {
        // Handle additional text messages from authorized users here
        bot.sendMessage(chatId, `پیام دریافت شد: ${text}`);
        return;
    }

    // If user is not authorized, treat the message as an authorization attempt
    if (text.length === 16) {
        if (text === authKey) {
            // Authorize the user
            authorizedUsers.push(chatId);
            // Save to authorized_users.json
            fs.writeFileSync(authorizedUsersPath, JSON.stringify(authorizedUsers, null, 2));

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

// =========================
// Initialize Express App
// =========================

const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// =========================
// Express.js Routes
// =========================

/**
 * POST /check-rfid
 * Body: { rfid: "A1B2C3D4E5" }
 * Description: Checks the RFID tag, logs attendance, and notifies authorized Telegram users.
 */
app.post('/check-rfid', (req, res) => {
    const { rfid } = req.body;

    if (!rfid) {
        return res.status(400).json({ error: 'RFID tag is required.' });
    }

    const userName = rfidTags[rfid];

    if (userName) {
        // Determine action: Enter or Exit
        let action = 'Enter';
        if (lastActionMap[rfid] === 'Enter') {
            action = 'Exit';
        }

        // Update lastActionMap
        lastActionMap[rfid] = action;

        // Get current time in UTC+3:30
        const currentTime = getCurrentTime();

        // Log to Attendance.json
        const attendanceEntry = {
            rfid: rfid,
            name: userName,
            action: action,
            time: currentTime
        };

        attendance.push(attendanceEntry);
        saveAttendance(attendance);

        // Prepare notification message
        const actionText = action === 'Enter' ? '🟢 وارد شد' : '🔴 خارج شد';
        const message = `${userName} ${actionText} در  ${currentTime}`;

        // Send notification to all authorized Telegram users
        authorizedUsers.forEach(chatId => {
            bot.sendMessage(chatId, message);
        });

        console.log(`RFID Tag Checked: ${rfid} - User: ${userName} - Action: ${action} at ${currentTime}`);

        return res.status(200).json({ success: true, name: userName, action: action, time: currentTime });
    } else {
        console.log(`RFID Tag Checked: ${rfid} - User not found.`);
        return res.status(404).json({ success: false, message: 'RFID tag not recognized.' });
    }
});

/**
 * POST /add-rfid
 * Body: { rfid: "F6G7H8I9J0", name: "New User" }
 * Description: Adds a new RFID tag to the system.
 * Note: In a production environment, secure this endpoint appropriately.
 */
app.post('/add-rfid', (req, res) => {
    const { rfid, name } = req.body;

    if (!rfid || !name) {
        return res.status(400).json({ error: 'Both RFID tag and name are required.' });
    }

    if (rfidTags[rfid]) {
        return res.status(409).json({ error: 'RFID tag already exists.' });
    }

    // Add to in-memory object
    rfidTags[rfid] = name;

    // Save to rfid_tags.json
    fs.writeFile(rfidTagsPath, JSON.stringify(rfidTags, null, 4), (err) => {
        if (err) {
            console.error('Error writing to rfid_tags.json:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        console.log(`New RFID Tag Added: ${rfid} - User: ${name}`);
        return res.status(201).json({ success: true, message: 'RFID tag added successfully.' });
    });
});

// =========================
// Start Express Server
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`RFID Checker Express app is running on port ${PORT}`);
});
