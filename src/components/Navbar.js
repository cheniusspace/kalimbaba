import { Link, useNavigate } from 'react-router-dom'
import { Sun, Moon, Heart, LogOut, Settings, Search, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import './Navbar.css'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchOpen(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <img src="/logo.svg" alt="Kalimbaba" className="navbar-logo-img" />
          <span><span className="logo-tran">Kalim</span><span className="logo-muse">baba</span></span>
        </Link>

        {/* Search expand */}
        {searchOpen && (
          <form className="navbar-search" onSubmit={handleSearch}>
            <input
              ref={inputRef}
              className="navbar-search-input"
              type="text"
              placeholder="Search songs..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="button" className="icon-btn" onClick={() => { setSearchOpen(false); setQuery('') }}>
              <X size={16} />
            </button>
          </form>
        )}

        {/* Actions */}
        <div className="navbar-actions">
          <button className="icon-btn" onClick={() => setSearchOpen(v => !v)} title="Search">
            <Search size={17} />
          </button>

          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {user ? (
            <>
              <Link to="/favorites" className="icon-btn" title="Favorites">
                <Heart size={17} />
              </Link>
              {profile?.is_admin && (
                <Link to="/admin" className="icon-btn" title="Admin">
                  <Settings size={17} />
                </Link>
              )}
              <div className="navbar-user">
                <span className="user-name">{profile?.username ?? user.email}</span>
                <button className="icon-btn" onClick={handleSignOut} title="Sign out">
                  <LogOut size={17} />
                </button>
              </div>
            </>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="navbar-login">Log in</Link>
              <Link to="/signup" className="navbar-signup">Sign up</Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  )
}
