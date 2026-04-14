import { useEffect, useState, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongCard from '../components/SongCard'
import SEO from '../components/SEO'
import './CatalogPage.css'

const PLACEHOLDER_SONGS = [
  'River flows in you',
  'Canon in D',
  'Happy birthday',
  'Twinkle twinkle',
  'Fur Elise',
  'Over the rainbow',
  'A thousand years',
]

function useTypingPlaceholder(words) {
  const [placeholder, setPlaceholder] = useState('')
  const index = useRef(0)
  const charIndex = useRef(0)
  const deleting = useRef(false)

  useEffect(() => {
    let timeout
    function tick() {
      const word = words[index.current]
      if (deleting.current) {
        charIndex.current--
        setPlaceholder(word.slice(0, charIndex.current))
        if (charIndex.current === 0) {
          deleting.current = false
          index.current = (index.current + 1) % words.length
          timeout = setTimeout(tick, 400)
        } else {
          timeout = setTimeout(tick, 40)
        }
      } else {
        charIndex.current++
        setPlaceholder(word.slice(0, charIndex.current))
        if (charIndex.current === word.length) {
          deleting.current = true
          timeout = setTimeout(tick, 1800)
        } else {
          timeout = setTimeout(tick, 80)
        }
      }
    }
    timeout = setTimeout(tick, 600)
    return () => clearTimeout(timeout)
  }, [])

  return placeholder
}

const GENRES = ['all', 'children', 'pop', 'classical', 'folk', 'anime', 'other']
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced']
const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A → Z' },
]

export default function CatalogPage() {
  const { user } = useAuth()
  const typingPlaceholder = useTypingPlaceholder(PLACEHOLDER_SONGS)
  const [songs, setSongs] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [sort, setSort] = useState('popular')

  useEffect(() => {
    let cancelled = false
    async function fetchSongs() {
      setLoading(true)
      setLoadError(null)
      try {
        if (!isSupabaseConfigured) {
          if (!cancelled) {
            setSongs([])
            setLoadError(
              'Supabase env vars are missing. Copy .env.example to .env, set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY, then restart npm start.',
            )
          }
          return
        }
        let query = supabase.from('songs').select('*').eq('is_published', true)
        if (genre !== 'all') query = query.eq('genre', genre)
        if (difficulty !== 'all') query = query.eq('difficulty', difficulty)
        if (sort === 'popular') query = query.order('play_count', { ascending: false })
        else if (sort === 'newest') query = query.order('created_at', { ascending: false })
        else if (sort === 'az') query = query.order('title', { ascending: true })
        const { data, error } = await query
        if (cancelled) return
        if (error) throw error
        setSongs(data ?? [])
        setLoadError(null)
      } catch (e) {
        if (!cancelled) {
          setSongs([])
          setLoadError(e?.message ?? 'Could not load songs. Check the network and Supabase project.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSongs()
    return () => {
      cancelled = true
    }
  }, [genre, difficulty, sort])
  useEffect(() => { if (user) fetchFavorites() }, [user])

  async function fetchFavorites() {
    const { data } = await supabase
      .from('favorites')
      .select('song_id')
      .eq('user_id', user.id)
    setFavorites(data?.map(f => f.song_id) ?? [])
  }

  async function toggleFavorite(songId) {
    if (!user) return
    if (favorites.includes(songId)) {
      await supabase.from('favorites').delete()
        .eq('user_id', user.id).eq('song_id', songId)
      setFavorites(prev => prev.filter(id => id !== songId))
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, song_id: songId })
      setFavorites(prev => [...prev, songId])
    }
  }

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const catalogSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Kalimba Tabs Catalog',
    description: 'Browse free kalimba tabs for all levels.',
    url: 'https://kalimbaba.com/',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: songs.slice(0, 20).map((song, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://kalimbaba.com/song/${song.slug}`,
        name: song.title,
      })),
    },
  }

  return (
    <div className="catalog-page">
      <SEO
        title="Free Kalimba Tabs — Learn Thumb Piano"
        description="Browse free kalimba tabs for all levels. Search by song, genre, or difficulty and start playing your favourite songs today."
        canonicalPath="/"
        schema={catalogSchema}
      />

      {/* Hero */}
      <div className="catalog-hero">
        <h1 className="hero-title font-title">Kalimba Tabs</h1>
        <p className="hero-script font-script">Master the thumb piano in minutes.</p>
        <div className="hero-search-wrap">
          <input
            className="hero-search"
            type="text"
            placeholder={search ? '' : (typingPlaceholder || 'Search songs...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {!loading && !loadError && <p className="hero-count">{songs.length} songs available</p>}
      </div>

      <div className="container">

        {/* Filters */}
        <div className="filters">
          <div className="filter-row">
            <FilterGroup label="Genre" value={genre} onChange={setGenre} options={GENRES} />
            <FilterGroup label="Level" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading-state">Loading songs...</div>
        ) : loadError ? (
          <div className="empty-state catalog-load-error" role="alert">
            <p className="catalog-load-error-title">Could not load songs</p>
            <p className="catalog-load-error-detail">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No songs found. Try different filters.</div>
        ) : (
          <div className="catalog-grid">
            {filtered.map(song => (
              <SongCard
                key={song.id}
                song={song}
                isFavorited={favorites.includes(song.id)}
                onToggleFavorite={user ? toggleFavorite : null}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function FilterGroup({ label, value, onChange, options }) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="filter-pills">
        {options.map(opt => (
          <button
            key={opt}
            className={`pill ${value === opt ? 'active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}
