import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const joinAllianceSchema = z.object({
  allianceId: z.string()
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

    const { allianceId } = joinAllianceSchema.parse(req.body)

    // Check if alliance exists
    const alliance = await prisma.alliance.findUnique({
      where: { id: allianceId },
      include: { members: true }
    })
    if (!alliance) {
      return res.status(404).json({ error: 'Alliance not found' })
    }

    // Check if user is already a member of this alliance
    const isMember = alliance.members.some(member => member.userId === session.user.email)
    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this alliance' })
    }

    // Check if user is already in another alliance and remove them
    const existingMembership = await prisma.allianceMember.findFirst({
      where: { userId: session.user.email }
    })

    if (existingMembership) {
      // Remove from old alliance
      await prisma.allianceMember.delete({ where: { id: existingMembership.id } })
      await prisma.alliance.update({
        where: { id: existingMembership.allianceId },
        data: { memberCount: { decrement: 1 } }
      })
    }

    // Add user to new alliance
    await prisma.allianceMember.create({
      data: {
        allianceId,
        userId: session.user.email,
        username: session.user.name || '',
        role: 'member'
      }
    })
    await prisma.alliance.update({
      where: { id: allianceId },
      data: { memberCount: { increment: 1 } }
    })

    return res.status(200).json({ ok: true })

  } catch (error) {
    console.error('Guild join error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}