import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../utils/prisma'
import redis from '../../utils/redis'

const CACHE_KEY = 'external:leaderboard'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' })

  try {
    // Check cache first
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      return res.status(200).json({ ok: true, leaderboard: JSON.parse(cached) })
    }

    // Fallback to DB
    const leaderboard = await prisma.externalLeaderboard.findMany({
      select: { username: true, points: true, rank: true },
      orderBy: { rank: 'asc' }
    })

    // Cache it for future
    await redis.setex(CACHE_KEY, 300, JSON.stringify(leaderboard))

    res.status(200).json({ ok: true, leaderboard })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    res.status(500).json({ ok: false, error: 'internal' })
  }
}