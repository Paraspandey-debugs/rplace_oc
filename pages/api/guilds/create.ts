import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const createGuildSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200)
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'unauthenticated' })
    }

    const { name, description } = createGuildSchema.parse(req.body)

    // Check if alliance name already exists
    const existingAlliance = await prisma.alliance.findUnique({
      where: { name }
    })
    if (existingAlliance) {
      return res.status(400).json({ error: 'Alliance name already exists' })
    }

    // Create new alliance with member
    const guild = await prisma.alliance.create({
      data: {
        name,
        description,
        ownerId: session.user.email!,
        canvasId: `alliance-${Date.now()}`,
        claimedAreas: '[]',
        members: {
          create: {
            userId: session.user.email!,
            username: session.user.name!,
            role: 'owner'
          }
        }
      },
      include: {
        members: true
      }
    })

    return res.status(201).json({
      ok: true,
      guild: {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        memberCount: guild.memberCount,
        createdAt: guild.createdAt.toISOString(),
        ownerId: guild.ownerId,
        canvasId: guild.canvasId,
        points: guild.points,
        claimedAreasCount: JSON.parse(guild.claimedAreas || '[]').length
      }
    })

  } catch (error) {
    console.error('Guild creation error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}