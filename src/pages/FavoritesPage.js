import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SongCard from '../components/SongCard'
import SEO from '../components/SEO'
import './FavoritesPage.css'

export default function FavoritesPage() {
  const { user } = useAuth()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchFavorites() }, [user])

  async function fetchFavorites() {
    const { data } = await supabase
      .from('favorites')
      .select('song_id, songs(*)')
      .eq('user_id', user.id)
    setSongs(data?.map(f => f.songs).filter(Boolean) ?? [])
    setLoading(false)
  }

  async function toggleFavorite(songId) {
    await supabase.from('favorites').delete()
      .eq('user_id', user.id).eq('song_id', songId)
    setSongs(prev => prev.filter(s => s.id !== songId))
  }

  return (
    <div className="favorites-page">
      <SEO
        title="My Favorites"
        description="Your saved kalimba tabs in one place."
        canonicalPath="/favorites"
        noIndex
      />
      <div className="container">
        <div className="favorites-header">
          <h1 className="favorites-title font-title">My Favorites</h1>
          <p className="favorites-sub">{songs.length} saved songs</p>
        </div>

        {loading ? (
          <p className="fav-state">Loading...</p>
        ) : songs.length === 0 ? (
          <div className="fav-state">
            <p className="fav-empty-script font-script">Nothing saved yet</p>
            <p>Browse the catalog and save songs you love ♡</p>
          </div>
        ) : (
          <div className="fav-grid">
            {songs.map(song => (
              <SongCard
                key={song.id}
                song={song}
                isFavorited={true}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
