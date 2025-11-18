import { getSession } from 'next-auth/react'
import type { NextApiRequest, NextApiResponse } from 'next'
import dbConnect from '../../utils/mongo'
import { Placement } from '../../utils/models'
import redis from '../../utils/redis'

const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })
  if (!session) return res.status(401).json({ ok: false })

  await dbConnect()

  const userId = session.user.email || 'unknown'

  // Get pixel count
  const pixelCount = await Placement.countDocuments({ userId })

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

  res.json({ ok: true, user: session.user, pixels: pixelCount, cooldownSeconds: cooldownRemaining })
}
