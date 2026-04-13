import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SEO from '../components/SEO'
import './AuthPage.css'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, username)
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <SEO
        title="Create Account"
        description="Join Kalimbaba for free. Save your favourite tabs and start learning kalimba today."
        canonicalPath="/signup"
      />
      <div className="auth-card card">
        <div className="auth-header">
          <p className="auth-script font-script">Join us</p>
          <h1 className="auth-title font-title">KALIMBABA</h1>
          <div className="auth-divider" />
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="yourname"
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="at least 6 characters"
              minLength={6}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
