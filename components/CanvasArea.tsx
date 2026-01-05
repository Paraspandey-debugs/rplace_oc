import React, { useRef, useEffect } from 'react'

// Default canvas dimensions (can be overridden by NEXT_PUBLIC_CANVAS_WIDTH/HEIGHT/GRID env vars)
const DEFAULT_WIDTH = Math.floor(parseInt(process.env.NEXT_PUBLIC_CANVAS_WIDTH || '1600', 10) * 0.9)
const DEFAULT_HEIGHT = Math.floor(parseInt(process.env.NEXT_PUBLIC_CANVAS_HEIGHT || '1000', 10) * 0.9)
const GRID = parseInt(process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement>
  loading: boolean
}

export default function CanvasArea({ canvasRef, loading }: CanvasAreaProps) {
  // Initialize canvas with dark background, grid, and branding text
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    // Fill with dark synthwave background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, c.width, c.height)

    // Draw grid lines for pixel alignment
    ctx.strokeStyle = '#004466'
    ctx.lineWidth = 1
    for (let x = 0; x < c.width; x += GRID) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, c.height)
      ctx.stroke()
    }
    for (let y = 0; y < c.height; y += GRID) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(c.width, y)
      ctx.stroke()
    }

    // Add initial branding text in the center
    ctx.fillStyle = '#aa0066'
    ctx.font = 'bold 16px "Press Start 2P"'
    ctx.textAlign = 'center'
    ctx.fillText('OpenCode IIITA', c.width / 2, c.height / 2 - 20)
    ctx.font = '12px "Press Start 2P"'
    ctx.fillText('Synthwave Canvas', c.width / 2, c.height / 2 + 10)
    ctx.font = '8px "Press Start 2P"'
    ctx.fillText('Sign in to Paint', c.width / 2, c.height / 2 + 30)
  }, [])

  return (
    <div className="canvas-area">
      <canvas ref={canvasRef} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} style={{ border: '4px solid #004466', background: '#0a0a0a', imageRendering: 'pixelated', boxShadow: '0 0 20px rgba(0, 68, 102, 0.3)' }} />
      {loading ? (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a0033',
          color: '#aa0066',
          padding: '20px',
          border: '4px solid #004466',
          textAlign: 'center',
          fontSize: '10px',
          zIndex: 10,
          imageRendering: 'pixelated',
          boxShadow: '0 0 20px rgba(0, 68, 102, 0.5)'
        }}>
          <div>Loading OpenCode IIITA Canvas...</div>
          <div style={{ fontSize: '8px', marginTop: '10px', opacity: 0.8 }}>Synthwave Pixel Art in Progress</div>
        </div>
      ) : null}
    </div>
  )
}