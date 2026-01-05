import React, { useState, useEffect } from 'react'

interface Alliance {
  id: string
  name: string
  description: string
  memberCount: number
  createdAt: string
  ownerId: string
  canvasId?: string
  points?: number
  claimedAreasCount?: number
}

interface AllianceMember {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

interface AllianceChat {
  id: string
  userId: string
  username: string
  message: string
  timestamp: string
}

interface AlliancePanelProps {
  session: any
  currentAlliance?: Alliance
  onAllianceSelect?: (alliance: Alliance) => void
  isOpen: boolean
  onClose: () => void
}

export default function AlliancePanel({ session, currentAlliance, onAllianceSelect, isOpen, onClose }: AlliancePanelProps) {
  const [alliances, setAlliances] = useState<Alliance[]>([])
  const [showCreateAlliance, setShowCreateAlliance] = useState(false)
  const [showAllianceChat, setShowAllianceChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<AllianceChat[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newAllianceName, setNewAllianceName] = useState('')
  const [newAllianceDescription, setNewAllianceDescription] = useState('')

  // Fetch alliances on component mount
  useEffect(() => {
    const fetchAlliances = async () => {
      try {
        const response = await fetch('/api/alliances/list')
        if (response.ok) {
          const data = await response.json()
          setAlliances(data.alliances)
        }
      } catch (error) {
        console.error('Failed to fetch alliances:', error)
      }
    }

    if (session?.user?.email) {
      fetchAlliances()
    }
  }, [session])

  // Fetch chat messages when alliance is selected
  useEffect(() => {
    const fetchChatMessages = async () => {
      if (!currentAlliance) return

      try {
        const response = await fetch(`/api/alliances/chat?allianceId=${currentAlliance.id}`)
        if (response.ok) {
          const data = await response.json()
          setChatMessages(data.messages)
        }
      } catch (error) {
        console.error('Failed to fetch chat messages:', error)
      }
    }

    fetchChatMessages()
  }, [currentAlliance])

  const handleCreateAlliance = async () => {
    if (!newAllianceName.trim()) return

    try {
      const response = await fetch('/api/alliances/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newAllianceName,
          description: newAllianceDescription
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAlliances(prev => [...prev, data.alliance])
        setNewAllianceName('')
        setNewAllianceDescription('')
        setShowCreateAlliance(false)
      } else {
        const error = await response.json()
        alert(`Failed to create alliance: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create alliance:', error)
      alert('Failed to create alliance')
    }
  }

  const handleJoinAlliance = async (alliance: Alliance) => {
    try {
      const response = await fetch('/api/alliances/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          allianceId: alliance.id
        })
      })

      if (response.ok) {
        // Update local state
        setAlliances(prev => prev.map(a => a.id === alliance.id ? { ...a, memberCount: a.memberCount + 1 } : a))
        onAllianceSelect?.(alliance)
      } else {
        const error = await response.json()
        alert(`Failed to join alliance: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to join alliance:', error)
      alert('Failed to join alliance')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentAlliance) return

    try {
      const response = await fetch('/api/alliances/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          allianceId: currentAlliance.id,
          message: newMessage
        })
      })

      if (response.ok) {
        // Optimistically add message to UI
        const message: AllianceChat = {
          id: `temp-${Date.now()}`,
          userId: session?.user?.email || 'anonymous',
          username: session?.user?.name || 'Anonymous',
          message: newMessage,
          timestamp: new Date().toISOString()
        }
        setChatMessages(prev => [...prev, message])
        setNewMessage('')
      } else {
        const error = await response.json()
        alert(`Failed to send message: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    }
  }

  return (
    <>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a0033',
            border: '2px solid #aa0066',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#aa0066',
                color: '#ffffff',
                border: '2px solid #aa0066',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            <div style={{ marginTop: 16, padding: 12, background: '#1a0033', border: '2px solid #004466' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: '#aa0066', fontSize: '18px' }}>Alliance Collaboration</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowCreateAlliance(!showCreateAlliance)}
                    style={{
                      padding: '6px 12px',
                      background: '#004466',
                      color: '#ffffff',
                      border: '2px solid #aa0066',
                      fontSize: '12px'
                    }}
                  >
                    Create Alliance
                  </button>
                  {currentAlliance && (
                    <button
                      onClick={() => setShowAllianceChat(!showAllianceChat)}
                      style={{
                        padding: '6px 12px',
                        background: showAllianceChat ? '#aa0066' : '#004466',
                        color: '#ffffff',
                        border: '2px solid #aa0066',
                        fontSize: '12px'
                      }}
                    >
                      Alliance Chat
                    </button>
                  )}
                </div>
              </div>

      {/* Create Alliance Form */}
      {showCreateAlliance && (
        <div style={{ marginBottom: 12, padding: 8, background: '#0a0a0a', border: '1px solid #004466' }}>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Alliance Name"
              value={newAllianceName}
              onChange={(e) => setNewAllianceName(e.target.value)}
              style={{
                width: '100%',
                padding: '4px',
                background: '#1a0033',
                border: '1px solid #004466',
                color: '#ffffff',
                fontSize: '12px'
              }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <textarea
              placeholder="Alliance Description"
              value={newAllianceDescription}
              onChange={(e) => setNewAllianceDescription(e.target.value)}
              style={{
                width: '100%',
                height: '60px',
                padding: '4px',
                background: '#1a0033',
                border: '1px solid #004466',
                color: '#ffffff',
                fontSize: '12px',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreateAlliance}
              style={{
                padding: '4px 12px',
                background: '#aa0066',
                color: '#ffffff',
                border: '2px solid #aa0066',
                fontSize: '10px'
              }}
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateAlliance(false)}
              style={{
                padding: '4px 12px',
                background: '#004466',
                color: '#ffffff',
                border: '2px solid #aa0066',
                fontSize: '10px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Alliance List */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '14px', marginBottom: 8, color: '#aa0066' }}>Available Alliances:</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {alliances.map((alliance) => (
            <div
              key={alliance.id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: currentAlliance?.id === alliance.id ? '#aa0066' : '#0a0a0a',
                border: '1px solid #004466',
                borderRadius: '4px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>{alliance.name}</div>
              <div style={{ fontSize: '12px', color: '#cccccc', marginBottom: '8px' }}>{alliance.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#aa0066' }}>
                  {alliance.memberCount} members
                  {typeof alliance.points === 'number' ? ` • ${alliance.points} pts` : ''}
                  {typeof alliance.claimedAreasCount === 'number' ? ` • ${alliance.claimedAreasCount} claims` : ''}
                </div>
                {currentAlliance?.id === alliance.id ? (
                  <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>Joined</span>
                ) : (
                  <button
                    onClick={() => handleJoinAlliance(alliance)}
                    style={{
                      padding: '4px 12px',
                      background: '#004466',
                      color: '#ffffff',
                      border: '2px solid #aa0066',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alliance Chat */}
      {showAllianceChat && currentAlliance && (
        <div style={{ padding: 8, background: '#0a0a0a', border: '1px solid #004466', maxHeight: '300px' }}>
          <div style={{ fontSize: '12px', marginBottom: 8, color: '#aa0066' }}>
            Alliance Chat - {currentAlliance.name}
          </div>

          {/* Messages */}
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: 8 }}>
            {chatMessages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: '4px', fontSize: '10px' }}>
                <span style={{ color: '#aa0066', fontWeight: 'bold' }}>{msg.username}:</span>
                <span style={{ color: '#ffffff', marginLeft: '4px' }}>{msg.message}</span>
                <span style={{ color: '#666666', marginLeft: '8px', fontSize: '8px' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{
                flex: 1,
                padding: '4px',
                background: '#1a0033',
                border: '1px solid #004466',
                color: '#ffffff',
                fontSize: '10px'
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                padding: '4px 8px',
                background: '#aa0066',
                color: '#ffffff',
                border: '2px solid #aa0066',
                fontSize: '10px'
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Current Alliance Info */}
      {currentAlliance && (
        <div style={{ padding: 8, background: '#0a0a0a', border: '1px solid #aa0066' }}>
          <div style={{ fontSize: '12px', color: '#aa0066', marginBottom: '4px' }}>
            Current Alliance: {currentAlliance.name}
          </div>
          <div style={{ fontSize: '10px', color: '#cccccc' }}>
            {currentAlliance.description}
          </div>
          <div style={{ fontSize: '10px', color: '#666666', marginTop: '4px' }}>
            {currentAlliance.memberCount} members • Created {new Date(currentAlliance.createdAt).toLocaleDateString()}
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}