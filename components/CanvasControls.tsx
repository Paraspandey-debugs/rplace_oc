import React from 'react'

interface CanvasControlsProps {
  tool: 'pencil' | 'erase' | 'fill'
  setTool: (tool: 'pencil' | 'erase' | 'fill') => void
  mode: 'all' | 'today'
  setMode: (mode: 'all' | 'today') => void
  setForceRedraw: (force: boolean) => void
}

export default function CanvasControls({ tool, setTool, mode, setMode, setForceRedraw }: CanvasControlsProps) {
  return (
    <div className="controls">
      {/* Tool selection buttons */}
      <button className={`tool-button ${tool==='pencil'?'active':''}`} onClick={() => setTool('pencil')}>Pencil</button>
      <button className={`tool-button ${tool==='erase'?'active':''}`} onClick={() => setTool('erase')}>Eraser</button>
      <button className={`tool-button ${tool==='fill'?'active':''}`} onClick={() => setTool('fill')}>Fill</button>
      <button className={`tool-button ${mode==='today'?'active':''}`} onClick={() => { setMode(mode === 'all' ? 'today' : 'all'); setForceRedraw(true); }}>{mode === 'all' ? 'Show Today' : 'Show All'}</button>
    </div>
  )
}