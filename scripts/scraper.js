require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const axios = require('axios');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const redis = require('../utils/redis.ts');

const prisma = new PrismaClient();
const CACHE_KEY = 'external:leaderboard';
const CACHE_TTL = 300; // 5 minutes
const API_URL = 'https://events.geekhaven.in/back/api/v1/events/Opencode/leaderboard';

async function scrapeLeaderboard() {
  try {
    const response = await axios.get(API_URL);
    const data = response.data.data; // Assume it's an array of { rank, username, points }
    console.log(data)
    // Assuming data is array, add scrapedAt

    await prisma.$transaction(
      data.map(entry =>
        prisma.externalLeaderboard.upsert({
          where: { githubid: entry.githubid },
          update: {
            position: entry.position,
            points: entry.points,
            scrapedAt: new Date()
          },
          create: {
            githubid: entry.githubid,
            position: entry.position,
            points: entry.points,
            scrapedAt: new Date()
          }
        })
      )
    );

    // Cache in Redis
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data));

    console.log(`Fetched and saved ${data.length} entries at ${new Date().toISOString()}`);
  } 
  catch (error) {
    console.error('Fetching failed:', error);
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