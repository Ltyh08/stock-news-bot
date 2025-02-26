const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');
const cron = require('node-cron');
const { engine } = require('express-handlebars'); 

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve CSS & static files

// Set up Handlebars
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', './views');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Jxjekndkskdk1234',
    database: 'stock_news_db'
});

db.connect(err => {
    if (err) throw err;
    console.log("MySQL Connected...");
});

// Route to render news
app.get('/', (req, res) => {
    const sql = "SELECT * FROM news ORDER BY published_at DESC LIMIT 20";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        res.render('home', { news: results });
    });
});

// Start the server
app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});
