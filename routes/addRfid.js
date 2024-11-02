// routes/addRfid.js

const express = require('express');
const router = express.Router();
const { loadJSON, saveJSON } = require('../data/loadData');
const config = require('../config/config');

const rfidTagsPath = require('path').join(__dirname, '..', 'data', 'rfid_tags.json');

// Middleware to verify API Key
function verifyApiKey(req, res, next) {
    const providedKey = req.headers['x-api-key'];
    if (providedKey && providedKey === config.apiKey) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid API Key.' });
    }
}

/**
 * POST /add-rfid
 * Body: { rfid: "F6G7H8I9J0", name: "New User" }
 * Description: Adds a new RFID tag to the system.
 * Security: Protected by API Key.
 */
router.post('/', verifyApiKey, (req, res) => {
    const { rfid, name } = req.body;

    if (!rfid || !name) {
        return res.status(400).json({ error: 'Both RFID tag and name are required.' });
    }

    const rfidTags = loadJSON(rfidTagsPath);

    if (rfidTags[rfid]) {
        return res.status(409).json({ error: 'RFID tag already exists.' });
    }

    // Add new RFID tag
    rfidTags[rfid] = name;
    saveJSON(rfidTagsPath, rfidTags);

    console.log(`New RFID Tag Added: ${rfid} - User: ${name}`);
    return res.status(201).json({ success: true, message: 'RFID tag added successfully.' });
});

module.exports = router;
