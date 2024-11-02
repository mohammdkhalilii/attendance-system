// routes/checkRfid.js

const express = require('express');
const router = express.Router();
const { loadJSON, saveJSON } = require('../data/loadData');
const config = require('../config/config');
const { getCurrentTime } = require('../helpers/timeUtils');
const { calculateReport } = require('../helpers/reportUtils');

const bot = require('../telegram/telegramBot'); // Import the existing bot instance
const path = require('path');

const authorizedUsersPath = require('path').join(__dirname, '..', 'data', 'authorized_users.json');
const rfidTagsPath = require('path').join(__dirname, '..', 'data', 'rfid_tags.json');
const attendancePath = require('path').join(__dirname, '..', 'data', 'Attendance.json');


// Middleware to check API Key (if you implemented it)
const apiKey = config.apiKey;

/**
 * POST /check-rfid
 * Body: { rfid: "A1B2C3D4E5" }
 * Description: Checks the RFID tag, logs attendance, and notifies authorized Telegram users.
 */
router.post('/', (req, res) => {
    const { rfid } = req.body;

    if (!rfid) {
        return res.status(400).json({ error: 'RFID tag is required.' });
    }

    const rfidTags = loadJSON(rfidTagsPath);
    const userName = rfidTags[rfid];

    if (userName) {
        const attendance = loadJSON(attendancePath);

        // Determine action: Enter or Exit
        let action = 'Enter';
        const lastEntry = attendance.filter(entry => entry.rfid === rfid).pop();
        if (lastEntry && lastEntry.action === 'Enter') {
            action = 'Exit';
        }

        // Get current time in Solar Hijri (Jalali)
        const currentTime = getCurrentTime();
        const currentTime_fa = getCurrentTimeJalili();

        // Log attendance
        const attendanceEntry = {
            rfid: rfid,
            name: userName,
            action: action,
            time: currentTime,
        };
        attendance.push(attendanceEntry);
        saveJSON(attendancePath, attendance);

        // Prepare notification message
        const actionText = action === 'Enter' ? '🟢 وارد شد' : '🔴 خارج شد';
        const message = `${userName} ${actionText} در  ${currentTime_fa}`;

        // Notify all authorized Telegram users
        const authorizedUsers = loadJSON(authorizedUsersPath);
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

module.exports = router;
