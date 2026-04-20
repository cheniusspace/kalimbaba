import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import './SongCard.css'

const DIFFICULTY_COLOR = {
  beginner: '#27ae60',
  intermediate: '#e67e22',
  advanced: '#c0392b',
}

export default function SongCard({ song, isFavorited, onToggleFavorite }) {
  const difficulties = Array.isArray(song.difficulties) && song.difficulties.length
    ? song.difficulties
    : (song.difficulty ? [song.difficulty] : [])
  return (
    <div className="song-card card">
      <Link to={`/song/${song.slug}`} className="song-card-body">
        <h3 className="song-card-title font-title">{song.title}</h3>
        <div className="song-card-meta">
          {song.genre && <span className="tag">{song.genre}</span>}
          {difficulties.map(d => (
            <span key={d} className="tag" style={{ color: DIFFICULTY_COLOR[d] }}>
              {d}
            </span>
          ))}
        </div>
        {song.description && (
          <p className="song-card-description">{song.description}</p>
        )}
        {song.play_count > 0 && (
          <p className="song-card-plays">{song.play_count.toLocaleString()} plays</p>
        )}
      </Link>

      {onToggleFavorite && (
        <button
          className={`song-card-fav ${isFavorited ? 'active' : ''}`}
          onClick={() => onToggleFavorite(song.id)}
          title={isFavorited ? 'Remove favorite' : 'Add to favorites'}
        >
          <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  )
}
