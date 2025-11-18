import React, { useRef, useEffect, useState } from 'react'

// Canvas component for collaborative pixel painting
// Simulates r/place with grid-based painting, real-time updates, and tools

// Default canvas dimensions (can be overridden by NEXT_PUBLIC_CANVAS_WIDTH/HEIGHT/GRID env vars)
const DEFAULT_WIDTH = parseInt(process.env.NEXT_PUBLIC_CANVAS_WIDTH || '1600', 10)
const DEFAULT_HEIGHT = parseInt(process.env.NEXT_PUBLIC_CANVAS_HEIGHT || '1000', 10)
const GRID = parseInt(process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)

// Default color palette
const DEFAULT_COLORS = ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff']

// Generate extended palette using HSL for more color variety
function generatePalette(): string[] {
  const out: string[] = []
  const sats = [100, 75, 50]
  for (let s of sats) {
    for (let h = 0; h < 360; h += 15) {
      out.push(`hsl(${h} ${s}% 50%)`)
    }
  }
  return out
}
const EXTENDED_PALETTE = generatePalette()

export default function Canvas({ session }: { session: any }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [color, setColor] = useState<string>(DEFAULT_COLORS[0])
  const [tool, setTool] = useState<'pencil'|'erase'|'line'>('pencil')
  const [size, setSize] = useState<number>(1)
  const [lineStart, setLineStart] = useState<{x: number, y: number} | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

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

  // Poll server for canvas snapshot updates every second
  const lastTimestamp = useRef<number | null>(null)
  useEffect(() => {
    let mounted = true
    async function fetchAndDraw() {
      try {
        // Request diff since last update for efficiency
        const url = `/api/canvas/snapshot${lastTimestamp.current ? `?since=${lastTimestamp.current}` : ''}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        // Draw server-placed pixels (full or diff)
        for (const p of data.placements || []) {
          const px = p.x * GRID
          const py = p.y * GRID
          ctx.fillStyle = p.color
          ctx.fillRect(px, py, GRID, GRID)
          // Update timestamp for next diff
          const ts = new Date(p.createdAt).getTime()
          if (!lastTimestamp.current || ts > lastTimestamp.current) {
            lastTimestamp.current = ts
          }
        }
        setLoading(false) // Hide loading overlay after first draw
      } catch (e) {
        // Ignore fetch errors
      }
    }

    fetchAndDraw()
    const id = setInterval(fetchAndDraw, 1000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  // Handle user painting interactions (click/drag to place pixels)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Bresenham's line algorithm for drawing straight lines
    function getLinePixels(x0: number, y0: number, x1: number, y1: number): {x: number, y: number}[] {
      const pixels = []
      const dx = Math.abs(x1 - x0)
      const dy = Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx - dy

      while (true) {
        pixels.push({x: x0, y: y0})
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 > -dy) {
          err -= dy
          x0 += sx
        }
        if (e2 < dx) {
          err += dx
          y0 += sy
        }
      }
      return pixels
    }

    // Paint a single pixel at the clicked position
    function paintAt(clientX: number, clientY: number) {
      // Temporarily allow painting without auth for testing
      // if (!session?.user) {
      //   console.log('Please sign in to place pixels');
      //   return;
      // }

      const rect = canvas.getBoundingClientRect()
      const x = Math.floor((clientX - rect.left))
      const y = Math.floor((clientY - rect.top))
      const cellX = Math.floor(x / GRID)
      const cellY = Math.floor(y / GRID)
      const colorToUse = tool === 'erase' ? '#ffffff' : color

      if (tool === 'line') {
        if (lineStart) {
          // Complete the line and place all pixels
          const pixels = getLinePixels(lineStart.x, lineStart.y, cellX, cellY)
          const placements = pixels.map(p => ({ x: p.x, y: p.y, color: colorToUse }))
          // Draw locally immediately
          pixels.forEach(p => {
            ctx.fillStyle = colorToUse
            ctx.fillRect(p.x * GRID, p.y * GRID, GRID, GRID)
          })
          // Send to server
          fetch('/api/place', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(placements)
          }).catch(e => console.error('Place failed', e))
          setLineStart(null)
        } else {
          // Start line at this position
          setLineStart({x: cellX, y: cellY})
        }
        return
      }

      // For pencil/erase: place single pixel
      ctx.fillStyle = colorToUse
      // Ensure sharp pixels
      if ('imageSmoothingEnabled' in ctx) (ctx as any).imageSmoothingEnabled = false
      ctx.fillRect(cellX * GRID, cellY * GRID, GRID, GRID)

      // Send placement to server
      fetch('/api/place', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: cellX, y: cellY, color: colorToUse })
      }).catch(e => console.error('Place failed', e))
    }

    // Event listeners for mouse painting
    function onDown(e: MouseEvent) {
      paintAt(e.clientX, e.clientY)
    }

    // Removed drag painting to enforce per-click placement

    canvas.addEventListener('mousedown', onDown)

    // Touch support for mobile
    function onTouchStart(ev: TouchEvent) {
      ev.preventDefault()
      paintAt(ev.touches[0].clientX, ev.touches[0].clientY)
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('touchstart', onTouchStart)
    }
  }, [color, tool, size, session])

  return (
    // Window-like container with title bar and content
    <div className="window">
      <div className="titlebar">
        <div className="title-left">
          <div className="title-dots">
            {/* Fake window controls */}
            <div className="dot close" />
            <div className="dot min" />
            <div className="dot max" />
          </div>
          <div style={{ marginLeft: 8 }}>OpenCode IIITA - Collaborative Canvas</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>Real-time Pixel Art • Sign in to Paint</div>
      </div>

      <div className="content">
        {/* Toolbar with tools, colors, and settings */}
        <div className="toolbar">
          <div className="controls">
            {/* Tool selection buttons */}
            <button className={`tool-button ${tool==='pencil'?'active':''}`} onClick={() => setTool('pencil')}>Pencil</button>
            <button className={`tool-button ${tool==='erase'?'active':''}`} onClick={() => setTool('erase')}>Eraser</button>
            <button className={`tool-button ${tool==='line'?'active':''}`} onClick={() => setTool('line')}>Line</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ fontSize:12, marginRight:8 }}>Brush</label>
            {/* Brush size selector (currently unused) */}
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ padding:4 }}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
            </select>
          </div>

          {/* Color palette */}
          <div className="palette">
            {/* Default colors */}
            {DEFAULT_COLORS.map((c) => (
              <div key={c} className="palette-color" style={{ background: c }} onClick={() => setColor(c)} />
            ))}
            <div style={{ width:8 }} />
            {/* Custom color picker */}
            <input aria-label="color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>

          {/* Extended palette */}
          <div style={{ marginLeft: 12, display: 'flex', gap:6, alignItems:'center' }}>
            <div style={{ fontSize:12, marginRight:8 }}>Palette</div>
            <div style={{ display:'flex', flexWrap:'wrap', maxWidth:360, gap:6 }}>
              {EXTENDED_PALETTE.slice(0, 24).map((c, idx) => (
                <div key={idx} title={c} className="palette-color" style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          {/* Status display */}
          <div className="status">Tool: {tool} • Color: <span style={{ display:'inline-block', width:14, height:14, border:'1px solid #000', background:color }} /></div>
        </div>

        {/* Canvas area with the painting surface */}
        <div className="canvas-area">
          <canvas ref={canvasRef} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} style={{ border: '4px solid #004466', background: '#0a0a0a', imageRendering: 'pixelated', boxShadow: '0 0 20px rgba(0, 68, 102, 0.3)' }} />
          {/* Loading overlay shown initially */}
          {loading && (
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
          )}
        </div>
      </div>
    </div>
  )
}
