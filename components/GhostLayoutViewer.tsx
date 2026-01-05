import React, { useState, useRef } from 'react'

interface Template {
  id: string
  name: string
  imageUrl: string
  width: number
  height: number
  thumbnailUrl?: string
}

interface GhostLayoutViewerProps {
  canvasWidth: number
  canvasHeight: number
  gridSize: number
  onPixelPlace?: (x: number, y: number, color: string) => void
}

export default function GhostLayoutViewer({ canvasWidth, canvasHeight, gridSize, onPixelPlace }: GhostLayoutViewerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [opacity, setOpacity] = useState(0.3)
  const [showTemplates, setShowTemplates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Predefined templates (you can expand this)
  const templates: Template[] = [
    {
      id: 'smiley',
      name: 'Smiley Face (20x20)',
      imageUrl: '/templates/smiley.png',
      width: 20,
      height: 20,
      thumbnailUrl: '/templates/smiley-thumb.png'
    },
    {
      id: 'heart',
      name: 'Heart (16x16)',
      imageUrl: '/templates/heart.png',
      width: 16,
      height: 16,
      thumbnailUrl: '/templates/heart-thumb.png'
    },
    {
      id: 'star',
      name: 'Star (24x24)',
      imageUrl: '/templates/star.png',
      width: 24,
      height: 24,
      thumbnailUrl: '/templates/star-thumb.png'
    },
    {
      id: 'mushroom',
      name: 'Mario Mushroom (32x32)',
      imageUrl: '/templates/mushroom.png',
      width: 32,
      height: 32,
      thumbnailUrl: '/templates/mushroom-thumb.png'
    },
    {
      id: 'pacman',
      name: 'Pac-Man (40x20)',
      imageUrl: '/templates/pacman.png',
      width: 40,
      height: 20,
      thumbnailUrl: '/templates/pacman-thumb.png'
    }
  ]

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string

        // Upload to server
        const response = await fetch('/api/templates/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageData: base64,
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            width: 32, // Default, could be detected from image
            height: 32
          })
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()

        if (result.ok) {
          setSelectedTemplate(result.template)
          setIsVisible(true)
          setShowTemplates(false)
          alert('Template uploaded successfully!')
        } else {
          throw new Error(result.error || 'Upload failed')
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload template. Please try again.')
    }
  }

  const renderGhostOverlay = () => {
    if (!isVisible || !selectedTemplate) return null

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: 'none',
          zIndex: 5
        }}
      >
        <img
          src={selectedTemplate.imageUrl}
          alt="Ghost template"
          style={{
            width: selectedTemplate.width * gridSize,
            height: selectedTemplate.height * gridSize,
            opacity: opacity,
            imageRendering: 'pixelated',
            filter: 'grayscale(100%) contrast(0.5)',
            mixBlendMode: 'multiply'
          }}
          onError={(e) => {
            console.error('Failed to load template image:', selectedTemplate.imageUrl)
            // Fallback to a simple pattern or hide
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  return (
    <>
      {/* Ghost Layout Controls */}
      <div style={{ marginTop: 8, padding: 8, background: '#1a0033', border: '2px solid #004466' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsVisible(!isVisible)}
            style={{
              padding: '4px 8px',
              background: isVisible ? '#aa0066' : '#004466',
              color: '#ffffff',
              border: '2px solid #aa0066',
              fontSize: '10px'
            }}
          >
            {isVisible ? 'Hide Ghost' : 'Show Ghost'}
          </button>

          {isVisible && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '10px', color: '#aa0066' }}>Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  style={{ width: 60 }}
                />
                <span style={{ fontSize: '10px', color: '#ffffff' }}>{Math.round(opacity * 100)}%</span>
              </div>

              <button
                onClick={() => setShowTemplates(!showTemplates)}
                style={{
                  padding: '4px 8px',
                  background: '#004466',
                  color: '#ffffff',
                  border: '2px solid #aa0066',
                  fontSize: '10px'
                }}
              >
                Templates
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '4px 8px',
                  background: '#004466',
                  color: '#ffffff',
                  border: '2px solid #aa0066',
                  fontSize: '10px'
                }}
              >
                Upload
              </button>
            </>
          )}
        </div>

        {/* Template Selection */}
        {showTemplates && (
          <div style={{
            marginTop: 8,
            padding: 8,
            background: '#0a0a0a',
            border: '1px solid #004466',
            maxHeight: 200,
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '12px', marginBottom: 8, color: '#aa0066' }}>Choose a Template:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template)
                    setIsVisible(true)
                    setShowTemplates(false)
                  }}
                  style={{
                    width: 60,
                    height: 60,
                    border: selectedTemplate?.id === template.id ? '2px solid #aa0066' : '2px solid #004466',
                    cursor: 'pointer',
                    background: '#1a0033',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    textAlign: 'center',
                    color: '#ffffff'
                  }}
                >
                  {template.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ghost Overlay */}
      {renderGhostOverlay()}
    </>
  )
}