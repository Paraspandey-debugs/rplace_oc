import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const mkdir = promisify(fs.mkdir)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method' })
  }

  try {
    const { imageData, name, width, height } = req.body

    if (!imageData || !name) {
      return res.status(400).json({ ok: false, error: 'Missing image data or name' })
    }

    // Create templates directory if it doesn't exist
    const templatesDir = path.join(process.cwd(), 'public', 'templates')
    try {
      await mkdir(templatesDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
    const filepath = path.join(templatesDir, filename)

    // Convert base64 to buffer and save
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    await writeFile(filepath, buffer as any)

    // Return template info
    const template = {
      id: `upload-${timestamp}`,
      name: name,
      imageUrl: `/templates/${filename}`,
      width: parseInt(width) || 32,
      height: parseInt(height) || 32,
      uploadedAt: new Date().toISOString()
    }

    res.status(200).json({ ok: true, template })
  } catch (error) {
    console.error('Template upload error:', error)
    res.status(500).json({ ok: false, error: 'Upload failed' })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}