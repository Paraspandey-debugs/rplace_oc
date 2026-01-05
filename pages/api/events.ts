import type { NextApiRequest, NextApiResponse } from 'next'

// Simple event system: define events by date
const events = [
  {
    id: 'christmas',
    name: 'Christmas Special',
    description: 'Festive colors and double points!',
    start: new Date('2025-12-21T00:00:00Z'),
    end: new Date('2025-12-26T00:00:00Z'),
    palette: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'],
    bonusPoints: 2
  }
  // Add more events
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const now = new Date()
  const currentEvent = events.find(e => now >= e.start && now <= e.end)

  if (currentEvent) {
    res.json({ ok: true, event: currentEvent })
  } else {
    res.json({ ok: true, event: null })
  }
}