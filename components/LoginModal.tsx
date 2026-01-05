import React from 'react'

interface LoginModalProps {
  showLoginPrompt: boolean
  setShowLoginPrompt: (show: boolean) => void
}

export default function LoginModal({ showLoginPrompt, setShowLoginPrompt }: LoginModalProps) {
  if (!showLoginPrompt) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1a0033',
        color: '#aa0066',
        padding: '20px',
        border: '4px solid #004466',
        textAlign: 'center',
        fontSize: '12px',
        imageRendering: 'pixelated',
        boxShadow: '0 0 20px rgba(0, 68, 102, 0.5)'
      }}>
        <div>Please sign in to place pixels</div>
        <button onClick={() => setShowLoginPrompt(false)} style={{
          marginTop: '10px',
          padding: '5px 10px',
          background: '#004466',
          color: '#aa0066',
          border: '2px solid #aa0066'
        }}>Close</button>
      </div>
    </div>
  )
}