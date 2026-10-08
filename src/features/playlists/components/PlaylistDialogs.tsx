import { ListMusic, Plus, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Playlist } from '../../../domain/Playlist'
import type { Track } from '../../../domain/Track'

type PlaylistNameDialogProps = {
  initialName?: string
  onClose: () => void
  onSave: (name: string) => void
}

export function PlaylistNameDialog({ initialName = '', onClose, onSave }: PlaylistNameDialogProps) {
  const [name, setName] = useState(initialName)

  return (
    <div className="playlist-modal-scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="playlist-modal" role="dialog" aria-modal="true" aria-labelledby="playlist-name-title" onSubmit={(event) => { event.preventDefault(); onSave(name) }}>
        <button className="playlist-modal-close" type="button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        <span className="playlist-modal-icon"><ListMusic size={20} /></span>
        <p className="eyebrow">MAKE IT YOURS</p>
        <h2 id="playlist-name-title">{initialName ? 'Rename playlist' : 'Create a playlist'}</h2>
        <p className="playlist-modal-copy">Give this collection a name that sets the mood.</p>
        <label className="playlist-name-field"><span>PLAYLIST NAME</span><input autoFocus maxLength={48} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sunday on repeat" /></label>
        <div className="playlist-modal-actions"><button className="playlist-cancel-button" type="button" onClick={onClose}>Cancel</button><button className="playlist-confirm-button" type="submit" disabled={!name.trim()}>{initialName ? 'Save changes' : 'Create playlist'}</button></div>
      </form>
    </div>
  )
}

type AddToPlaylistDialogProps = {
  track: Track
  playlists: Playlist[]
  onClose: () => void
  onSelect: (playlistId: string) => void
  onCreate: () => void
}

export function AddToPlaylistDialog({ track, playlists, onClose, onSelect, onCreate }: AddToPlaylistDialogProps) {
  return (
    <div className="playlist-modal-scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="playlist-modal picker-modal" role="dialog" aria-modal="true" aria-labelledby="add-to-playlist-title">
        <button className="playlist-modal-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        <span className="playlist-modal-icon"><Plus size={20} /></span>
        <p className="eyebrow">SAVE THIS TRACK</p>
        <h2 id="add-to-playlist-title">Add to playlist</h2>
        <p className="playlist-modal-copy"><strong>{track.title}</strong> · {track.artist}</p>
        <div className="playlist-picker-list">
          {playlists.map((playlist, index) => (
            <button className="playlist-picker-option" key={playlist.id} onClick={() => onSelect(playlist.id)}>
              <span className={`playlist-nav-art playlist-art-${index % 4}`}><ListMusic size={15} /></span>
              <span><strong>{playlist.name}</strong><small>{playlist.length} {playlist.length === 1 ? 'track' : 'tracks'}</small></span>
              <Plus size={16} />
            </button>
          ))}
          {!playlists.length && <p className="playlist-picker-empty">Create a playlist first, then save this track to it.</p>}
        </div>
        <button className="playlist-create-inline" onClick={onCreate}><Plus size={16} /> Create new playlist</button>
      </section>
    </div>
  )
}

type AddTracksDialogProps = {
  playlist: Playlist
  tracks: Track[]
  onClose: () => void
  onAdd: (trackId: string) => void
}

export function AddTracksDialog({ playlist, tracks, onClose, onAdd }: AddTracksDialogProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const availableTracks = tracks.filter((track) => !playlist.hasTrack(track.id))
  const filteredTracks = availableTracks.filter((track) => !normalizedQuery || `${track.title} ${track.artist}`.toLocaleLowerCase().includes(normalizedQuery))

  return (
    <div className="playlist-modal-scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="playlist-modal add-tracks-modal" role="dialog" aria-modal="true" aria-labelledby="add-tracks-title">
        <button className="playlist-modal-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        <span className="playlist-modal-icon"><ListMusic size={20} /></span>
        <p className="eyebrow">BUILD YOUR SEQUENCE</p>
        <h2 id="add-tracks-title">Add tracks</h2>
        <p className="playlist-modal-copy">Choose songs from your local library for <strong>{playlist.name}</strong>.</p>
        <label className="playlist-dialog-search"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a track" aria-label="Find a track to add" /></label>
        <div className="add-track-choices">
          {filteredTracks.map((track, index) => (
            <div className="add-track-choice" key={track.id}>
              <span className={`playlist-track-art playlist-art-${index % 4}`}><ListMusic size={14} /></span>
              <span className="add-track-copy"><strong>{track.title}</strong><small>{track.artist}</small></span>
              <button aria-label={`Add ${track.title} to ${playlist.name}`} onClick={() => onAdd(track.id)}><Plus size={16} /><span>Add</span></button>
            </div>
          ))}
          {!filteredTracks.length && <p className="add-track-empty">{availableTracks.length ? 'No tracks match your search.' : 'Every track in your library is already in this playlist.'}</p>}
        </div>
        <div className="playlist-modal-actions"><button className="playlist-confirm-button" onClick={onClose}>Done</button></div>
      </section>
    </div>
  )
}

type DeletePlaylistDialogProps = {
  playlist: Playlist
  onClose: () => void
  onDelete: () => void
}

export function DeletePlaylistDialog({ playlist, onClose, onDelete }: DeletePlaylistDialogProps) {
  return (
    <div className="playlist-modal-scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="playlist-modal delete-playlist-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-playlist-title">
        <button className="playlist-modal-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        <span className="playlist-modal-icon warning"><Trash2 size={20} /></span>
        <p className="eyebrow">REMOVE COLLECTION</p>
        <h2 id="delete-playlist-title">Delete “{playlist.name}”?</h2>
        <p className="playlist-modal-copy">This removes the playlist and its order. Your audio files stay in your library.</p>
        <div className="playlist-modal-actions"><button className="playlist-cancel-button" onClick={onClose}>Keep playlist</button><button className="playlist-delete-button" onClick={onDelete}>Delete playlist</button></div>
      </section>
    </div>
  )
}