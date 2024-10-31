const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const db = require('./database');

// Middleware to parse JSON bodies
app.use(bodyParser.json());


const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = '7064987600:AAEOXp2wogA2Ivfpg2ZK5TV-jzCI1D1T5CI'; // Replace with your Telegram Bot Token
const CHAT_ID = '819007739'; // Replace with your Telegram Chat ID

const bot = new TelegramBot(TELEGRAM_TOKEN);

function sendTelegramNotification(employee_id, event_type) {
  const message = `Employee ${employee_id} has ${event_type} at ${new Date().toLocaleString()}`;
  bot.sendMessage(CHAT_ID, message);
}

app.get('/attendance/:employee_id', (req, res) => {
    const employee_id = req.params.employee_id;
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
  
    const sql = `
      SELECT * FROM attendance 
      WHERE employee_id = ? 
      AND strftime('%m', timestamp) = ? 
      AND strftime('%Y', timestamp) = ?
      ORDER BY timestamp
    `;
  
    db.all(
      sql,
      [employee_id, String(month).padStart(2, '0'), String(year)],
      (err, rows) => {
        if (err) {
          console.error('Error retrieving data', err.message);
          return res.status(500).send('Server error');
        }
        res.json(rows);
      }
    );
  });
  



// Endpoint to receive attendance data from ESP32
app.post('/attendance', (req, res) => {
    const { employee_id, event_type } = req.body;
    
    if (!employee_id || !event_type) {
        return res.status(400).send('Missing employee_id or event_type');
    }
    
    const sql = `INSERT INTO attendance (employee_id, event_type) VALUES (?, ?)`;
    db.run(sql, [employee_id, event_type], function (err) {
        if (err) {
            console.error('Error inserting data', err.message);
            return res.status(500).send('Server error');
        }
        
        // Send notification to Telegram
        sendTelegramNotification(employee_id, event_type);
        
        res.status(200).send('Attendance recorded');
    });
});



// Start the server
const PORT = 3000; // You can choose any available port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

