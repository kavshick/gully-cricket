import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Setup   from './pages/Setup.jsx'
import Match   from './pages/Match.jsx'
import Umpire  from './pages/Umpire.jsx'
import History from './pages/History.jsx'
import Stats   from './pages/Stats.jsx'

const NAV = [
  { path: '/',        label: 'Match',   icon: '🏏' },
  { path: '/umpire',  label: 'Camera',  icon: '📹' },
  { path: '/history', label: 'History', icon: '📋' },
  { path: '/stats',   label: 'Stats',   icon: '📊' },
]

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  // hide nav during active match scoring
  const hideNav = location.pathname.startsWith('/match')

  return (
    <>
      <Routes>
        <Route path="/"        element={<Setup />} />
        <Route path="/match"   element={<Match />} />
        <Route path="/umpire"  element={<Umpire />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats"   element={<Stats />} />
      </Routes>

      {!hideNav && (
        <nav className="bottom-nav" style={{ left: '50%', transform: 'translateX(-50%)', maxWidth: 480, width: '100%' }}>
          {NAV.map(n => (
            <button
              key={n.path}
              className={`nav-btn ${location.pathname === n.path ? 'active' : ''}`}
              onClick={() => navigate(n.path)}
            >
              <span style={{ fontSize: 20 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      )}
    </>
  )
}
