const axios = require('axios');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const redis = require('../utils/redis');

const prisma = new PrismaClient();
const CACHE_KEY = 'external:leaderboard';
const CACHE_TTL = 300; // 5 minutes
const API_URL = 'https://events.geekhaven.in/back/api/v1/events/Opencode/leaderboard';

async function scrapeLeaderboard() {
  try {
    const response = await axios.get(API_URL);
    const data = response.data; // Assume it's an array of { rank, username, points }

    // Assuming data is array, add scrapedAt
    const entries = data.map(entry => ({
      ...entry,
      scrapedAt: new Date()
    }));

    // Save to DB
    await prisma.externalLeaderboard.deleteMany(); // Clear old data
    for (const entry of entries) {
      await prisma.externalLeaderboard.create({ data: entry });
    }

    // Cache in Redis
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data));

    console.log(`Fetched and saved ${data.length} entries at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Fetching failed:', error.message);
    // Fallback: do nothing, keep old cache/DB
  }
}

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running scraper...');
  scrapeLeaderboard().catch(console.error);
});

console.log('Scraper scheduled to run every 5 minutes.');

// Run immediately on start
scrapeLeaderboard().catch(console.error);