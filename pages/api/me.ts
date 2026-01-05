import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../utils/prisma'
import redis from '../../utils/redis'

const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
const LEADERBOARD_CACHE_KEY = 'leaderboard:cache'
const LEADERBOARD_CACHE_TTL = 300 // 5 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ ok: false })

  const userId = session.user.email || 'unknown'

  // Get user from DB
  const dbUser = await prisma.user.findUnique({ where: { email: userId } })
  let points = 0
  let dailyPixelsUsed = 0
  let allowedPixels = 10
  if (dbUser) {
    // Update points from external leaderboard (with caching)
    try {
      let leaderboard = await redis.get(LEADERBOARD_CACHE_KEY)
      if (!leaderboard) {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/external-leaderboard`)
        const data = await response.json()
        if (data.ok) {
          leaderboard = JSON.stringify(data.leaderboard)
          await redis.setex(LEADERBOARD_CACHE_KEY, LEADERBOARD_CACHE_TTL, leaderboard)
        }
      }
      
      if (leaderboard) {
        const leaderboardData = JSON.parse(leaderboard)
        const entry = leaderboardData.find((e: any) => e.username === session.user.name)
        if (entry) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { points: entry.points }
          })
          points = entry.points
        } else {
          points = dbUser.points
        }
      } else {
        points = dbUser.points
      }
    } catch (error) {
      console.error('Error updating points from leaderboard:', error)
      points = dbUser.points
    }
    // Check daily reset
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dbUser.lastPixelReset < today) {
      // Reset daily pixels and update last reset time
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { dailyPixelsUsed: 0, lastPixelReset: today }
      })
      dailyPixelsUsed = 0
    } else {
      dailyPixelsUsed = dbUser.dailyPixelsUsed
    }
    allowedPixels = Math.floor(points / 5)
    // Give new users a minimum of 10 pixels to get started
    if (allowedPixels < 10) {
      allowedPixels = 10
    }
  }

  // Get pixel count
  const pixelCount = await prisma.placement.count({ where: { userId } })

  // Get cooldown
  const lastPlacement = await redis.get(`placement:${userId}`)
  let cooldownRemaining = 0
  if (lastPlacement) {
    const lastTime = parseInt(lastPlacement)
    const elapsed = Date.now() - lastTime
    if (elapsed < COOLDOWN_MS) {
      cooldownRemaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
    }
  }

  res.json({ ok: true, user: session.user, pixels: pixelCount, points, dailyPixelsUsed, allowedPixels, cooldownSeconds: cooldownRemaining })
}
