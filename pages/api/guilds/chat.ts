import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import connectToDatabase from '../../../utils/mongo'
import { Alliance, AllianceChat } from '../../../utils/models'
import { z } from 'zod'

const sendMessageSchema = z.object({
  guildId: z.string(),
  message: z.string().min(1).max(500)
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Send message
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session?.user?.email) {
        return res.status(401).json({ error: 'unauthenticated' })
      }

      const { guildId, message } = sendMessageSchema.parse(req.body)
      await connectToDatabase()

      // Check if user is member of alliance
      const alliance = await (Alliance as any).findById(guildId as string)
      if (!alliance) {
        return res.status(404).json({ error: 'Alliance not found' })
      }

      const isMember = alliance.members.some(member => member.userId === session.user.email)
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this alliance' })
      }

      // Add message to alliance chat
      const chatMessage = new AllianceChat({
        allianceId: guildId,
        userId: session.user.email,
        username: session.user.name,
        message
      })

      await chatMessage.save()

      return res.status(201).json({ ok: true })

    } catch (error) {
      console.error('Send message error:', error)
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors })
      }
      return res.status(500).json({ error: 'Internal server error' })
    }

  } else if (req.method === 'GET') {
    // Get messages
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session?.user?.email) {
        return res.status(401).json({ error: 'unauthenticated' })
      }

      const { guildId } = req.query
      if (!guildId || typeof guildId !== 'string') {
        return res.status(400).json({ error: 'Alliance ID required' })
      }
      await connectToDatabase()

      // Check if user is member of alliance
      const alliance = await (Alliance as any).findById(guildId as string)
      if (!alliance) {
        return res.status(404).json({ error: 'Alliance not found' })
      }

      const isMember = alliance.members.some(member => member.userId === session.user.email)
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this alliance' })
      }

      // Get recent messages (last 50)
      const messages = await ((AllianceChat as any).find({ allianceId: guildId }) as any)
        .sort({ timestamp: -1 })
        .limit(50)

      const formattedMessages = messages.reverse().map(msg => ({
        id: msg._id.toString(),
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        timestamp: msg.timestamp.toISOString()
      }))

      return res.status(200).json({
        ok: true,
        messages: formattedMessages
      })

    } catch (error) {
      console.error('Get messages error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}