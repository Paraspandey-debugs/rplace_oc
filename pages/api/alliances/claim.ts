import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const claimSchema = z.object({
  allianceId: z.string(),
  x: z.number().int().nonnegative(),
  y: z.number().int().positive().max(200),
  width: z.number().int().positive().max(200),
  height: z.number().int().positive().max(200)
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ ok: false, error: 'unauthenticated' })
    }

    const { allianceId, x, y, width, height } = claimSchema.parse(req.body)

    const member = await prisma.allianceMember.findFirst({
      where: { allianceId, userId: session.user.email }
    })
    if (!member) {
      return res.status(403).json({ ok: false, error: 'not-a-member' })
    }

    // Only owner/admin can claim
    if (member.role !== 'owner' && member.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'insufficient-role' })
    }

    // Get alliance
    const alliance = await prisma.alliance.findUnique({ where: { id: allianceId } })
    if (!alliance) {
      return res.status(404).json({ ok: false, error: 'alliance-not-found' })
    }

    // Simple cap to avoid unbounded growth
    const maxClaims = 25
    const existingClaims = JSON.parse(alliance.claimedAreas || '[]')
    if (existingClaims.length >= maxClaims) {
      return res.status(429).json({ ok: false, error: 'claim-limit-reached', maxClaims })
    }

    const newClaims = [...existingClaims, { x, y, width, height }]
    await prisma.alliance.update({
      where: { id: allianceId },
      data: {
        claimedAreas: JSON.stringify(newClaims),
        points: { increment: 50 }
      }
    })

    return res.status(200).json({
      ok: true,
      alliance: {
        id: alliance.id,
        points: alliance.points + 50,
        claimedAreasCount: newClaims.length
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'invalid-payload', details: error.errors })
    }
    return res.status(500).json({ ok: false, error: 'internal' })
  }
}
