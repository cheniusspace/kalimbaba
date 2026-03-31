import { Link } from 'react-router-dom'
import { Heart, Music } from 'lucide-react'
import './SongCard.css'

const DIFFICULTY_COLOR = {
  beginner: '#27ae60',
  intermediate: '#e67e22',
  advanced: '#c0392b',
}

export default function SongCard({ song, isFavorited, onToggleFavorite }) {
  return (
    <div className="song-card card">
      <Link to={`/song/${song.slug}`} className="song-card-body">
        <div className="song-card-icon">
          <Music size={22} strokeWidth={1.5} />
        </div>
        <div className="song-card-info">
          <h3 className="song-card-title font-title">{song.title}</h3>
          <div className="song-card-meta">
            {song.genre && <span className="tag">{song.genre}</span>}
            {song.difficulty && (
              <span className="tag" style={{ color: DIFFICULTY_COLOR[song.difficulty] }}>
                {song.difficulty}
              </span>
            )}
            {song.audience && song.audience !== 'all' && (
              <span className="tag">{song.audience}</span>
            )}
          </div>
          {song.play_count > 0 && (
            <p className="song-card-plays">{song.play_count.toLocaleString()} plays</p>
          )}
        </div>
      </Link>

      {onToggleFavorite && (
        <button
          className={`song-card-fav ${isFavorited ? 'active' : ''}`}
          onClick={() => onToggleFavorite(song.id)}
          title={isFavorited ? 'Remove favorite' : 'Add to favorites'}
        >
          <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  )
}
