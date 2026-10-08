import { AudioLines, Heart, ListPlus, Music2, Trash2 } from 'lucide-react'
import type { Track } from '../../../domain/Track'

type TrackTableProps = {
  tracks: Track[]
  favoriteIds: Set<string>
  currentTrackId: string | null
  isPlaying: boolean
  onPlay: (track: Track) => void
  onToggleFavorite: (track: Track) => void
  onAddToPlaylist: (track: Track) => void
  onRemove: (track: Track) => void
}

export function TrackTable({ tracks, favoriteIds, currentTrackId, isPlaying, onPlay, onToggleFavorite, onAddToPlaylist, onRemove }: TrackTableProps) {
  return (
    <div className="track-table-wrap">
      <div className="track-table-header"><span className="track-number">#</span><span>TITLE</span><span>FILE</span><span>ADDED</span><span aria-hidden="true" /></div>
      <div className="track-table">
        {tracks.map((track, index) => (
          <div className={currentTrackId === track.id ? 'track-row current' : 'track-row'} key={track.id}>
            <button className="track-number row-play" aria-label={`Play ${track.title}`} onClick={() => onPlay(track)}>{currentTrackId === track.id && isPlaying ? <AudioLines size={16} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</button>
            <button className="track-main" onClick={() => onPlay(track)}>
              <span className="track-cover"><Music2 size={17} /></span>
              <span className="track-copy"><strong>{track.title}</strong><small>{track.artist}</small></span>
            </button>
            <span className="track-file" title={track.fileName}>{track.fileName}</span>
            <span className="track-date">{new Date(track.addedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
            <span className="track-actions">
              <button className={favoriteIds.has(track.id) ? 'icon-button favorite selected' : 'icon-button favorite'} aria-label={favoriteIds.has(track.id) ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`} onClick={() => onToggleFavorite(track)}><Heart size={16} fill={favoriteIds.has(track.id) ? 'currentColor' : 'none'} /></button>
              <button className="icon-button add-to-playlist" aria-label={`Add ${track.title} to a playlist`} title="Add to playlist" onClick={() => onAddToPlaylist(track)}><ListPlus size={16} /></button>
              <button className="icon-button remove-track" aria-label={`Remove ${track.title}`} title="Remove from library" onClick={() => onRemove(track)}><Trash2 size={15} /></button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}