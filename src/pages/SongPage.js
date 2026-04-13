import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SEO from '../components/SEO'
import './SongPage.css'

export default function SongPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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

        <SEO
          title={`${song.title} Kalimba Tab`}
          description={song.description || `Learn how to play ${song.title} on kalimba. Free number-note tab for ${song.difficulty ?? 'all'} levels — no music reading required.`}
          canonicalPath={`/song/${song.slug}`}
          ogType="music.song"
          schema={{
            '@context': 'https://schema.org',
            '@type': 'MusicComposition',
            name: song.title,
            url: `https://kalimbaba.com/song/${song.slug}`,
            description: song.description || `Free kalimba tab for ${song.title}.`,
            genre: song.genre ?? undefined,
            educationalLevel: song.difficulty ?? undefined,
            learningResourceType: 'Musical score',
            isAccessibleForFree: true,
            publisher: {
              '@type': 'Organization',
              name: 'Kalimbaba',
              url: 'https://kalimbaba.com',
            },
          }}
        />

        {/* Header */}
        <header className="song-header">
          <h1 className="song-title">{song.title}</h1>
          <p className="song-script">Kalimba Tab</p>
          <div className="song-meta">
            {song.genre && <span className="tag tag-link" onClick={() => navigate(`/?genre=${song.genre}`)}>{song.genre}</span>}
            {song.difficulty && <span className="tag tag-link" onClick={() => navigate(`/?difficulty=${song.difficulty}`)}>{song.difficulty}</span>}
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
            const shaded = i % 2 === 0
            return (
            <div key={tab.id} className={`tab-row ${shaded ? 'shaded' : ''}`}>
              <div className="pairs">
                {tab.notes.map((n, j) => (
                  <div key={j} className="pair">
                    <span className="note">
                      {n.note}{n.octave === 2 ? <sup>°°</sup> : (n.octave === 1 || n.octave === true) ? <sup>°</sup> : null}
                    </span>
                    <span className="syl">{tab.syllables[j]}</span>
                  </div>
                ))}
              </div>
            </div>
            )
          })}
        </main>


      </div>
    </div>
  )
}
