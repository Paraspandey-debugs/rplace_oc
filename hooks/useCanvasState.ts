import { useState, useEffect, useRef } from 'react'

export const useCanvasState = (session: any) => {
  const [color, setColor] = useState<string>('#000000')
  const [tool, setTool] = useState<'pencil' | 'erase' | 'fill'>('pencil')
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [mode, setMode] = useState<'all' | 'today'>('all')
  const [forceRedraw, setForceRedraw] = useState<boolean>(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false)
  const [availablePlacements, setAvailablePlacements] = useState<string>('Loading...')
  const [currentAlliance, setCurrentAlliance] = useState<any>(null)
  const [showAlliancePanel, setShowAlliancePanel] = useState<boolean>(false)
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch available placements
  const fetchAvailable = async () => {
    if (!session?.user?.email) {
      setAvailablePlacements('Sign in to see limit')
      return
    }
    try {
      const res = await fetch('/api/me')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setAvailablePlacements(`${data.dailyPixelsUsed}/${data.allowedPixels}`)
    } catch (error) {
      console.error('Error fetching available placements:', error)
      setAvailablePlacements('Error')
    }
  }

  // Fetch current event
  const fetchEvent = async () => {
    try {
      const res = await fetch('/api/events')
      if (res.ok) {
        const data = await res.json()
        setCurrentEvent(data.event)
      }
    } catch (error) {
      console.error('Error fetching event:', error)
    }
  }

  useEffect(() => {
    fetchAvailable()
    fetchEvent()
    const interval = setInterval(fetchAvailable, 10000) // Update every 10s
    return () => clearInterval(interval)
  }, [session])

  return {
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
  }
}