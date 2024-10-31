// index.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Retrieve the token and auth key from the environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const authKey = process.env.AUTH_KEY;

// Path to the authorized users file
const authorizedUsersPath = path.join(__dirname, 'authorized_users.json');

// Function to load authorized users from the JSON file
function loadAuthorizedUsers() {
  try {
    const data = fs.readFileSync(authorizedUsersPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading authorized_users.json:', err);
    return [];
  }
}

// Function to save authorized users to the JSON file
function saveAuthorizedUsers(users) {
  try {
    fs.writeFileSync(authorizedUsersPath, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error writing to authorized_users.json:', err);
  }
}

// Initialize authorized users list
let authorizedUsers = loadAuthorizedUsers();

// Check if the token and authKey are provided
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in the .env file.');
  process.exit(1);
}

if (!authKey || authKey.length !== 16) {
  console.error('Error: AUTH_KEY is not set correctly in the .env file. It must be 16 characters long.');
  process.exit(1);
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Define the list of commands
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

// Handler for receiving messages (authorization and other commands)
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
      saveAuthorizedUsers(authorizedUsers);

      bot.sendMessage(chatId, `احراز هویت موفقیت‌آمیز بود! حالا می‌توانید از دستورات ربات استفاده کنید.`);
    } else {
      bot.sendMessage(chatId, `کد احراز هویت نادرست است. لطفا مجدداً تلاش کنید.`);
    }
  } else {
    bot.sendMessage(chatId, `برای احراز هویت، لطفا کد خصوصی 16 کاراکتری خود را ارسال نمایید.`);
  }
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
