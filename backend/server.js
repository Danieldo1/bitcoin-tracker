const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());


// Connect DB
const dbPath = process.env.DB_PATH || './bitcoin_prices.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the bitcoin prices database.');
});


db.run(`CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER UNIQUE,
  price REAL
)`);


async function fetchHistoricalBitcoinPrices(fromTimestamp, toTimestamp) {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range`, {
      params: {
        vs_currency: 'usd',
        from: fromTimestamp,
        to: toTimestamp
      }
    });
    return response.data.prices.map(([timestamp, price]) => ({
      timestamp: Math.floor(timestamp / 1000),
      price
    }));
  } catch (error) {
    console.error('Error fetching historical Bitcoin prices:', error);
    return [];
  }
}


function savePricesToDb(prices) {
  const stmt = db.prepare(`INSERT OR IGNORE INTO prices (timestamp, price) VALUES (?, ?)`);
  prices.forEach(({timestamp, price}) => {
    stmt.run(timestamp, price);
  });
  stmt.finalize();
  console.log(`${prices.length} prices saved to database`);
}


async function fillHistoricalData() {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  const historicalPrices = await fetchHistoricalBitcoinPrices(oneYearAgo, now);
  savePricesToDb(historicalPrices);
}


fillHistoricalData();

cron.schedule('0 * * * *', async () => {
  const lastHour = Math.floor(Date.now() / 1000) - 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  const newPrices = await fetchHistoricalBitcoinPrices(lastHour, now);
  savePricesToDb(newPrices);
});

// API endpoint 
app.get('/api/prices', (req, res) => {
  const { start, end } = req.query;
  let query = 'SELECT * FROM prices';
  const params = [];

  if (start && end) {
    query += ' WHERE timestamp BETWEEN ? AND ?';
    params.push(start, end);
  } else if (start) {
    query += ' WHERE timestamp >= ?';
    params.push(start);
  } else if (end) {
    query += ' WHERE timestamp <= ?';
    params.push(end);
  }

  query += ' ORDER BY timestamp ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});