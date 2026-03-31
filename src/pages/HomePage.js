import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SongCard from '../components/SongCard'
import './HomePage.css'

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSongs() {
      const { data: popularData } = await supabase
        .from('songs')
        .select('*')
        .eq('is_published', true)
        .order('play_count', { ascending: false })
        .limit(4)

      const { data: recentData } = await supabase
        .from('songs')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6)

      setFeatured(popularData ?? [])
      setRecent(recentData ?? [])
      setLoading(false)
    }
    fetchSongs()
  }, [])

  return (
    <div className="home-page">

      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <p className="hero-script font-script">Welcome to</p>
          <h1 className="hero-title font-title">KALIMBA GO</h1>
          <p className="hero-subtitle">Beautiful kalimba tabs for every song you love</p>
          <div className="hero-actions">
            <Link to="/catalog" className="btn btn-primary">Browse Catalog</Link>
            <Link to="/signup" className="btn btn-outline">Join Free</Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      {!loading && featured.length > 0 && (
        <section className="home-section">
          <div className="container">
            <h2 className="section-title font-title">Most Popular</h2>
            <div className="song-grid">
              {featured.map(song => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent */}
      {!loading && recent.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title font-title">Recently Added</h2>
              <Link to="/catalog" className="section-link">View all →</Link>
            </div>
            <div className="song-grid">
              {recent.map(song => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && featured.length === 0 && (
        <section className="home-section">
          <div className="container empty-state">
            <p className="font-script empty-script">Coming soon</p>
            <p className="empty-text">Songs are being added. Check back soon!</p>
          </div>
        </section>
      )}

    </div>
  )
}
