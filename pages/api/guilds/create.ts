import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import connectToDatabase from '../../../utils/mongo'
import { Alliance } from '../../../utils/models'
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

    await connectToDatabase()

    // Check if alliance name already exists
    const existingAlliance = await (Alliance as any).findOne({ name })
    if (existingAlliance) {
      return res.status(400).json({ error: 'Alliance name already exists' })
    }

    // Create new alliance
    const guild = new Alliance({
      name,
      description,
      ownerId: session.user.email,
      memberCount: 1,
      members: [{
        userId: session.user.email,
        username: session.user.name,
        role: 'owner',
        joinedAt: new Date()
      }],
      canvasId: `alliance-${Date.now()}`
    })

    const savedGuild = await guild.save()

    return res.status(201).json({
      ok: true,
      guild: {
        id: savedGuild._id.toString(),
        name: savedGuild.name,
        description: savedGuild.description,
        memberCount: savedGuild.memberCount,
        createdAt: savedGuild.createdAt.toISOString(),
        ownerId: savedGuild.ownerId,
        canvasId: savedGuild.canvasId,
        points: savedGuild.points || 0,
        claimedAreasCount: (savedGuild.claimedAreas || []).length
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