// API route for placing pixels on the canvas
// Handles authentication, validation, cooldowns, and database storage

import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import dbConnect from 'utils/mongo'
import { Placement } from 'utils/models'
import redis from 'utils/redis'
import logger from 'utils/logger'
import { placementLimiter } from 'utils/rateLimit'

const CANVAS_WIDTH = parseInt(process.env.CANVAS_WIDTH || '1600', 10)
const CANVAS_HEIGHT = parseInt(process.env.CANVAS_HEIGHT || '1000', 10)
const GRID = parseInt(process.env.CANVAS_GRID || process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)
const COOLDOWN_MS = 0 // No cooldown

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now()
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' })

    await dbConnect()

    // Check for bot API key first
    const botKey = process.env.BOT_API_KEY
    const providedKey = (req.headers['x-bot-key'] as string) || (req.headers['authorization'] as string)
    let isBot = false
    if (botKey && providedKey) {
      const raw = providedKey.startsWith('Bearer ') ? providedKey.slice(7).trim() : providedKey.trim()
      if (raw && raw === botKey) isBot = true
    }

    let user: any = null
    let userId = 'anonymous'
    if (!isBot) {
      const session = await getServerSession(req, res, authOptions)
      if (!session) return res.status(401).json({ ok: false, error: 'unauthenticated' })
      user = session.user
      userId = (session.user?.email as string) || 'unknown'

      // Check cooldown
      const lastPlacement = await redis.get(`placement:${userId}`)
      if (lastPlacement) {
        const lastTime = parseInt(lastPlacement)
        if (Date.now() - lastTime < COOLDOWN_MS) {
          const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastTime)) / 1000)
          return res.status(429).json({ ok: false, error: 'cooldown', remainingSeconds: remaining })
        }
      }
    }

    // Payload shape: { x, y, color }
    const { x, y, color } = req.body
    if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'string' || !Number.isInteger(x) || !Number.isInteger(y)) {
      return res.status(400).json({ ok: false, error: 'invalid-payload' })
    }

    // Validate color is a valid hex
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    if (!hexRegex.test(color)) {
      return res.status(400).json({ ok: false, error: 'invalid-color' })
    }

    // Validate coordinates within configured canvas
    const cols = Math.floor(CANVAS_WIDTH / GRID)
    const rows = Math.floor(CANVAS_HEIGHT / GRID)
    if (x < 0 || y < 0 || x >= cols || y >= rows) return res.status(400).json({ ok: false, error: 'out-of-bounds', cols, rows })

    // Persist to MongoDB
    const placement = new Placement({ x, y, color, userId })
    await placement.save()

    // Invalidate snapshot cache
    await redis.del('canvas:snapshot')

    // Update cooldown in Redis
    if (!isBot && COOLDOWN_MS > 0) {
      await redis.set(`placement:${userId}`, Date.now().toString(), 'EX', Math.floor(COOLDOWN_MS / 1000))
    }

    logger.info('Placement successful', { userId, x, y, color, isBot, duration: Date.now() - start })
    return res.status(200).json({ ok: true, bot: isBot, user: isBot ? 'bot' : user, placed: 1 })
  } catch (error) {
    logger.error('Error in /api/place', { error: error.message, stack: error.stack })
    return res.status(500).json({ ok: false, error: 'internal-server-error' })
  }
}
