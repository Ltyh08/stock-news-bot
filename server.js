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
app.use('/imgs', express.static(__dirname + '/imgs')); // Serve static images

// Set up Handlebars
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', './views');

// ✅ Ensure News Table Exists
createNewsTable();

// Function to select a random fallback image
function getRandomFallbackImage() {
    const totalImages = 11; 
    const randomIndex = Math.floor(Math.random() * totalImages) + 1; // Random number from 1 to 9
    return `imgs/SM${randomIndex}.jpeg`; // Adjust the path based on your imgs folder setup
}

// ✅ Fetch Stock News from API & Store in DB
async function fetchStockNews() {
    try {
        const options = {
            method: 'GET',
            url: 'https://apidojo-yahoo-finance-v1.p.rapidapi.com/auto-complete',
            params: { q: 'stocks', region: 'US' },
            headers: {
                'X-RapidAPI-Key': process.env.YAHOO_FINANCE_API_KEY,
                'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);

        console.log("✅ Full API Response:", JSON.stringify(response.data, null, 2)); // ✅ Log API response

        if (!response.data || !response.data.news) {
            console.error("❌ No news data received from Yahoo Finance API");
            return;
        }

        const articles = response.data.news.slice(0, 10);
        console.log(`🔄 Found ${articles.length} new articles`);

        articles.forEach(article => {
            console.log(`📰 Title: ${article.title}`);
            console.log(`🔗 URL: ${article.link}`);
            console.log(`📅 Published: ${article.providerPublishTime}`);

            const publishedAt = article.providerPublishTime
                ? new Date(article.providerPublishTime * 1000)
                : new Date();

            // Check if the article has an image, otherwise assign a random fallback image
            const imageUrl = (article.thumbnail && article.thumbnail.resolutions.length > 0)
                ? article.thumbnail.resolutions[0].url
                : getRandomFallbackImage(); // ✅ Random fallback image

            insertNews(
                article.title || "No Title",
                article.summary || "No Description",
                article.link || "No URL",
                article.publisher || "Yahoo Finance",
                publishedAt,
                imageUrl
            );
        });

        console.log("✅ News updated in database!");
    } catch (error) {
        console.error("❌ Error fetching Yahoo Finance news:", error);
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

fetchStockNews(); // Fetch stock news when the server starts

// ✅ Start Server
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});
