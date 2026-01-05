// API route for placing pixels on the canvas
// Handles authentication, validation, cooldowns, and database storage

import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from 'utils/prisma'
import redis from 'utils/redis'
import logger from 'utils/logger'
import { placementLimiter } from 'utils/rateLimit'

const CANVAS_WIDTH = parseInt(process.env.CANVAS_WIDTH || '1600', 10)
const CANVAS_HEIGHT = parseInt(process.env.CANVAS_HEIGHT || '1000', 10)
const GRID = parseInt(process.env.CANVAS_GRID || process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)
const COOLDOWN_MS = parseInt(process.env.COOLDOWN_SECONDS || '300', 10) * 1000

/**
 * Handles pixel placement requests.
 * Validates coordinates, checks cooldowns, updates database, and broadcasts changes.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now()
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' })

    // Check for bot API key (allows admin placements bypassing auth/cooldown)
    const botKey = process.env.BOT_API_KEY
    const providedKey = (req.headers['x-bot-key'] as string) || (req.headers['authorization'] as string)
    let isBot = false
    if (botKey && providedKey) {
      const raw = providedKey.startsWith('Bearer ') ? providedKey.slice(7).trim() : providedKey.trim()
      if (raw && raw === botKey) isBot = true
    }

    let user: any = null
    let userId = 'anonymous'
    let dbUser = null
    if (!isBot) {
      // Authenticate user session
      const session = await getServerSession(req, res, authOptions)
      if (!session) return res.status(401).json({ ok: false, error: 'unauthenticated' })
      user = session.user
      userId = (session.user?.email as string) || 'unknown'

      // Get or create user in database
      dbUser = await prisma.user.findUnique({ where: { email: userId } })
      if (!dbUser) {
        dbUser = await prisma.user.create({ data: { name: user.name, email: userId, image: user.image, githubId: user.id } })
      }

      // Reset daily pixel count if it's a new day
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (dbUser.lastPixelReset < today) {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { dailyPixelsUsed: 0, lastPixelReset: today }
        })
      }

      // Calculate allowed pixels: points / 5
      const allowedPixels = Math.floor(dbUser.points / 5)
      if (dbUser.dailyPixelsUsed >= allowedPixels) {
        return res.status(429).json({ ok: false, error: 'daily-limit-reached', used: dbUser.dailyPixelsUsed, allowed: allowedPixels })
      }

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

    // Persist to database
    await prisma.placement.create({ data: { x, y, color, userId: isBot ? null : dbUser.id } })

    // Publish update to Redis for realtime
    await redis.publish('canvas-updates', JSON.stringify({ x, y, color, userId: isBot ? 'bot' : dbUser.id, createdAt: new Date() }))

    // Check for event bonus
    let pointsAwarded = 1
    try {
      const eventRes = await fetch('http://localhost:3000/api/events') // Internal call
      if (eventRes.ok) {
        const eventData = await eventRes.json()
        if (eventData.event) {
          pointsAwarded = eventData.event.bonusPoints || 1
        }
      }
    } catch (e) {
      // Ignore
    }

    // Update user stats if not bot
    if (!isBot && dbUser) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { dailyPixelsUsed: { increment: 1 }, points: { increment: pointsAwarded } }
      })
    }

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
