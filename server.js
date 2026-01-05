/**
 * Custom Next.js server with Socket.IO integration for real-time canvas updates.
 * Handles WebSocket connections and broadcasts pixel placement updates via Redis pub-sub.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const Redis = require('ioredis');

// Redis client for pub-sub messaging
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Handle Redis connection errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Function to cache leaderboard data
async function cacheLeaderboard() {
  try {
    const CACHE_KEY = 'external:leaderboard';
    const CACHE_TTL = 300; // 5 minutes

    // Check if already cached
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return; // Already cached
    }

    // Fetch from database and cache
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const leaderboard = await prisma.externalLeaderboard.findMany({
      select: { username: true, points: true, rank: true },
      orderBy: { rank: 'asc' }
    });

    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(leaderboard));
    console.log('Leaderboard cached for', leaderboard.length, 'users');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error caching leaderboard:', error);
  }
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Cache leaderboard on server start
  cacheLeaderboard();

  // Create HTTP server with Next.js request handler
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO server
  const io = new Server(server);

  // Handle WebSocket connections
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Cache leaderboard data when client joins
    cacheLeaderboard();

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Subscribe to Redis pub-sub for canvas updates
  const subscriber = redis.duplicate();
  subscriber.subscribe('canvas-updates');
  subscriber.on('message', (channel, message) => {
    if (channel === 'canvas-updates') {
      const update = JSON.parse(message);
      // Broadcast update to all connected clients
      io.emit('canvas-update', update);
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});