import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Rooms.css'

const API_URL = 'http://localhost:4000'

interface Room {
  id: string
  name: string
  createdAt: string
}

interface RoomsProps {
  onLogout: () => void
}

export default function Rooms({ onLogout }: RoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoomName, setNewRoomName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    if (!token) {
      setError('No authentication token found')
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch rooms')
      
      const data = await response.json()
      setRooms(data.rooms || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newRoomName }),
      })

      const data = await response.json()
      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Failed to create room'
        throw new Error(message)
      }
      setRooms([...rooms, data.room])
      setNewRoomName('')
      setShowCreateModal(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const joinRoom = async (roomId: string) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to join room')

      navigate(`/chat/${roomId}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium Christmas Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-indigo-900/40"></div>
      
      {/* Festive bokeh lights */}
      <div className="absolute top-20 left-20 w-48 h-48 bg-red-500/15 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-32 right-32 w-56 h-56 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute bottom-32 left-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      
      {/* Snow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="snowflake-app" style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${0.8 + Math.random() * 1.2}rem`,
            opacity: 0.3 + Math.random() * 0.5
          }}>❄</div>
        ))}
      </div>
      
      <div className="rooms-container">
        <header className="rooms-header">
          <h1 className="text-4xl font-black text-white drop-shadow-lg">🎄 Festive Rooms</h1>
          <div className="header-actions gap-4">
            <button onClick={() => setShowCreateModal(true)} className="btn-create-premium">
              + Create Room
            </button>
            <button onClick={handleLogout} className="btn-logout-premium">
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <div className="text-white text-center py-12 text-lg">Loading rooms...</div>
        ) : error ? (
          <div className="bg-red-500/30 backdrop-blur-md border border-red-400/40 text-red-100 px-6 py-4 rounded-xl font-medium">{error}</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/80 text-lg font-light">✨ No rooms yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card-premium" onClick={() => joinRoom(room.id)}>
                <div className="text-3xl mb-3">💬</div>
                <h3 className="text-xl font-bold text-white mb-2">{room.name}</h3>
                <p className="text-white/70 text-sm font-light">
                  Created {new Date(room.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white/15 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/40 border border-white/20 p-8 w-96 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-3xl font-black text-white mb-6 drop-shadow-lg">Create Room</h2>
              <form onSubmit={createRoom}>
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-3 text-sm tracking-wide">ROOM NAME</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                    autoFocus
                    required
                    className="w-full px-5 py-3 bg-white/30 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-300/60 focus:border-transparent transition-all duration-300 font-medium"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 px-4 bg-white/20 text-white font-bold rounded-xl transition-all duration-300 hover:bg-white/30">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/60 transition-all duration-300">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes snowfall-app {
          0% { 
            transform: translateY(-100vh) translateX(0) rotateZ(0deg); 
            opacity: 1; 
          }
          100% { 
            transform: translateY(100vh) translateX(150px) rotateZ(360deg); 
            opacity: 0; 
          }
        }
        
        .snowflake-app {
          position: absolute;
          top: -100vh;
          color: rgba(255, 255, 255, 0.8);
          animation: snowfall-app linear infinite;
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
        }
      `}</style>
    </div>
  )
}
