import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../utils/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' })

  const { userId } = req.query
  if (!userId || typeof userId !== 'string') return res.status(400).json({ ok: false, error: 'userId required' })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const count = await prisma.placement.count({
    where: {
      userId,
      createdAt: { gte: today }
    }
  })

  res.status(200).json({ ok: true, count })
}