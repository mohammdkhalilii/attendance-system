// index.js

const express = require('express');
const morgan = require('morgan');
const config = require('./config/config');
const checkRfidRoute = require('./routes/checkRfid');
const addRfidRoute = require('./routes/addRfid');
const initializeBot = require('./telegram/telegramBot');

// Initialize Telegram Bot
require('./telegram/telegramBot'); // Simply require it to initialize

// Initialize Express App
const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/check-rfid', checkRfidRoute);
app.use('/add-rfid', addRfidRoute);

// Health Check Route
app.get('/', (req, res) => {
    res.send('RFID Telegram Integration is running.');
});

// Start Server
app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
});

