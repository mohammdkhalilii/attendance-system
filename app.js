// server.js

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(morgan('dev'));

// Path to RFID tags JSON file
const rfidFilePath = path.join(__dirname, 'rfid_tags.json');

// Function to load RFID tags
function loadRFIDTags() {
    try {
        const data = fs.readFileSync(rfidFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading RFID tags file:', err);
        return {};
    }
}

// Load RFID tags into memory
let rfidTags = loadRFIDTags();

// Endpoint to check RFID tag
app.post('/check-rfid', (req, res) => {
    const { rfid } = req.body;

    if (!rfid) {
        return res.status(400).json({ error: 'RFID tag is required.' });
    }

    const userName = rfidTags[rfid];

    if (userName) {
        console.log(`RFID Tag Checked: ${rfid} - User: ${userName}`);
        return res.status(200).json({ success: true, name: userName });
    } else {
        console.log(`RFID Tag Checked: ${rfid} - User not found.`);
        return res.status(404).json({ success: false, message: 'RFID tag not recognized.' });
    }
});

// Optional: Endpoint to add new RFID tags (for administration purposes)
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

    // Save to JSON file
    fs.writeFile(rfidFilePath, JSON.stringify(rfidTags, null, 4), (err) => {
        if (err) {
            console.error('Error writing to RFID tags file:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        console.log(`New RFID Tag Added: ${rfid} - User: ${name}`);
        return res.status(201).json({ success: true, message: 'RFID tag added successfully.' });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`RFID Checker Express app is running on port ${PORT}`);
});
