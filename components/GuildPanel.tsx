import React, { useState, useEffect } from 'react'

interface Guild {
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

interface GuildMember {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

interface GuildChat {
  id: string
  userId: string
  username: string
  message: string
  timestamp: string
}

interface GuildPanelProps {
  session: any
  currentGuild?: Guild
  onGuildSelect?: (guild: Guild) => void
  isOpen: boolean
  onClose: () => void
}

export default function GuildPanel({ session, currentGuild, onGuildSelect, isOpen, onClose }: GuildPanelProps) {
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [showCreateGuild, setShowCreateGuild] = useState(false)
  const [showGuildChat, setShowGuildChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<GuildChat[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newGuildName, setNewGuildName] = useState('')
  const [newGuildDescription, setNewGuildDescription] = useState('')

  // Fetch guilds on component mount
  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const response = await fetch('/api/guilds/list')
        if (response.ok) {
          const data = await response.json()
          setGuilds(data.guilds)
        }
      } catch (error) {
        console.error('Failed to fetch guilds:', error)
      }
    }

    if (session?.user?.email) {
      fetchGuilds()
    }
  }, [session])

  // Fetch chat messages when guild is selected
  useEffect(() => {
    const fetchChatMessages = async () => {
      if (!currentGuild) return

      try {
        const response = await fetch(`/api/guilds/chat?guildId=${currentGuild.id}`)
        if (response.ok) {
          const data = await response.json()
          setChatMessages(data.messages)
        }
      } catch (error) {
        console.error('Failed to fetch chat messages:', error)
      }
    }

    fetchChatMessages()
  }, [currentGuild])

  const handleCreateGuild = async () => {
    if (!newGuildName.trim()) return

    try {
      const response = await fetch('/api/guilds/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newGuildName,
          description: newGuildDescription
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGuilds(prev => [...prev, data.guild])
        setNewGuildName('')
        setNewGuildDescription('')
        setShowCreateGuild(false)
      } else {
        const error = await response.json()
        alert(`Failed to create guild: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create guild:', error)
      alert('Failed to create guild')
    }
  }

  const handleJoinGuild = async (guild: Guild) => {
    try {
      const response = await fetch('/api/guilds/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guildId: guild.id
        })
      })

      if (response.ok) {
        // Update local state
        setGuilds(prev => prev.map(g => g.id === guild.id ? { ...g, memberCount: g.memberCount + 1 } : g))
        onGuildSelect?.(guild)
      } else {
        const error = await response.json()
        alert(`Failed to join guild: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to join guild:', error)
      alert('Failed to join guild')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentGuild) return

    try {
      const response = await fetch('/api/guilds/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guildId: currentGuild.id,
          message: newMessage
        })
      })

      if (response.ok) {
        // Optimistically add message to UI
        const message: GuildChat = {
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
                <h3 style={{ margin: 0, color: '#aa0066', fontSize: '18px' }}>Guild Collaboration</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowCreateGuild(!showCreateGuild)}
                    style={{
                      padding: '6px 12px',
                      background: '#004466',
                      color: '#ffffff',
                      border: '2px solid #aa0066',
                      fontSize: '12px'
                    }}
                  >
                    Create Guild
                  </button>
                  {currentGuild && (
                    <button
                      onClick={() => setShowGuildChat(!showGuildChat)}
                      style={{
                        padding: '6px 12px',
                        background: showGuildChat ? '#aa0066' : '#004466',
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
      {showCreateGuild && (
        <div style={{ marginBottom: 12, padding: 8, background: '#0a0a0a', border: '1px solid #004466' }}>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Alliance Name"
              value={newGuildName}
              onChange={(e) => setNewGuildName(e.target.value)}
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
              value={newGuildDescription}
              onChange={(e) => setNewGuildDescription(e.target.value)}
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
              onClick={handleCreateGuild}
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
              onClick={() => setShowCreateGuild(false)}
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
          {guilds.map((guild) => (
            <div
              key={guild.id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: currentGuild?.id === guild.id ? '#aa0066' : '#0a0a0a',
                border: '1px solid #004466',
                borderRadius: '4px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>{guild.name}</div>
              <div style={{ fontSize: '12px', color: '#cccccc', marginBottom: '8px' }}>{guild.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#aa0066' }}>
                  {guild.memberCount} members
                  {typeof guild.points === 'number' ? ` • ${guild.points} pts` : ''}
                  {typeof guild.claimedAreasCount === 'number' ? ` • ${guild.claimedAreasCount} claims` : ''}
                </div>
                {currentGuild?.id === guild.id ? (
                  <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 'bold' }}>Joined</span>
                ) : (
                  <button
                    onClick={() => handleJoinGuild(guild)}
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
      {showGuildChat && currentGuild && (
        <div style={{ padding: 8, background: '#0a0a0a', border: '1px solid #004466', maxHeight: '300px' }}>
          <div style={{ fontSize: '12px', marginBottom: 8, color: '#aa0066' }}>
            Alliance Chat - {currentGuild.name}
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
      {currentGuild && (
        <div style={{ padding: 8, background: '#0a0a0a', border: '1px solid #aa0066' }}>
          <div style={{ fontSize: '12px', color: '#aa0066', marginBottom: '4px' }}>
            Current Alliance: {currentGuild.name}
          </div>
          <div style={{ fontSize: '10px', color: '#cccccc' }}>
            {currentGuild.description}
          </div>
          <div style={{ fontSize: '10px', color: '#666666', marginTop: '4px' }}>
            {currentGuild.memberCount} members • Created {new Date(currentGuild.createdAt).toLocaleDateString()}
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