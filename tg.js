// index.js

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Retrieve the token from the environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

// Check if the token is provided
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not set in the .env file.');
  process.exit(1);
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Define the list of commands
const commands = [
  { command: 'start', description: 'گرفتن اطالاعات خضور و غیاب آسیل' },
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
  const welcomeMessage = `سلام, ${firstName}! برای گرفتن اطلاعات ، لطفا کد خصوصی احراز هویت را ارسال نمایید`;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// /command1 handler
bot.onText(/\/weekly_report/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'ریپورت هفته‌ای:');
});

// /command2 handler
bot.onText(/\/monthly_report/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'ریپورت ماهیانه:');
});

// Handle any other text messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // Ignore messages that are commands
  if (msg.text.startsWith('/')) return;

  // Echo the received message
  bot.sendMessage(chatId, `You said: ${msg.text}`);
});
