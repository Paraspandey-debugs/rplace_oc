import React, { useRef, useEffect } from 'react'
import styles from '../styles/Canvas.module.css'
import ColorPalette from './ColorPalette'
import CanvasControls from './CanvasControls'
import CanvasArea from './CanvasArea'
import LoginModal from './LoginModal'
import GhostLayoutViewer from './GhostLayoutViewer'
import AlliancePanel from './AlliancePanel' // Renamed from GuildPanel
import { useCanvasState } from '../hooks/useCanvasState'
import { useCanvasDrawing } from '../hooks/useCanvasDrawing'

// Default color palette
const DEFAULT_COLORS = ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff']

// Default canvas dimensions (can be overridden by NEXT_PUBLIC_CANVAS_WIDTH/HEIGHT/GRID env vars)
const DEFAULT_WIDTH = Math.floor(parseInt(process.env.NEXT_PUBLIC_CANVAS_WIDTH || '1600', 10) * 0.9)
const DEFAULT_HEIGHT = Math.floor(parseInt(process.env.NEXT_PUBLIC_CANVAS_HEIGHT || '1000', 10) * 0.9)
const GRID = parseInt(process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)

/**
 * Main Canvas component for the r/place-like collaborative drawing application.
 * Handles user interactions, pixel placement, and real-time canvas updates.
 */
export default function Canvas({ session }: { session: any }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const {
    color, setColor,
    tool, setTool,
    loading, setLoading,
    errorMessage, setErrorMessage,
    mode, setMode,
    forceRedraw, setForceRedraw,
    showLoginPrompt, setShowLoginPrompt,
    availablePlacements,
    currentAlliance, setCurrentAlliance,
    showAlliancePanel, setShowAlliancePanel,
    currentEvent,
    loadingTimeoutRef
  } = useCanvasState(session)

  useCanvasDrawing(canvasRef, mode, forceRedraw, setForceRedraw, setLoading, loadingTimeoutRef)

  // Handle user painting interactions (click/drag to place pixels)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return



    // Paint a single pixel at the clicked position
    async function paintAt(clientX: number, clientY: number) {
      if (!session?.user) {
        setShowLoginPrompt(true)
        return;
      }

      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const cellX = Math.floor(x / GRID)
      const cellY = Math.floor(y / GRID)
      const colorToUse = tool === 'erase' ? '#ffffff' : color

      // Capture the current color before drawing for potential revert on failure
      const prevImageData = ctx.getImageData(cellX * GRID, cellY * GRID, 1, 1)
      const prevR = prevImageData.data[0]
      const prevG = prevImageData.data[1]
      const prevB = prevImageData.data[2]
      const prevColor = `#${prevR.toString(16).padStart(2, '0')}${prevG.toString(16).padStart(2, '0')}${prevB.toString(16).padStart(2, '0')}`

      // Optimistically draw the pixel on the canvas
      ctx.fillStyle = colorToUse
      // Ensure sharp pixels
      if ('imageSmoothingEnabled' in ctx) (ctx as any).imageSmoothingEnabled = false
      ctx.fillRect(cellX * GRID, cellY * GRID, GRID, GRID)

      // Send placement request to server
      const res = await fetch('/api/place', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: cellX, y: cellY, color: colorToUse })
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'cooldown') {
          setErrorMessage(`On cooldown for ${data.remainingSeconds} seconds`)
        } else {
          setErrorMessage('Failed to place pixel')
        }
        // Revert the local change if server rejects the placement
        ctx.fillStyle = prevColor
        ctx.fillRect(cellX * GRID, cellY * GRID, GRID, GRID)
        return
      }

      setErrorMessage('')
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
  }, [color, tool, session])

  return (
    <div className={styles.canvasContainer}>
      {/* Window-like container with title bar and content */}
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
        {currentEvent && (
          <div style={{ background: '#aa0066', color: '#ffffff', padding: '5px', textAlign: 'center', fontSize: '12px' }}>
            🎉 {currentEvent.name}: {currentEvent.description}
          </div>
        )}
        {/* Toolbar with tools, colors, and settings */}
        <div className="toolbar">
          <CanvasControls
            tool={tool}
            setTool={setTool}
            mode={mode}
            setMode={setMode}
            setForceRedraw={setForceRedraw}
          />

          <ColorPalette
            color={color}
            setColor={setColor}
          />

          <GhostLayoutViewer
            canvasWidth={DEFAULT_WIDTH}
            canvasHeight={DEFAULT_HEIGHT}
            gridSize={GRID}
          />

          <button
            onClick={() => setShowAlliancePanel(true)}
            style={{
              padding: '4px 8px',
              background: currentAlliance ? '#aa0066' : '#004466',
              color: '#ffffff',
              border: '2px solid #aa0066',
              fontSize: '10px',
              cursor: 'pointer'
            }}
            title={currentAlliance ? `Current Alliance: ${currentAlliance.name}` : 'Open Alliance Panel'}
          >
            {currentAlliance ? '🏰' : 'Alliances'}
          </button>

          <AlliancePanel
            session={session}
            currentAlliance={currentAlliance}
            onAllianceSelect={setCurrentAlliance}
            isOpen={showAlliancePanel}
            onClose={() => setShowAlliancePanel(false)}
          />

          {/* Status display */}
          <div className="status">{errorMessage || `Tool: ${tool} • ${availablePlacements} • Color: `}<span style={{ display:'inline-block', width:14, height:14, border:'1px solid #000', background:color }} /></div>
        </div>

        {/* Canvas area with the painting surface */}
        <CanvasArea
          canvasRef={canvasRef}
          loading={loading}
        />

        <LoginModal
          showLoginPrompt={showLoginPrompt}
          setShowLoginPrompt={setShowLoginPrompt}
        />
        </div>
      </div>
    </div>

  )
}
