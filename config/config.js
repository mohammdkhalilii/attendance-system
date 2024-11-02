// config/config.js

require('dotenv').config();

const config = {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    authKey: process.env.AUTH_KEY,
    apiKey: process.env.API_KEY, // For securing sensitive endpoints
    port: process.env.PORT || 3000,
};

module.exports = config;
