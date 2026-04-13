import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">

        <div className="footer-brand">
          <img src="/logo.svg" alt="Kalimbaba" className="footer-logo-img" />
          <span className="footer-logo-text">
            <span className="logo-tran">Kalim</span><span className="logo-muse">baba</span>
          </span>
          <p className="footer-tagline">Beautiful kalimba tabs for every level.</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <span className="footer-col-title">Explore</span>
            <Link to="/">Browse songs</Link>
            <Link to="/favorites">My favorites</Link>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Account</span>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </div>
        </div>

      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Kalimbaba. All rights reserved.</p>
      </div>
    </footer>
  )
}
