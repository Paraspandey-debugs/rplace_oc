import { useRef, useEffect } from 'react'
import io from 'socket.io-client'

export const useCanvasDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>, mode: 'all' | 'today', forceRedraw: boolean, setForceRedraw: (b: boolean) => void, setLoading: (b: boolean) => void, loadingTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
  const lastTimestamp = useRef<number | null>(null)
  const GRID = parseInt(process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)

  useEffect(() => {
    let mounted = true
    loadingTimeoutRef.current = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 10000)

    const socket = io()

    async function fetchAndDraw() {
      try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const since = mode === 'today' ? todayStart.getTime() : lastTimestamp.current
        const url = `/api/canvas/snapshot${since ? `?since=${since}` : ''}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        if (forceRedraw) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#0a0a0a'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.strokeStyle = '#004466'
          ctx.lineWidth = 1
          for (let x = 0; x < canvas.width; x += GRID) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, canvas.height)
            ctx.stroke()
          }
          for (let y = 0; y < canvas.height; y += GRID) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(canvas.width, y)
            ctx.stroke()
          }
          setForceRedraw(false)
        }

        for (const p of data.placements || []) {
          const cellX = p.x * GRID
          const cellY = p.y * GRID
          ctx.fillStyle = p.color
          ctx.fillRect(cellX, cellY, GRID, GRID)
        }

        lastTimestamp.current = data.timestamp
        setLoading(false)
      } catch (error) {
        console.error('Error fetching canvas:', error)
      }
    }

    fetchAndDraw()

    // Listen for realtime updates
    socket.on('canvas-update', (update) => {
      if (!mounted) return
      if (mode === 'today') {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        if (new Date(update.createdAt) < todayStart) return
      }
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const cellX = update.x * GRID
      const cellY = update.y * GRID
      ctx.fillStyle = update.color
      ctx.fillRect(cellX, cellY, GRID, GRID)
    })

    return () => {
      mounted = false
      socket.disconnect()
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [mode, forceRedraw])
}