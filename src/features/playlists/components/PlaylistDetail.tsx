import { ArrowDown, ArrowUp, ListMusic, MoreHorizontal, Pause, Play, Plus, Trash2 } from 'lucide-react'
import type { Playlist, PlaylistDirection } from '../../../domain/Playlist'
import type { Track } from '../../../domain/Track'

type PlaylistDetailProps = {
  playlist: Playlist
  tracks: Track[]
  currentTrackId: string | null
  isPlaying: boolean
  search: string
  onPlay: (track: Track) => void
  onPlayPlaylist: () => void
  onAddTracks: () => void
  onMoveTrack: (trackId: string, direction: PlaylistDirection) => void
  onRemoveTrack: (trackId: string) => void
  onRename: () => void
  onDelete: () => void
}

export function PlaylistDetail({
  playlist,
  tracks,
  currentTrackId,
  isPlaying,
  search,
  onPlay,
  onPlayPlaylist,
  onAddTracks,
  onMoveTrack,
  onRemoveTrack,
  onRename,
  onDelete,
}: PlaylistDetailProps) {
  const tracksById = new Map(tracks.map((track) => [track.id, track]))
  const query = search.trim().toLocaleLowerCase()
  const orderedTracks = playlist.trackOrder
    .map((id) => tracksById.get(id))
    .filter((track): track is Track => Boolean(track))
    .filter((track) => !query || `${track.title} ${track.artist} ${track.fileName}`.toLocaleLowerCase().includes(query))

  return (
    <section className="playlist-detail" aria-label={`${playlist.name} playlist`}>
      <header className="playlist-hero">
        <div className="playlist-hero-art" aria-hidden="true"><span /><span /><ListMusic size={38} /></div>
        <div className="playlist-hero-copy">
          <p className="eyebrow">YOUR MIXTAPE / {String(playlist.length).padStart(2, '0')} TRACKS</p>
          <h2>{playlist.name}</h2>
          <p>Sequenced by you. Stored right here on this device.</p>
          <div className="playlist-hero-actions">
            <button className="playlist-play-button" disabled={!playlist.length} onClick={onPlayPlaylist}>
              {isPlaying && currentTrackId && playlist.hasTrack(currentTrackId) ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              <span>{isPlaying && currentTrackId && playlist.hasTrack(currentTrackId) ? 'Playing playlist' : 'Play playlist'}</span>
            </button>
            <button className="playlist-outline-button" onClick={onAddTracks}><Plus size={16} /> Add tracks</button>
            <button className="playlist-icon-action" aria-label="Rename playlist" title="Rename playlist" onClick={onRename}><MoreHorizontal size={19} /></button>
            <button className="playlist-icon-action danger" aria-label="Delete playlist" title="Delete playlist" onClick={onDelete}><Trash2 size={16} /></button>
          </div>
        </div>
      </header>

      <div className="playlist-track-heading"><span>ORDER</span><span>TITLE</span><span>FILE NAME</span><span>ARRANGE</span></div>
      {orderedTracks.length ? (
        <ol className="playlist-track-list">
          {orderedTracks.map((track, index) => (
            <li className={currentTrackId === track.id ? 'playlist-track playing' : 'playlist-track'} key={track.id}>
              <span className="playlist-track-index">{String(index + 1).padStart(2, '0')}</span>
              <button className="playlist-track-title" onClick={() => onPlay(track)}>
                <span className={`playlist-track-art playlist-art-${index % 4}`}><ListMusic size={14} /></span>
                <span><strong>{track.title}</strong><small>{track.artist}</small></span>
                <span className="playlist-inline-play">{currentTrackId === track.id && isPlaying ? <Pause size={15} /> : <Play size={15} />}</span>
              </button>
              <span className="playlist-track-file" title={track.fileName}>{track.fileName}</span>
              <span className="playlist-track-actions">
                <button aria-label={`Move ${track.title} up`} title="Move up" disabled={index === 0} onClick={() => onMoveTrack(track.id, 'up')}><ArrowUp size={15} /></button>
                <button aria-label={`Move ${track.title} down`} title="Move down" disabled={index === orderedTracks.length - 1} onClick={() => onMoveTrack(track.id, 'down')}><ArrowDown size={15} /></button>
                <button aria-label={`Remove ${track.title} from playlist`} title="Remove from playlist" onClick={() => onRemoveTrack(track.id)}><Trash2 size={15} /></button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="playlist-empty">
          <div className="playlist-empty-mark"><ListMusic size={24} /></div>
          <h3>{query ? 'No tracks match' : 'This mix is still yours to make'}</h3>
          <p>{query ? 'Try another search.' : 'Add tracks from your library, then arrange them into the perfect order.'}</p>
          {!query && <button className="playlist-outline-button" onClick={onAddTracks}><Plus size={16} /> Add tracks</button>}
        </div>
      )}
    </section>
  )
}