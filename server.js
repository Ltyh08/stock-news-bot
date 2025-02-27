require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const { engine } = require('express-handlebars');
const db = require('./config/db'); // Import DB Config
const { createNewsTable, insertNews, getNews } = require('./models/newsModel'); // Import Model

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Set up Handlebars
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', './views');

// ✅ Ensure News Table Exists
createNewsTable();

// ✅ Fetch News from API & Store in DB
async function fetchStockNews() {
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: "stocks",
                language: "en",
                apiKey: process.env.NEWS_API_KEY
            }
        });

        const articles = response.data.articles.slice(0, 10); // Limit to 10 articles
        articles.forEach(article => {
            insertNews(article.title, article.description, article.url, article.source.name, new Date(article.publishedAt));
        });
        console.log("✅ News updated in database!");
    } catch (error) {
        console.error("Error fetching news:", error);
    }
}

// ✅ Schedule News Fetching Every 6 Hours
cron.schedule("0 */6 * * *", fetchStockNews);

// ✅ API Route to Fetch Stored News
app.get('/api/news', (req, res) => {
    getNews((err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ✅ Render News in Handlebars Template
app.get('/', (req, res) => {
    getNews((err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        res.render('home', { news: results });
    });
});

// ✅ Start Server
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});
