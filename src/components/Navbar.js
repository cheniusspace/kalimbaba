import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Sun,
  Moon,
  Heart,
  LogOut,
  Settings,
  Search,
  X,
  ChevronDown,
  User,
  Menu,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import './Navbar.css'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const songsNavActive =
    pathname === '/' || pathname === '/catalog' || pathname.startsWith('/song/')
  const toolsNavActive = pathname.startsWith('/tools')
  const resourcesNavActive = pathname.startsWith('/resources')
  const contactNavActive = pathname.startsWith('/contact')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined
    function onKeyDown(/** @type {KeyboardEvent} */ e) {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!userMenuOpen) return undefined
    function onPointerDown(/** @type {PointerEvent} */ e) {
      const el = userMenuRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) setUserMenuOpen(false)
    }
    function onKeyDown(/** @type {KeyboardEvent} */ e) {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [userMenuOpen])

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchOpen(false)
      setMobileMenuOpen(false)
    }
  }

  async function handleSignOut() {
    setUserMenuOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className={`container navbar-inner${searchOpen ? ' navbar-inner--search' : ''}`}>
        {/* Logo */}
        <Link to="/" className="navbar-logo font-title">
          <img src="/logo.svg" alt="Kalimbaba" className="navbar-logo-img" />
          <span><span className="logo-tran">Kalim</span><span className="logo-muse">baba</span></span>
        </Link>

        <nav className="navbar-primary navbar-primary--desktop font-nav" aria-label="Main sections">
          <Link
            to="/"
            className={`navbar-link${songsNavActive ? ' navbar-link--active' : ''}`}
          >
            Songs
          </Link>
          <Link
            to="/tools"
            className={`navbar-link${toolsNavActive ? ' navbar-link--active' : ''}`}
          >
            Tools
          </Link>
          <Link
            to="/resources"
            className={`navbar-link${resourcesNavActive ? ' navbar-link--active' : ''}`}
          >
            Resources
          </Link>
        </nav>

        {searchOpen ? (
          <form className="navbar-grow navbar-search" onSubmit={handleSearch}>
            <input
              ref={inputRef}
              className="navbar-search-input"
              type="text"
              placeholder="Search songs..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setSearchOpen(false)
                setQuery('')
              }}
            >
              <X size={16} />
            </button>
          </form>
        ) : (
          <div className="navbar-grow navbar-spacer" aria-hidden="true" />
        )}

        {/* Actions */}
        <div className="navbar-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v)
              setMobileMenuOpen(false)
            }}
            title="Search"
          >
            <Search size={17} />
          </button>

          <button type="button" className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {user ? (
            <div className="navbar-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="navbar-user-trigger"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-controls="navbar-user-dropdown"
                id="navbar-user-menu-button"
                aria-label={`Account menu, ${profile?.username ?? user.email}`}
                onClick={() => {
                  setUserMenuOpen((o) => !o)
                  setMobileMenuOpen(false)
                }}
              >
                <User size={16} className="navbar-user-trigger-avatar" aria-hidden="true" />
                <span className="navbar-user-trigger-name" aria-hidden="true">
                  {profile?.username ?? user.email}
                </span>
                <ChevronDown
                  size={16}
                  className={`navbar-user-trigger-chevron${userMenuOpen ? ' navbar-user-trigger-chevron--open' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {userMenuOpen ? (
                <div
                  id="navbar-user-dropdown"
                  className="navbar-user-dropdown card"
                  role="menu"
                  aria-labelledby="navbar-user-menu-button"
                >
                  <Link
                    to="/favorites"
                    className="navbar-user-dropdown-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Heart size={15} className="navbar-user-dropdown-item-icon" aria-hidden="true" />
                    Favorites
                  </Link>
                  {profile?.is_admin ? (
                    <Link
                      to="/admin"
                      className="navbar-user-dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings size={15} className="navbar-user-dropdown-item-icon" aria-hidden="true" />
                      Add &amp; edit songs
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="navbar-user-dropdown-item navbar-user-dropdown-item--signout"
                    role="menuitem"
                    onClick={handleSignOut}
                  >
                    <LogOut size={15} className="navbar-user-dropdown-item-icon" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="navbar-login">Log in</Link>
              <Link to="/signup" className="navbar-signup">Sign up</Link>
            </div>
          )}

          <button
            type="button"
            className="navbar-menu-toggle"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="navbar-mobile-panel"
            onClick={() => {
              setMobileMenuOpen((o) => !o)
              setSearchOpen(false)
              setUserMenuOpen(false)
            }}
          >
            {mobileMenuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
        </div>

      </div>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="navbar-mobile-backdrop"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="navbar-mobile-panel"
            className="navbar-mobile-panel font-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <Link
              to="/"
              className={`navbar-mobile-link${songsNavActive ? ' navbar-mobile-link--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Songs
            </Link>
            <Link
              to="/tools"
              className={`navbar-mobile-link${toolsNavActive ? ' navbar-mobile-link--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Tools
            </Link>
            <Link
              to="/resources"
              className={`navbar-mobile-link${resourcesNavActive ? ' navbar-mobile-link--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Resources
            </Link>
            <Link
              to="/contact"
              className={`navbar-mobile-link${contactNavActive ? ' navbar-mobile-link--active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        </>
      ) : null}
    </nav>
  )
}
