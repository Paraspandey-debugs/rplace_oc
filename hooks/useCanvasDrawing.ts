import { useRef, useEffect, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'

export const useCanvasDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>, mode: 'all' | 'today', forceRedraw: boolean, setForceRedraw: (b: boolean) => void, setLoading: (b: boolean) => void, loadingTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
  const lastTimestamp = useRef<number | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const GRID = parseInt(process.env.NEXT_PUBLIC_CANVAS_GRID || '20', 10)

  const fetchAndDraw = useCallback(async (since?: Date | null) => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const sinceParam = since || (mode === 'today' ? todayStart : lastTimestamp.current ? new Date(lastTimestamp.current) : null)
      const url = `/api/canvas/snapshot${sinceParam ? `?since=${sinceParam.getTime()}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
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
  }, [mode, forceRedraw, setForceRedraw, setLoading, GRID])

  useEffect(() => {
    let mounted = true
    loadingTimeoutRef.current = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 10000)

    // Initialize socket connection
    if (!socketRef.current) {
      socketRef.current = io()
    }

    const socket = socketRef.current

    // Initial fetch
    fetchAndDraw()

    // Listen for realtime updates
    const handleCanvasUpdate = (update: any) => {
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
    }

    socket.on('canvas-update', handleCanvasUpdate)

    return () => {
      mounted = false
      socket.off('canvas-update', handleCanvasUpdate)
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [mode, fetchAndDraw, setLoading, GRID])

  // Handle mode changes by refetching
  useEffect(() => {
    fetchAndDraw()
  }, [mode, fetchAndDraw])
}