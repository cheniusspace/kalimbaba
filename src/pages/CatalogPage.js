import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongCard from '../components/SongCard'
import './CatalogPage.css'

const GENRES = ['all', 'children', 'pop', 'classical', 'folk', 'anime', 'other']
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced']
const AUDIENCES = ['all', 'children', 'adult']
const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A → Z' },
]

export default function CatalogPage() {
  const { user } = useAuth()
  const [songs, setSongs] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [audience, setAudience] = useState('all')
  const [sort, setSort] = useState('popular')

  useEffect(() => { fetchSongs() }, [genre, difficulty, audience, sort])
  useEffect(() => { if (user) fetchFavorites() }, [user])

  async function fetchSongs() {
    setLoading(true)
    let query = supabase.from('songs').select('*').eq('is_published', true)
    if (genre !== 'all') query = query.eq('genre', genre)
    if (difficulty !== 'all') query = query.eq('difficulty', difficulty)
    if (audience !== 'all') query = query.eq('audience', audience)
    if (sort === 'popular') query = query.order('play_count', { ascending: false })
    else if (sort === 'newest') query = query.order('created_at', { ascending: false })
    else if (sort === 'az') query = query.order('title', { ascending: true })
    const { data } = await query
    setSongs(data ?? [])
    setLoading(false)
  }

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

  return (
    <div className="catalog-page">
      <div className="container">

        <section className="catalog-hero">
          <div>
            <h1 className="catalog-title font-title">Explore the kalimba catalog</h1>
            <p className="catalog-description">Search for the perfect song tab, filter by genre, difficulty, or audience, and save favorites for easy access.</p>
          </div>
          <div>
            <p className="catalog-sub">{songs.length} songs available</p>
          </div>
        </section>

        <div className="catalog-header">
          <p className="catalog-sub">A simplified library for kalimba players of every level.</p>
        </div>

        {/* Filters */}
        <div className="filters">
          <input
            className="search-input"
            type="text"
            placeholder="Search songs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-row">
            <FilterGroup label="Genre" value={genre} onChange={setGenre} options={GENRES} />
            <FilterGroup label="Level" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
            <FilterGroup label="For" value={audience} onChange={setAudience} options={AUDIENCES} />
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading-state">Loading songs...</div>
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
