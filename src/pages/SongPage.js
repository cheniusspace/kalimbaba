import { useCallback, useEffect, useReducer, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Heart, Pencil, ChevronLeft, ChevronRight, Piano } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SEO from '../components/SEO'
import SongCard from '../components/SongCard'
import KalimbaPage from './KalimbaPage'
import { tabNotesEqual } from '../lib/tabNotes'
import './SongPage.css'

const SIMILAR_LIMIT = 6

function lineHasLyrics(tab) {
  return tab.syllables?.some((s) => s && String(s).trim())
}

function practiceReducer(state, action) {
  switch (action.type) {
    case 'RESET':
    case 'AGAIN':
      return { line: 0, note: 0, finished: false }
    case 'PLAYED_NOTE': {
      if (state.finished) return state
      const { tabs: tabList, played } = action
      if (!tabList?.length) return state
      const line = tabList[state.line]
      if (!line?.notes?.length) return state
      const expected = line.notes[state.note]
      if (!tabNotesEqual(played, expected)) return state
      const atEndOfLine = state.note + 1 >= line.notes.length
      if (atEndOfLine) {
        const atEndOfSong = state.line + 1 >= tabList.length
        if (atEndOfSong) {
          return { ...state, finished: true }
        }
        return { line: state.line + 1, note: 0, finished: false }
      }
      return { ...state, note: state.note + 1 }
    }
    default:
      return state
  }
}

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
  const [similarSongs, setSimilarSongs] = useState([])
  const [similarFavoriteIds, setSimilarFavoriteIds] = useState([])
  const [kalimbaOpen, setKalimbaOpen] = useState(false)
  const [practice, dispatchPractice] = useReducer(practiceReducer, {
    line: 0,
    note: 0,
    finished: false,
  })

  const handlePracticeNote = useCallback((played) => {
    dispatchPractice({ type: 'PLAYED_NOTE', tabs, played })
  }, [tabs])

  useEffect(() => {
    if (kalimbaOpen) dispatchPractice({ type: 'RESET' })
  }, [kalimbaOpen])

  useEffect(() => {
    dispatchPractice({ type: 'RESET' })
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadSong() {
      setLoading(true)
      setSimilarSongs([])
      setSimilarFavoriteIds([])

      try {
      const { data: songData, error: songErr } = await supabase
        .from('songs')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

      if (cancelled) return
      if (songErr || !songData) {
        setSong(null)
        setTabs([])
        setPrevSong(null)
        setNextSong(null)
        return
      }

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

      if (cancelled) return

      let prevRow = prevQuery.data?.[0] ?? null
      let nextRow = nextQuery.data?.[0] ?? null

      if (!nextRow) {
        const { data } = await supabase
          .from('songs')
          .select('title,slug')
          .eq('is_published', true)
          .neq('id', songData.id)
          .order('title', { ascending: true })
          .limit(1)
        if (cancelled) return
        nextRow = data?.[0] ?? null
      }
      if (!prevRow) {
        const { data } = await supabase
          .from('songs')
          .select('title,slug')
          .eq('is_published', true)
          .neq('id', songData.id)
          .order('title', { ascending: false })
          .limit(1)
        if (cancelled) return
        prevRow = data?.[0] ?? null
      }

      const { data: tabData } = await supabase
        .from('tabs')
        .select('*')
        .eq('song_id', songData.id)
        .order('line_order', { ascending: true })

      if (cancelled) return

      await supabase
        .from('songs')
        .update({ play_count: (songData.play_count ?? 0) + 1 })
        .eq('id', songData.id)

      if (cancelled) return

      setSong(songData)
      setTabs(tabData ?? [])
      setPrevSong(prevRow)
      setNextSong(nextRow)
      } catch (e) {
        if (!cancelled) {
          setSong(null)
          setTabs([])
          setPrevSong(null)
          setNextSong(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSong()
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (user && song) checkFavorite()
  }, [user, song])

  useEffect(() => {
    if (!song?.id) return
    let cancelled = false

    async function loadSimilar() {
      const excludeId = song.id
      const byId = new Map()

      if (song.genre) {
        const { data: sameGenre } = await supabase
          .from('songs')
          .select('*')
          .eq('is_published', true)
          .eq('genre', song.genre)
          .neq('id', excludeId)
          .order('play_count', { ascending: false })
          .limit(16)
        for (const s of sameGenre ?? []) byId.set(s.id, s)
      }

      if (byId.size < SIMILAR_LIMIT) {
        const { data: popular } = await supabase
          .from('songs')
          .select('*')
          .eq('is_published', true)
          .neq('id', excludeId)
          .order('play_count', { ascending: false })
          .limit(30)
        for (const s of popular ?? []) {
          if (byId.size >= SIMILAR_LIMIT) break
          if (!byId.has(s.id)) byId.set(s.id, s)
        }
      }

      const list = Array.from(byId.values()).slice(0, SIMILAR_LIMIT)
      if (cancelled) return
      setSimilarSongs(list)

      if (user?.id && list.length) {
        const { data: favs } = await supabase
          .from('favorites')
          .select('song_id')
          .eq('user_id', user.id)
          .in('song_id', list.map(s => s.id))
        if (!cancelled) setSimilarFavoriteIds(favs?.map(f => f.song_id) ?? [])
      } else if (!cancelled) {
        setSimilarFavoriteIds([])
      }
    }

    loadSimilar()
    return () => { cancelled = true }
  }, [song?.id, song?.genre, user?.id])

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

  async function toggleSimilarFavorite(songId) {
    if (!user) return
    if (similarFavoriteIds.includes(songId)) {
      await supabase.from('favorites').delete()
        .eq('user_id', user.id).eq('song_id', songId)
      setSimilarFavoriteIds(prev => prev.filter(id => id !== songId))
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, song_id: songId })
      setSimilarFavoriteIds(prev => [...prev, songId])
    }
  }

  if (loading) return <div className="song-loading">Loading...</div>
  if (!song) return <div className="song-loading">Song not found.</div>

  return (
    <div className={`song-page${kalimbaOpen ? ' song-page--kalimba' : ''}`}>
      <div className="container song-inner">
        <div className="song-main">
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

        {/* Header: centered title + tags / actions only */}
        <header className="song-header">
          <h1 className="song-title font-title">{song.title}</h1>
          <p className="song-script font-script">{song.author || 'Kalimba Tab'}</p>
          <div className="song-meta">
            {song.genre && <span className="tag tag-link" onClick={() => navigate(`/?genre=${song.genre}`)}>{song.genre}</span>}
            {song.difficulty && <span className="tag tag-link" onClick={() => navigate(`/?difficulty=${song.difficulty}`)}>{song.difficulty}</span>}
            {user && (
              <button
                type="button"
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
            <button
              type="button"
              className={`song-kalimba-toggle${kalimbaOpen ? ' song-kalimba-toggle--on' : ''}`}
              aria-pressed={kalimbaOpen}
              aria-expanded={kalimbaOpen}
              aria-controls="song-kalimba-panel"
              id="song-kalimba-toggle"
              onClick={() => setKalimbaOpen((v) => !v)}
            >
              <Piano size={15} strokeWidth={1.75} aria-hidden />
              Virtual kalimba practice
            </button>
          </div>
        </header>

        <nav className="song-nav-rail" aria-label="Previous and next song">
          <button
            type="button"
            className="song-nav-link song-nav-link-prev"
            disabled={!prevSong}
            onClick={() => prevSong && navigate(`/song/${prevSong.slug}`)}
          >
            <ChevronLeft size={20} strokeWidth={1.75} className="song-nav-chev" aria-hidden />
            <span className="song-nav-text">
              <span className="song-nav-dir">Previous</span>
              {prevSong ? (
                <span className="song-nav-target">{prevSong.title}</span>
              ) : (
                <span className="song-nav-target song-nav-target-muted">—</span>
              )}
            </span>
          </button>
          <button
            type="button"
            className="song-nav-link song-nav-link-next"
            disabled={!nextSong}
            onClick={() => nextSong && navigate(`/song/${nextSong.slug}`)}
          >
            <span className="song-nav-text">
              {nextSong ? (
                <span className="song-nav-target">{nextSong.title}</span>
              ) : (
                <span className="song-nav-target song-nav-target-muted">—</span>
              )}
              <span className="song-nav-dir">Next</span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="song-nav-chev" aria-hidden />
          </button>
        </nav>

        {/* Tab Card: with virtual kalimba, one line at a time; else full layout */}
        {kalimbaOpen && tabs.length > 0 ? (
          <>
            <div className="song-practice-bar card">
              <div className="song-practice-bar-inner">
                <p className="song-practice-bar-text font-nav">
                  {practice.finished ? (
                    <>You played every line of this tab.</>
                  ) : (
                    <>
                      Line {practice.line + 1} of {tabs.length}
                      {' · '}
                      Note {practice.note + 1} of {tabs[practice.line]?.notes?.length ?? 0}
                      <span className="song-practice-bar-hint"> — match the highlighted note on the kalimba</span>
                    </>
                  )}
                </p>
                {practice.finished ? (
                  <button
                    type="button"
                    className="song-practice-again btn btn-outline"
                    onClick={() => dispatchPractice({ type: 'AGAIN' })}
                  >
                    Practice again
                  </button>
                ) : null}
              </div>
            </div>
            {!practice.finished ? (
              <main className="tab-card card tab-card--practice">
                {(() => {
                  const tab = tabs[practice.line]
                  if (!tab) return null
                  const shade = practice.line % 2 === 0 ? 'shaded' : ''
                  const hl = practice.note
                  if (lineHasLyrics(tab)) {
                    return (
                      <div className={`tab-row ${shade}`}>
                        <div className="pairs">
                          {tab.notes.map((n, j) => (
                            <div
                              key={j}
                              className={`pair${j === hl ? ' pair--practice-next' : ''}`}
                            >
                              <span className="note">
                                {n.note}
                                {n.octave === 2 ? (
                                  <sup>°°</sup>
                                ) : n.octave === 1 || n.octave === true ? (
                                  <sup>°</sup>
                                ) : null}
                              </span>
                              <span className="syl">{tab.syllables[j]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div className={`tab-row ${shade}`}>
                      <div className="pairs">
                        {tab.notes.map((n, j) => (
                          <div
                            key={j}
                            className={`pair${j === hl ? ' pair--practice-next' : ''}`}
                          >
                            <span className="note">
                              {n.note}
                              {n.octave === 2 ? (
                                <sup>°°</sup>
                              ) : n.octave === 1 || n.octave === true ? (
                                <sup>°</sup>
                              ) : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </main>
            ) : null}
          </>
        ) : (
        (() => {
          const SHORT_NOTES = 8
          const lineIsShort = tab => tab.notes.length <= SHORT_NOTES
          const lineCompact = tab => !lineHasLyrics(tab) && lineIsShort(tab)

          const renderNotesNoLyrics = tab =>
            tab.notes.map((n, j) => (
              <div key={j} className="pair">
                <span className="note">
                  {n.note}{n.octave === 2 ? <sup>°°</sup> : (n.octave === 1 || n.octave === true) ? <sup>°</sup> : null}
                </span>
              </div>
            ))

          const renderNoteOnly = (n, j) => (
            <div key={j} className="pair">
              <span className="note">
                {n.note}{n.octave === 2 ? <sup>°°</sup> : (n.octave === 1 || n.octave === true) ? <sup>°</sup> : null}
              </span>
            </div>
          )

          let rowIndex = 0
          const rows = []
          let i = 0
          while (i < tabs.length) {
            const tab = tabs[i]
            const next = tabs[i + 1]
            const shade = rowIndex % 2 === 0 ? 'shaded' : ''

            if (lineCompact(tab) && next && lineCompact(next)) {
              rows.push(
                <div key={`pair-${tab.id}-${next.id}`} className={`tab-row tab-row-2col ${shade}`}>
                  <div className="pairs tab-half">{renderNotesNoLyrics(tab)}</div>
                  <div className="tab-pair-divider" aria-hidden />
                  <div className="pairs tab-half">{renderNotesNoLyrics(next)}</div>
                </div>
              )
              i += 2
            } else if (lineCompact(tab) && tab.notes.length >= 2) {
              const mid = Math.ceil(tab.notes.length / 2)
              const left = tab.notes.slice(0, mid)
              const right = tab.notes.slice(mid)
              rows.push(
                <div key={`split-${tab.id}`} className={`tab-row tab-row-line-split ${shade}`}>
                  <div className="pairs tab-half">{left.map((n, j) => renderNoteOnly(n, j))}</div>
                  <div className="tab-pair-divider tab-line-split-divider" aria-hidden />
                  <div className="pairs tab-half">{right.map((n, j) => renderNoteOnly(n, j + mid))}</div>
                </div>
              )
              i += 1
            } else {
              rows.push(
                <div key={tab.id} className={`tab-row ${shade}`}>
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
              i += 1
            }
            rowIndex += 1
          }

          return <main className="tab-card card">{rows}</main>
        })()
        )}

        {kalimbaOpen ? (
          <div
            className="song-kalimba-below-tab card"
            id="song-kalimba-panel"
            aria-label="Virtual kalimba practice"
          >
            <KalimbaPage embedded onNotePlayed={handlePracticeNote} />
          </div>
        ) : null}

        {song.description && (
          <section className="song-description">
            <p>{song.description}</p>
          </section>
        )}

        {song.youtube_videos?.length > 0 && (
          <section className="song-videos">
            <h2 className="song-videos-title font-title">Watch on YouTube</h2>
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

        {similarSongs.length > 0 && (
          <section className="song-similar" aria-labelledby="song-similar-heading">
            <h2 id="song-similar-heading" className="song-similar-title font-title">Similar songs</h2>
            <p className="song-similar-lead">
              {song.genre
                ? `Same genre (${song.genre}), most played first.`
                : 'Popular tabs you might like next.'}
            </p>
            <div className="song-similar-grid">
              {similarSongs.map(s => (
                <SongCard
                  key={s.id}
                  song={s}
                  isFavorited={similarFavoriteIds.includes(s.id)}
                  onToggleFavorite={user ? toggleSimilarFavorite : null}
                />
              ))}
            </div>
          </section>
        )}

        </div>
      </div>
    </div>
  )
}

function extractYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}
