import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../utils/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'unauthenticated' })
    }

    // Get all alliances
    const alliances = await prisma.alliance.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Format for frontend
    const formattedAlliances = alliances.map(alliance => ({
      id: alliance.id,
      name: alliance.name,
      description: alliance.description,
      memberCount: alliance.memberCount,
      createdAt: alliance.createdAt.toISOString(),
      ownerId: alliance.ownerId,
      canvasId: alliance.canvasId,
      points: alliance.points,
      claimedAreasCount: JSON.parse(alliance.claimedAreas || '[]').length
    }))

    return res.status(200).json({
      ok: true,
      alliances: formattedAlliances
    })

  } catch (error) {
    console.error('Alliance list error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}