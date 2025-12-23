import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/Chat.css'

const WS_URL = 'ws://localhost:8080'
const API_URL = 'http://localhost:4000'

interface Message {
  id: string
  content: string
  userId: string
  username: string
  createdAt: string
}

interface ChatProps {
  token: string
}

export default function Chat({ token }: ChatProps) {
  const { roomId } = useParams<{ roomId: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [connected, setConnected] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const isMountedRef = useRef(true)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectDelayRef = useRef(1000)
  type PendingOutbound = { msgId: string; content: string; createdAt: string }
  const outboxRef = useRef<PendingOutbound[]>([])
  const pendingMessagesRef = useRef(new Map<string, PendingOutbound>())
  const receivedMsgIdsRef = useRef(new Set<string>()) // Track received message IDs to avoid duplicates
  const [reconnectKey, setReconnectKey] = useState(0)
  const [followLatest, setFollowLatest] = useState(true)

  // Extract user ID from JWT token
  useEffect(() => {
    try {
      const payload = token.split('.')[1]
      const decoded = JSON.parse(atob(payload))
      setCurrentUserId(decoded.userId || decoded.sub || '')
    } catch (err) {
      console.error('Failed to decode token:', err)
    }
  }, [token])

  useEffect(() => {
    isMountedRef.current = true
    
    if (!roomId || !token) {
      console.log('Missing roomId or token, skipping connection');
      return
    }
    
    // Immediately close any existing WebSocket before creating a new one
    if (wsRef.current) {
      console.log('Closing previous WebSocket before creating new one');
      wsRef.current.close()
      wsRef.current = null
    }

    const connectionId = Math.random().toString(36).substring(7)
    console.log(`[${connectionId}] Connecting to WebSocket...`);
    // Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}`)
    wsRef.current = ws
    
    // Track if we successfully opened to filter React Strict Mode errors
    let didOpen = false

    ws.onopen = () => {
      if (!isMountedRef.current) return
      didOpen = true
      reconnectDelayRef.current = 1000; // reset backoff on successful connect
      console.log('WebSocket connected')
      setConnected(true)
      // Authenticate first
      console.log('Sending auth message...');
      ws.send(JSON.stringify({ type: 'auth', token }))
    }

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return
      try {
        const data = JSON.parse(event.data)
        console.log('Received message:', data);

        if (data.type === 'auth-success') {
          console.log('Auth successful, joining room:', roomId);
          // After auth succeeds, join the room
          ws.send(JSON.stringify({ type: 'join-room', roomId }))
          // Fetch history over HTTP
          fetch(`${API_URL}/rooms/${roomId}/history`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((items) => {
              if (!isMountedRef.current) return
              const mapped = (items || []).map((m: any) => ({
                id: m.id,
                content: m.body ?? m.content,
                userId: m.senderId,
                username: m.sender?.username ?? m.senderId,
                createdAt: m.createdAt,
              }))
              // Reset dedupe set to allow re-populating after reconnect
              receivedMsgIdsRef.current.clear()
              mapped.forEach((m: Message) => receivedMsgIdsRef.current.add(m.id))
              // Drop any pending entries that already arrived via history
              pendingMessagesRef.current.forEach((pending, key) => {
                if (receivedMsgIdsRef.current.has(pending.msgId)) {
                  pendingMessagesRef.current.delete(key)
                }
              })
              setMessages(mapped)
            })
            .catch(() => {})
        } else if (data.type === 'join-room-success') {
          console.log('Join room confirmed, roomId:', data.roomId);
          // Mark as joined and flush any queued messages
          setJoined(true)
          const pending = [...outboxRef.current]
          outboxRef.current = []
          console.log('Flushing queued messages:', pending.length);
          if (pending.length && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            for (const queued of pending) {
              console.log('Sending queued message:', queued.content);
              pendingMessagesRef.current.set(queued.msgId, queued)
              wsRef.current.send(
                JSON.stringify({ type: 'send-message', roomId, content: queued.content, msgId: queued.msgId })
              )
            }
          }
        } else if (data.type === 'send-message-success') {
          const pending = pendingMessagesRef.current.get(data.clientMsgId)
          if (pending) {
            const messageId = data.serverMsgId || pending.msgId
            if (!receivedMsgIdsRef.current.has(messageId)) {
              receivedMsgIdsRef.current.add(messageId)
              setMessages((prev) => [...prev, {
                id: messageId,
                content: pending.content,
                userId: currentUserId,
                username: 'You',
                createdAt: data.sentAt || pending.createdAt,
              }])
            }
            pendingMessagesRef.current.delete(data.clientMsgId)
          }
        } else if (data.type === 'message') {
          // Filter messages by roomId - only accept messages for the current room
          if (data.roomId && data.roomId !== roomId) {
            console.log('Ignoring message from different room:', data.roomId, 'current room:', roomId);
            return;
          }
          
          // Skip if we've already received this message (avoid duplicates from direct echo + pub/sub)
          if (receivedMsgIdsRef.current.has(data.id)) {
            console.log('Duplicate message ignored:', data.id);
            return;
          }
          receivedMsgIdsRef.current.add(data.id);
          // Clear from pending map if it was waiting for ack
          pendingMessagesRef.current.forEach((pending, key) => {
            if (pending.msgId === data.id) {
              pendingMessagesRef.current.delete(key)
            }
          })
          
          const mapped = {
            id: data.id,
            content: data.content ?? data.body,
            userId: data.senderId,
            username: data.username ?? data.senderId,
            createdAt: data.createdAt,
          }
          setMessages((prev) => [...prev, mapped])
        } else if (data.type === 'error') {
          console.error('WebSocket error message:', data);
          setError(data.message || data.error || 'WebSocket error')
        }
      } catch (err) {
        console.error('Failed to parse message:', err)
      }
    }

    ws.onerror = (error) => {
      if (!isMountedRef.current) return
      // Only log real errors - React Strict Mode causes transient errors on mount
      if (didOpen || ws.readyState !== WebSocket.CLOSED) {
        console.error('WebSocket error:', error)
        setError('Connection error')
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      if (isMountedRef.current) {
        setConnected(false)
        setJoined(false)
        // Schedule reconnect with backoff (max ~10s)
        if (!reconnectTimerRef.current) {
          const delay = Math.min(reconnectDelayRef.current, 10000)
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null
            if (isMountedRef.current) {
              setReconnectKey((k) => k + 1)
            }
          }, delay)
          reconnectDelayRef.current = Math.min(delay * 2, 10000)
          console.log('Scheduled reconnect in', delay, 'ms')
        }
      }
    }

    return () => {
      isMountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      console.log('Cleaning up WebSocket connection');
      ws.close()
      // Clear the ref so sendMessage won't use this closed socket
      if (wsRef.current === ws) {
        wsRef.current = null
      }
    }
  }, [roomId, token, reconnectKey, currentUserId])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    // Any manual scroll stops following until user explicitly jumps back
    setFollowLatest(false)
  }

  useEffect(() => {
    if (!followLatest) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, followLatest])

  const scrollToBottom = () => {
    setFollowLatest(true)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content) return

    const ws = wsRef.current
    const isOpen = ws && ws.readyState === WebSocket.OPEN
    const msgId = crypto.randomUUID() // Add unique ID to track duplicates
    const createdAt = new Date().toISOString()
    const pendingEntry: PendingOutbound = { msgId, content, createdAt }
    
    console.log('Attempting to send message:', { msgId, content, isOpen, joined, queuedCount: outboxRef.current.length });
    
    if (!isOpen || !joined) {
      // Queue until connection is fully ready and joined
      console.log('Message queued - not ready:', { isOpen, joined });
      outboxRef.current.push(pendingEntry)
      setNewMessage('')
      return
    }

    console.log('Sending message immediately with ID:', msgId);
    pendingMessagesRef.current.set(msgId, pendingEntry)
    ws!.send(
      JSON.stringify({
        type: 'send-message',
        roomId,
        content,
        msgId, // Include client-generated ID
      })
    )

    setNewMessage('')
  }

  const leaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    navigate('/rooms')
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Premium Christmas Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-indigo-900/40"></div>
      
      {/* Festive bokeh lights */}
      <div className="absolute top-20 left-20 w-48 h-48 bg-red-500/15 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute top-32 right-32 w-56 h-56 bg-green-400/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{animationDelay: '1s'}}></div>
      
      {/* Snow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="snowflake-chat" style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${0.8 + Math.random() * 1.2}rem`,
            opacity: 0.3 + Math.random() * 0.5
          }}>❄</div>
        ))}
      </div>
      
      <header className="chat-header-premium relative z-10">
        <button onClick={leaveRoom} className="btn-back-premium">
          ← Back to Rooms
        </button>
        <div className="connection-status-premium">
          <span className={`status-indicator-premium ${connected ? 'connected' : 'disconnected'}`} />
          <span className="text-white/80 font-medium">{connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
        </div>
      </header>

      <div
        className="messages-container-premium"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        onWheel={handleScroll}
        onTouchMove={handleScroll}
      >
        {error && <div className="bg-red-500/30 backdrop-blur-md border border-red-400/40 text-red-100 px-6 py-4 rounded-xl font-medium mx-4 my-2">{error}</div>}
        
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/60 text-lg font-light">✨ No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {messages.map((message) => {
              const isSender = message.userId === currentUserId
              return (
                <div key={message.id} className={`flex w-full ${isSender ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} max-w-[65%]`}>
                    {/* Username - Always visible and prominent */}
                    <span className={`text-xs font-bold mb-1 ${
                      isSender 
                        ? 'text-green-300' 
                        : 'text-blue-200'
                    }`}>
                      {isSender ? '🫵 You' : `👤 ${message.username}`}
                    </span>
                    
                    {/* Message Bubble */}
                    <div className={`px-4 py-2 rounded-2xl transition-all duration-200 break-words leading-relaxed ${
                      isSender 
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white rounded-br-sm shadow-md' 
                        : 'bg-white/85 text-gray-900 rounded-bl-sm shadow-sm'
                    }`}>
                      {message.content}
                    </div>
                    
                    {/* Timestamp */}
                    <span className={`text-[11px] text-white/50 mt-1 ${isSender ? 'text-right' : 'text-left'} w-full`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!followLatest && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-6 px-4 py-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition"
        >
          Jump to latest
        </button>
      )}

      <form onSubmit={sendMessage} className="message-input-form-premium relative z-10">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input-premium"
        />
        <button type="submit" disabled={!newMessage.trim()} className="btn-send-premium">
          ✈️ Send
        </button>
      </form>
      
      <style>{`
        @keyframes snowfall-chat {
          0% { 
            transform: translateY(-100vh) translateX(0) rotateZ(0deg); 
            opacity: 1; 
          }
          100% { 
            transform: translateY(100vh) translateX(150px) rotateZ(360deg); 
            opacity: 0; 
          }
        }
        
        .snowflake-chat {
          position: absolute;
          top: -100vh;
          color: rgba(255, 255, 255, 0.8);
          animation: snowfall-chat linear infinite;
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
        }
      `}</style>
    </div>
  )
}
