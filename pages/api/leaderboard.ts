import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../utils/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' })

  // Get top users by pixel count
  const leaderboard = await prisma.$queryRaw`
    SELECT userId, COUNT(*) as pixels
    FROM Placement
    GROUP BY userId
    ORDER BY pixels DESC
    LIMIT 50
  `

  res.json({ ok: true, leaderboard })
}