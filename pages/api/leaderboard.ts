import type { NextApiRequest, NextApiResponse } from 'next'
import dbConnect from '../../utils/mongo'
import { Placement } from '../../utils/models'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method' })

  await dbConnect()

  // Aggregate top users by pixel count
  const leaderboard = await Placement.aggregate([
    {
      $group: {
        _id: '$userId',
        pixels: { $sum: 1 }
      }
    },
    {
      $sort: { pixels: -1 }
    },
    {
      $limit: 50 // top 50
    },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        pixels: 1
      }
    }
  ])

  res.json({ ok: true, leaderboard })
}