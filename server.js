require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const { engine } = require('express-handlebars');
const db = require('./config/db'); // Import DB Config
const { createNewsTable, insertNews, getNews } = require('./models/newsModel'); // Import Model
const expressHandlebars = require('express-handlebars');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/imgs', express.static(__dirname + '/imgs')); // Serve static images


const hbs = expressHandlebars.create({
    extname: '.hbs',
    helpers: {
        trimWords: function (text, count) {
            if (!text) return "No Description";
            const words = text.trim().split(/\s+/);
            return words.length <= count ? text : words.slice(0, count).join(" ") + "...";
        }
    }
});
// Set up Handlebars
app.engine('hbs', hbs.engine);
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



async function extractSnippetFromUrl(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });

        const $ = cheerio.load(data);

        const metaDesc = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content');

        const firstParagraph = $('article p').first().text() ||
                               $('p').first().text();

        return (metaDesc || firstParagraph || "No description available.").trim();
    } catch (error) {
        console.error(`❌ Failed to fetch snippet from ${url}:`, error.message);
        return "No description available.";
    }
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

        console.log("✅ Full API Response:", JSON.stringify(response.data, null, 2));

        if (!response.data || !response.data.news) {
            console.error("❌ No news data received from Yahoo Finance API");
            return;
        }

        const articles = response.data.news.slice(0, 10);
        console.log(`🔄 Found ${articles.length} new articles`);

        for (const article of articles) {
            console.log(`📰 Title: ${article.title}`);
            console.log(`🔗 URL: ${article.link}`);
            console.log(`📅 Published: ${article.providerPublishTime}`);

            const description = article.summary && article.summary.length > 0
                ? article.summary
                : await extractSnippetFromUrl(article.link);

            const publishedAt = article.providerPublishTime
                ? new Date(article.providerPublishTime * 1000)
                : new Date();

            const imageUrl = (article.thumbnail && article.thumbnail.resolutions.length > 0)
                ? article.thumbnail.resolutions[0].url
                : getRandomFallbackImage();

            const relatedTickers = article.relatedTickers?.join(', ') || '';

            insertNews(
                article.title || "No Title",
                description,
                article.link || "No URL",
                article.publisher || "Yahoo Finance",
                publishedAt,
                imageUrl,
                relatedTickers
            );
        }

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

app.get('/api/news/search?', (req, res) => {
    const { ticker } = req.query;

    const sql = `
        SELECT * FROM news 
        WHERE related_tickers LIKE ? 
        ORDER BY published_at DESC
    `;

    db.query(sql, [`%${ticker}%`], (err, results) => {
        if (err) {
            console.error("Error searching news:", err);
            res.status(500).json({ error: 'Failed to search news' });
        } else {
            res.json(results);
        }
    });
});


fetchStockNews(); // Fetch stock news when the server starts


// ✅ Start Server
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});
