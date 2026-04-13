import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import './SongPage.css'

export default function SongPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { dark } = useTheme()
  const [song, setSong] = useState(null)
  const [tabs, setTabs] = useState([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSong()
  }, [slug])

  useEffect(() => {
    if (user && song) checkFavorite()
  }, [user, song])

  async function fetchSong() {
    const { data: songData } = await supabase
      .from('songs')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (!songData) { setLoading(false); return }

    const { data: tabData } = await supabase
      .from('tabs')
      .select('*')
      .eq('song_id', songData.id)
      .order('line_order', { ascending: true })

    // Increment play count
    await supabase.from('songs').update({ play_count: (songData.play_count ?? 0) + 1 }).eq('id', songData.id)

    setSong(songData)
    setTabs(tabData ?? [])
    setLoading(false)
  }

  async function checkFavorite() {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('song_id', song.id)
      .single()
    setIsFavorited(!!data)
  }

  async function toggleFavorite() {
    if (!user) return
    if (isFavorited) {
      await supabase.from('favorites').delete()
        .eq('user_id', user.id).eq('song_id', song.id)
      setIsFavorited(false)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, song_id: song.id })
      setIsFavorited(true)
    }
  }

  if (loading) return <div className="song-loading">Loading...</div>
  if (!song) return <div className="song-loading">Song not found.</div>

  return (
    <div className="song-page">
      <div className="container song-inner">

        {/* Header */}
        <header className="song-header">
          <h1 className="song-title font-title">{song.title}</h1>
          <p className="song-script font-script">Kalimba Tab</p>
          <div className="song-divider" aria-hidden="true" />
          <div className="song-meta">
            {song.genre && <span className="tag">{song.genre}</span>}
            {song.difficulty && <span className="tag">{song.difficulty}</span>}
            {user && (
              <button
                className={`fav-btn ${isFavorited ? 'active' : ''}`}
                onClick={toggleFavorite}
              >
                <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
                {isFavorited ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </header>

        {/* Tab Card */}
        <main className="tab-card card">
          {tabs.map((tab, i) => {
            const shaded = dark ? i % 2 === 0 : i >= 2 && i % 2 === 0
            return (
            <div key={tab.id} className={`tab-row ${shaded ? 'shaded' : ''}`}>
              <div className="pairs">
                {tab.notes.map((n, j) => (
                  <div key={j} className="pair">
                    <span className="note font-tab">
                      {n.note}{n.octave && <sup>°</sup>}
                    </span>
                    <span className="syl">{tab.syllables[j]}</span>
                  </div>
                ))}
              </div>
            </div>
            )
          })}
        </main>

        {/* Legend */}
        <div className="legend card">
          <span className="legend-label">Note</span>
          <span className="legend-item"><span className="font-tab" style={{fontSize:'1rem',color:'#333333'}}>5</span> = lower octave tine</span>
          <span className="legend-item"><span className="font-tab" style={{fontSize:'1rem',color:'#333333'}}>5<sup style={{fontSize:'0.52em'}}>°</sup></span> = upper octave tine</span>
          <span className="legend-item">Numbers = tine positions on a 17-key kalimba in C</span>
        </div>

        <footer className="song-sheet-footer">KALIMBABA</footer>

      </div>
    </div>
  )
}
