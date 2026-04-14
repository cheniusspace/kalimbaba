import { Link } from 'react-router-dom'
import { ChevronRight, Piano, Sparkles } from 'lucide-react'
import SEO from '../components/SEO'
import './ToolsPage.css'

export default function ToolsPage() {
  return (
    <div className="hub-page tools-page">
      <SEO
        title="Tools"
        description="Free kalimba tools from Kalimbaba: play a virtual 17-key kalimba in your browser, with more utilities coming soon."
        canonicalPath="/tools"
      />
      <div className="container hub-page-inner">
        <header className="hub-header">
          <p className="hub-kicker font-nav">Kalimbaba</p>
          <h1 className="hub-title font-title">Tools</h1>
          <p className="hub-lead">
            Practice and explore without leaving the site. Start with the virtual instrument; we will add
            more helpers here over time.
          </p>
        </header>

        <ul className="tools-grid" role="list">
          <li>
            <Link to="/tools/virtual-kalimba" className="tools-card card">
              <span className="tools-card-icon" aria-hidden="true">
                <Piano size={28} strokeWidth={1.25} />
              </span>
              <h2 className="tools-card-title font-nav">Virtual Kalimba</h2>
              <p className="tools-card-desc">
                17-key C major, computer keyboard mapping, solfege, letters, and scale degrees.
              </p>
              <span className="tools-card-cta font-nav">
                Open
                <ChevronRight className="tools-card-cta-icon" size={16} strokeWidth={2} aria-hidden />
              </span>
            </Link>
          </li>
          <li>
            <div className="tools-card tools-card--soon card">
              <span className="tools-card-icon tools-card-icon--muted" aria-hidden="true">
                <Sparkles size={28} strokeWidth={1.25} />
              </span>
              <h2 className="tools-card-title font-nav">More soon</h2>
              <p className="tools-card-desc">
                Tuners, tab helpers, and other small utilities are on our list—check back later.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}
