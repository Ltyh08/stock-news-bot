const mysql = require('mysql2');
require('dotenv').config(); // Load environment variables

// Create MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'stock_news_db'
});

// Connect to MySQL
db.connect(err => {
    if (err) {
        console.error("Database Connection Failed:", err);
        process.exit(1); // Exit if connection fails
    }
    console.log("✅ MySQL Connected...");
});

module.exports = db;
