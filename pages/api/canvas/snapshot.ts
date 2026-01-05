import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'utils/prisma'
import redis from 'utils/redis'
import logger from 'utils/logger'

const CANVAS_WIDTH = parseInt(process.env.CANVAS_WIDTH || '1600', 10)
const CANVAS_HEIGHT = parseInt(process.env.CANVAS_HEIGHT || '1000', 10)
const GRID = parseInt(process.env.CANVAS_GRID || process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)
const CACHE_KEY = 'canvas:snapshot'
const CACHE_TTL = 10 // seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now()
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' })

    const cols = Math.floor(CANVAS_WIDTH / GRID)
    const rows = Math.floor(CANVAS_HEIGHT / GRID)
    const since = req.query.since ? new Date(parseInt(req.query.since as string)) : null

    // Check cache first (only if no since, for full snapshot)
    if (!since) {
      const cached = await redis.get(CACHE_KEY)
      if (cached) {
        logger.info('Full snapshot served from cache', { duration: Date.now() - start })
        return res.status(200).json({ ok: true, placements: JSON.parse(cached), cols, rows })
      }
    }

    // Get latest placements per cell
    const placements = since
      ? await prisma.$queryRaw`SELECT p.x, p.y, p.color, p.userId, p.createdAt FROM Placement p INNER JOIN (SELECT x, y, MAX(createdAt) as maxCreatedAt FROM Placement WHERE createdAt > ${since} GROUP BY x, y) latest ON p.x = latest.x AND p.y = latest.y AND p.createdAt = latest.maxCreatedAt`
      : await prisma.$queryRaw`SELECT p.x, p.y, p.color, p.userId, p.createdAt FROM Placement p INNER JOIN (SELECT x, y, MAX(createdAt) as maxCreatedAt FROM Placement GROUP BY x, y) latest ON p.x = latest.x AND p.y = latest.y AND p.createdAt = latest.maxCreatedAt`

    // For full snapshot, cache it
    if (!since) {
      await redis.set(CACHE_KEY, JSON.stringify(placements), 'EX', CACHE_TTL)
      logger.info('Full snapshot generated and cached', { placementCount: placements.length, duration: Date.now() - start })
    } else {
      logger.info('Diff snapshot generated', { placementCount: placements.length, since: since?.toISOString(), duration: Date.now() - start })
    }

    return res.status(200).json({ ok: true, placements, cols, rows, timestamp: Date.now() })
  } catch (error) {
    logger.error('Error in /api/canvas/snapshot', { error: error.message, stack: error.stack })
    return res.status(500).json({ ok: false, error: 'internal-server-error' })
  }
}
