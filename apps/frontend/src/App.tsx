import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Rooms from './pages/Rooms'
import Chat from './pages/Chat'

function App() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
    }
  }, [])

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/rooms" /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/signup" 
          element={token ? <Navigate to="/rooms" /> : <Signup onLogin={handleLogin} />} 
        />
        <Route 
          path="/rooms" 
          element={token ? <Rooms onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/chat/:roomId" 
          element={token ? <Chat token={token} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={token ? "/rooms" : "/login"} />} />
      </Routes>
    </Router>
  )
}

export default App
