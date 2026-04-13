import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Heart, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SEO from '../components/SEO'
import './SongPage.css'

export default function SongPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [song, setSong] = useState(null)
  const [tabs, setTabs] = useState([])
  const [prevSong, setPrevSong] = useState(null)
  const [nextSong, setNextSong] = useState(null)
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

    const [prevQuery, nextQuery] = await Promise.all([
      supabase.from('songs')
        .select('title,slug')
        .eq('is_published', true)
        .lt('title', songData.title)
        .order('title', { ascending: false })
        .limit(1),
      supabase.from('songs')
        .select('title,slug')
        .eq('is_published', true)
        .gt('title', songData.title)
        .order('title', { ascending: true })
        .limit(1),
    ])

    const { data: tabData } = await supabase
      .from('tabs')
      .select('*')
      .eq('song_id', songData.id)
      .order('line_order', { ascending: true })

    // Increment play count
    await supabase.from('songs').update({ play_count: (songData.play_count ?? 0) + 1 }).eq('id', songData.id)

    setSong(songData)
    setTabs(tabData ?? [])
    setPrevSong(prevQuery.data?.[0] ?? null)
    setNextSong(nextQuery.data?.[0] ?? null)
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
          <p className="song-script">{song.author || 'Kalimba Tab'}</p>
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
            {profile?.is_admin && (
              <Link to={`/admin?edit=${song.slug}`} className="edit-btn">
                <Pencil size={14} /> Edit
              </Link>
            )}
          </div>
        </header>

        <div className="song-nav">
          <button
            type="button"
            className="song-nav-btn"
            disabled={!prevSong}
            onClick={() => prevSong && navigate(`/song/${prevSong.slug}`)}
          >
            ← {prevSong ? prevSong.title : 'Previous'}
          </button>
          <button
            type="button"
            className="song-nav-btn"
            disabled={!nextSong}
            onClick={() => nextSong && navigate(`/song/${nextSong.slug}`)}
          >
            {nextSong ? nextSong.title : 'Next'} →
          </button>
        </div>

        {/* Tab Card */}
        {(() => {
          const hasLyrics = tabs.some(t => t.syllables?.some(s => s && s.trim()))
          const isShort = tabs.every(t => t.notes.length <= 8)
          const twoCol = !hasLyrics && isShort

          const renderNotes = (tab) => tab.notes.map((n, j) => (
            <div key={j} className="pair">
              <span className="note">
                {n.note}{n.octave === 2 ? <sup>°°</sup> : (n.octave === 1 || n.octave === true) ? <sup>°</sup> : null}
              </span>
            </div>
          ))

          if (twoCol) {
            const pairs = []
            for (let i = 0; i < tabs.length; i += 2) pairs.push([tabs[i], tabs[i + 1]])
            return (
              <main className="tab-card card">
                {pairs.map((pair, i) => (
                  <div key={i} className={`tab-row tab-row-2col ${i % 2 === 0 ? 'shaded' : ''}`}>
                    <div className="pairs tab-half">{renderNotes(pair[0])}</div>
                    <div className="tab-pair-divider" />
                    <div className="pairs tab-half">{pair[1] ? renderNotes(pair[1]) : null}</div>
                  </div>
                ))}
              </main>
            )
          }

          return (
            <main className="tab-card card">
              {tabs.map((tab, i) => (
                <div key={tab.id} className={`tab-row ${i % 2 === 0 ? 'shaded' : ''}`}>
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
              ))}
            </main>
          )
        })()}

        {song.description && (
          <section className="song-description">
            <p>{song.description}</p>
          </section>
        )}

        {song.youtube_videos?.length > 0 && (
          <section className="song-videos">
            <h2 className="song-videos-title">Watch on YouTube</h2>
            <div className="song-videos-grid">
              {song.youtube_videos.map((v, i) => {
                const id = extractYouTubeId(v.url)
                if (!id) return null
                return (
                  <div key={i} className="song-video">
                    <div className="song-video-embed">
                      <iframe
                        src={`https://www.youtube.com/embed/${id}`}
                        title={v.title || song.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    {v.title && <p className="song-video-label">{v.title}</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

function extractYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}
