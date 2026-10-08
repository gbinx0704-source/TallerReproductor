import { ListMusic, Plus, Radio } from 'lucide-react'
import type { Playlist } from '../../../domain/Playlist'

type PlaylistSidebarProps = {
  playlists: Playlist[]
  selectedId: string | null
  onSelect: (playlistId: string) => void
  onCreate: () => void
}

export function PlaylistSidebar({ playlists, selectedId, onSelect, onCreate }: PlaylistSidebarProps) {
  return (
    <section className="sidebar-playlists" aria-label="Playlists">
      <div className="sidebar-section-title">
        <span>PLAYLISTS</span>
        <button aria-label="Create playlist" title="Create playlist" onClick={onCreate}><Plus size={16} /></button>
      </div>
      <div className="playlist-nav-list">
        {playlists.map((playlist, index) => (
          <button
            aria-label={`Open playlist ${playlist.name}`}
            className={selectedId === playlist.id ? 'playlist-nav active' : 'playlist-nav'}
            key={playlist.id}
            onClick={() => onSelect(playlist.id)}
          >
            <span className={`playlist-nav-art playlist-art-${index % 4}`}><ListMusic size={14} /></span>
            <span className="playlist-nav-copy"><strong>{playlist.name}</strong><small>{playlist.length} {playlist.length === 1 ? 'track' : 'tracks'}</small></span>
          </button>
        ))}
        {!playlists.length && <p className="sidebar-empty">Make a playlist for every mood.</p>}
      </div>
      <div className="sidebar-note"><Radio size={14} /><span>Playlists stay on this device</span></div>
    </section>
  )
}