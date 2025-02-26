const db = require('../config/db'); // Import DB connection

// Create "news" table if it doesn't exist
const createNewsTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS news (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            url VARCHAR(255) NOT NULL,
            source VARCHAR(100),
            published_at DATETIME NOT NULL
        )
    `;
    db.query(sql, (err) => {
        if (err) console.error("Table Creation Failed:", err);
        else console.log("✅ News table checked/created");
    });
};

// Function to Insert News Article
const insertNews = (title, description, url, source, publishedAt) => {
    const sql = "INSERT INTO news (title, description, url, source, published_at) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, description, url, source, publishedAt], (err) => {
        if (err) console.error("Insert News Failed:", err);
    });
};

// Function to Fetch News
const getNews = (callback) => {
    const sql = "SELECT * FROM news ORDER BY published_at DESC LIMIT 20";
    db.query(sql, (err, results) => {
        if (err) callback(err, null);
        else callback(null, results);
    });
};

// Export Functions
module.exports = { createNewsTable, insertNews, getNews };
