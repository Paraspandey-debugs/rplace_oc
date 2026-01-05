import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import connectToDatabase from '../../../utils/mongo'
import { Alliance } from '../../../utils/models'
import { z } from 'zod'

const joinGuildSchema = z.object({
  guildId: z.string()
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

    const { guildId } = joinGuildSchema.parse(req.body)

    await connectToDatabase()

    // Check if alliance exists
    const guild = await (Alliance as any).findById(guildId as string)
    if (!guild) {
      return res.status(404).json({ error: 'Alliance not found' })
    }

    // Check if user is already a member of this alliance
    const isMember = guild.members.some(member => member.userId === session.user.email)
    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this alliance' })
    }

    // Check if user is already in another alliance and remove them
    const existingMembership = await ((Alliance as any).findOne({
      'members.userId': session.user.email
    }) as any)

    if (existingMembership) {
      // Remove from old alliance
      existingMembership.members = existingMembership.members.filter(
        member => member.userId !== session.user.email
      )
      existingMembership.memberCount = existingMembership.members.length
      await existingMembership.save()
    }

    // Add user to new alliance
    guild.members.push({
      userId: session.user.email,
      username: session.user.name,
      role: 'member',
      joinedAt: new Date()
    })
    guild.memberCount = guild.members.length
    await guild.save()

    return res.status(200).json({ ok: true })

  } catch (error) {
    console.error('Guild join error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}