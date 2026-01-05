import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../utils/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' })

  try {
    const alliances = await prisma.alliance.findMany({
      orderBy: [
        { points: 'desc' },
        { memberCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50
    })

    const leaderboard = alliances.map(a => ({
      id: a.id,
      name: a.name,
      points: a.points,
      memberCount: a.memberCount,
      claimedAreasCount: JSON.parse(a.claimedAreas || '[]').length
    }))

    return res.status(200).json({ ok: true, leaderboard })
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: 'internal' })
  }
}
