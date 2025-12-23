import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/Auth.css'

const API_URL = 'http://localhost:4000'

interface SignupProps {
  onLogin: (token: string) => void
}

export default function Signup({ onLogin }: SignupProps) {
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If backend returns Zod issues array, map to readable messages
        const message = Array.isArray(data?.error)
          ? data.error.map((iss: any) => iss.message).join(', ')
          : (data?.error || 'Signup failed')
        throw new Error(message)
      }

      onLogin(data.token)
      navigate('/rooms')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Premium Christmas Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
      
      {/* Winter night gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-indigo-900/40"></div>
      
      {/* Festive bokeh lights - larger and more prominent */}
      <div className="absolute top-20 left-20 w-48 h-48 bg-red-500/15 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-32 right-32 w-56 h-56 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute bottom-32 left-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-20 right-20 w-52 h-52 bg-yellow-300/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
      
      {/* Enhanced snow effect with many more particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="snowflake-premium" style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${0.8 + Math.random() * 1.2}rem`,
            opacity: 0.3 + Math.random() * 0.6
          }}>❄</div>
        ))}
      </div>
      
      {/* Left tree decoration */}
      <div className="absolute left-8 top-1/2 transform -translate-y-1/2 opacity-40 pointer-events-none hidden lg:block">
        <div className="text-8xl animate-bounce" style={{animationDuration: '4s', color: '#10b981'}}>🎄</div>
      </div>
      
      {/* Right tree decoration */}
      <div className="absolute right-8 top-1/2 transform -translate-y-1/2 opacity-40 pointer-events-none hidden lg:block">
        <div className="text-8xl animate-bounce" style={{animationDuration: '4.5s', color: '#10b981'}}>🎄</div>
      </div>
      
      {/* Premium Glassmorphism Card */}
      <div className="w-full max-w-md mx-4 bg-white/15 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/40 border border-white/20 p-10 relative z-10 ring-1 ring-white/10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white mb-3 drop-shadow-lg">Join the Party</h1>
          <p className="text-white/80 text-base font-light tracking-wide">Create your festive account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white font-semibold mb-3 text-sm tracking-wide">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              pattern="^[a-zA-Z0-9_]{3,20}$"
              title="3-20 characters; letters, numbers, underscore only"
              className="w-full px-5 py-3 bg-white/30 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-300/60 focus:border-transparent transition-all duration-300 font-medium"
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-3 text-sm tracking-wide">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min 8 chars)"
              required
              minLength={8}
              className="w-full px-5 py-3 bg-white/30 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-300/60 focus:border-transparent transition-all duration-300 font-medium"
            />
          </div>

          {error && (
            <div className="bg-red-500/30 backdrop-blur-md border border-red-400/40 text-red-100 px-5 py-3 rounded-xl text-sm font-medium shadow-lg">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/60 hover:scale-[1.03] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none tracking-wide"
          >
            {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-center text-white/80 text-sm mt-7 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-200 font-bold hover:text-blue-100 transition-all duration-300 underline underline-offset-2">
            Sign in here
          </Link>
        </p>
      </div>
      
      <style>{`
        @keyframes snowfall-premium {
          0% { 
            transform: translateY(-100vh) translateX(0) rotateZ(0deg); 
            opacity: 1; 
          }
          50% { 
            opacity: 0.8;
          }
          100% { 
            transform: translateY(100vh) translateX(150px) rotateZ(360deg); 
            opacity: 0; 
          }
        }
        
        .snowflake-premium {
          position: absolute;
          top: -100vh;
          color: rgba(255, 255, 255, 0.8);
          animation: snowfall-premium linear infinite;
          filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5));
        }
      `}</style>
    </div>
  )
}
