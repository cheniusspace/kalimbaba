import { Link, useNavigate } from 'react-router-dom'
import { Sun, Moon, Heart, User, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import './Navbar.css'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo font-title">
          <span className="logo-tran">Kalimba</span>
          <span className="logo-muse">baba</span>
        </Link>

        {/* Nav links */}
        <div className="navbar-links font-nav">
          <Link to="/catalog" className="nav-link">Catalog</Link>
        </div>

        {/* Right actions */}
        <div className="navbar-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              <Link to="/favorites" className="icon-btn" title="Favorites">
                <Heart size={18} />
              </Link>
              {profile?.is_admin && (
                <Link to="/admin" className="icon-btn" title="Admin">
                  <Settings size={18} />
                </Link>
              )}
              <div className="navbar-user">
                <span className="user-name">{profile?.username ?? user.email}</span>
                <button className="icon-btn" onClick={handleSignOut} title="Sign out">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="btn btn-outline" style={{ padding: '7px 16px', fontSize: '0.8rem' }}>
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.8rem' }}>
                Sign up
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  )
}
