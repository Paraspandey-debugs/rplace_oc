import type { NextApiRequest, NextApiResponse } from 'next'
import dbConnect from 'utils/mongo'
import { Placement } from 'utils/models'
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

    await dbConnect()

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

    // Aggregate latest placements per cell, optionally since timestamp
    const matchStage = since ? { createdAt: { $gt: since } } : {}
    const placements = await Placement.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { x: '$x', y: '$y' },
          color: { $first: '$color' },
          userId: { $first: '$userId' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $project: { _id: 0, x: '$_id.x', y: '$_id.y', color: 1, userId: 1, createdAt: 1 } }
    ])

    // For full snapshot, cache it
    if (!since) {
      await redis.set(CACHE_KEY, JSON.stringify(placements), 'EX', CACHE_TTL)
      logger.info('Full snapshot generated and cached', { placementCount: placements.length, duration: Date.now() - start })
    } else {
      logger.info('Diff snapshot generated', { placementCount: placements.length, since: since?.toISOString(), duration: Date.now() - start })
    }

    return res.status(200).json({ ok: true, placements, cols, rows })
  } catch (error) {
    logger.error('Error in /api/canvas/snapshot', { error: error.message, stack: error.stack })
    return res.status(500).json({ ok: false, error: 'internal-server-error' })
  }
}
