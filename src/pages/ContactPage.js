import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import './AuthPage.css'
import './ContactPage.css'

const MAX_MESSAGE = 5000
const MAX_SUBJECT = 200
const MAX_NAME = 100

export default function ContactPage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmedEmail = email.trim()
    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()
    const trimmedName = name.trim()

    if (!trimmedEmail || !trimmedSubject || !trimmedMessage) {
      setError('Email, subject, and message are required.')
      return
    }

    setLoading(true)
    const row = {
      name: trimmedName || null,
      email: trimmedEmail,
      subject: trimmedSubject.slice(0, MAX_SUBJECT),
      message: trimmedMessage.slice(0, MAX_MESSAGE),
      user_id: user?.id ?? null,
    }

    const { error: insertError } = await supabase.from('contact_messages').insert(row)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setName('')
    setEmail('')
    setSubject('')
    setMessage('')
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="contact-page">
        <SEO
          title="Contact"
          description="Say hello to Kalimbaba—feedback and ideas welcome."
          canonicalPath="/contact"
        />
        <div className="container contact-inner">
          <div className="contact-card card">
            <p className="contact-script font-script">Thanks</p>
            <h1 className="contact-title font-title">Sent</h1>
            <p className="contact-lead">We’ll reply soon.</p>
            <Link to="/" className="btn btn-primary contact-back">
              Browse
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="contact-page">
      <SEO
        title="Contact"
        description="Say hello to Kalimbaba—feedback and ideas welcome."
        canonicalPath="/contact"
      />
      <div className="container contact-inner">
        <div className="contact-card card">
          <header className="contact-header">
            <p className="contact-script font-script">Hi friends</p>
            <h1 className="contact-title font-title">Say hello</h1>
            <p className="contact-lead">
              Tab wishes, a fix you noticed, or just hi—we read it all and we’re glad you’re here.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="field">
              <label className="field-label" htmlFor="contact-name">Name (optional)</label>
              <input
                id="contact-name"
                className="field-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value.slice(0, MAX_NAME))}
                placeholder="Name"
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="contact-subject">Subject</label>
              <input
                id="contact-subject"
                className="field-input"
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value.slice(0, MAX_SUBJECT))}
                placeholder="Topic"
                required
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                className="field-input contact-textarea"
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                placeholder="Your message…"
                required
                rows={3}
              />
              <span className="contact-char-count">{message.length} / {MAX_MESSAGE}</span>
            </div>

            {error && <p className="contact-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary contact-submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
