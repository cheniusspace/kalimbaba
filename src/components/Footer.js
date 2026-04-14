import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="footer-brand">
          <img src="/logo.svg" alt="Kalimbaba" className="footer-logo-img" />
          <span className="footer-logo-text font-title">
            <span className="logo-tran">Kalim</span><span className="logo-muse">baba</span>
          </span>
        </Link>

        <nav className="footer-nav">
          <Link to="/">Songs</Link>
          <Link to="/tools">Tools</Link>
          <Link to="/resources">Resources</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/favorites">Favorites</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </nav>

        <p className="footer-copy">© {new Date().getFullYear()} Kalimbaba</p>
      </div>
    </footer>
  )
}
