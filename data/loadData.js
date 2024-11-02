// data/loadData.js

const fs = require('fs');
const path = require('path');

/**
 * Loads JSON data from a file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {any} - Parsed JSON data.
 */
function loadJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(Array.isArray(filePath) ? [] : {}));
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        // Initialize to empty array or object based on file
        const initialData = path.basename(filePath) === 'Attendance.json' ? [] : {};
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

/**
 * Saves JSON data to a file.
 * @param {string} filePath - Path to the JSON file.
 * @param {any} data - Data to be saved.
 */
function saveJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing to ${filePath}:`, err);
    }
}

module.exports = {
    loadJSON,
    saveJSON,
};
