import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioLines,
  Compass,
  Disc3,
  ExternalLink,
  Heart,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { DoublyLinkedList, type DoublyLinkedListNode } from './domain/DoublyLinkedList'
import type { RepeatMode } from './domain/PlaybackSettings'
import { Playlist, type PlaylistDirection } from './domain/Playlist'
import type { StoredTrack, Track } from './domain/Track'
import type { YouTubeVideo } from './domain/YouTubeVideo'
import { TrackLibrary, trackFromFile } from './services/storage/TrackLibrary'
import { YouTubeCatalog } from './services/catalog/YouTubeCatalog'
import { AddToPlaylistDialog, AddTracksDialog, DeletePlaylistDialog, PlaylistNameDialog } from './features/playlists/components/PlaylistDialogs'
import { PlaylistDetail } from './features/playlists/components/PlaylistDetail'
import { PlaylistSidebar } from './features/playlists/components/PlaylistSidebar'
import { TrackTable } from './features/library/components/TrackTable'
import { VideoSearchResults } from './features/discovery/components/VideoSearchResults'
import { PlayerBar } from './features/player/components/PlayerBar'
import './App.css'

type LibraryView = 'all' | 'favorites' | 'online' | 'playlist'

const library = new TrackLibrary()
const youTubeCatalog = new YouTubeCatalog()
const acceptedAudioTypes = 'audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.opus'

function pickRandomIndex(length: number): number {
  return Math.floor(Math.random() * length)
}

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [queuePlaylistId, setQueuePlaylistId] = useState<string | null>(null)
  const [isPlaylistNameDialogOpen, setIsPlaylistNameDialogOpen] = useState(false)
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null)
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState<Track | null>(null)
  const [addingTracksPlaylistId, setAddingTracksPlaylistId] = useState<string | null>(null)
  const [deletingPlaylistId, setDeletingPlaylistId] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('sonora-favorites') ?? '[]') as string[])
    } catch {
      return new Set()
    }
  })
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)
  const [onlineResults, setOnlineResults] = useState<YouTubeVideo[]>([])
  const [isOnlineLoading, setIsOnlineLoading] = useState(false)
  const [onlineError, setOnlineError] = useState('')
  const [view, setView] = useState<LibraryView>('all')
  const [search, setSearch] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [volume, setVolume] = useState(0.8)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const objectUrlRef = useRef('')
  const storedTracksRef = useRef(new Map<string, StoredTrack>())
  const linkedQueueRef = useRef(new DoublyLinkedList<Track>())
  const currentNodeRef = useRef<DoublyLinkedListNode<Track> | null>(null)
  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null
  const addingTracksPlaylist = playlists.find((playlist) => playlist.id === addingTracksPlaylistId) ?? null
  const deletingPlaylist = playlists.find((playlist) => playlist.id === deletingPlaylistId) ?? null

  const selectedPlaylistTracks = useMemo(() => {
    if (!selectedPlaylist) return []
    const tracksById = new Map(tracks.map((track) => [track.id, track]))
    return selectedPlaylist.trackOrder.flatMap((id) => {
      const track = tracksById.get(id)
      return track ? [track] : []
    })
  }, [selectedPlaylist, tracks])

  const visibleTracks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const source = view === 'playlist' ? selectedPlaylistTracks : tracks
    return source.filter((track) => {
      const matchesView = view === 'all' || (view === 'favorites' && favoriteIds.has(track.id)) || view === 'playlist'
      const matchesSearch = !query || `${track.title} ${track.artist} ${track.fileName}`
        .toLocaleLowerCase()
        .includes(query)
      return matchesView && matchesSearch
    })
  }, [favoriteIds, search, selectedPlaylistTracks, tracks, view])

  useEffect(() => {
    if (view !== 'online') return
    const query = search.trim()
    if (query.length < 2) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setIsOnlineLoading(true)
      setOnlineError('')
      youTubeCatalog.search(query, controller.signal)
        .then(setOnlineResults)
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setOnlineResults([])
            setOnlineError(reason instanceof Error ? reason.message : 'YouTube search is temporarily unavailable.')
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsOnlineLoading(false)
        })
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [search, view])

  useEffect(() => {
    let active = true
    Promise.all([library.getAll(), library.getAllPlaylists()])
      .then(([storedTracks, playlistRecords]) => {
        if (!active) return
        storedTracks.sort((left, right) => left.addedAt - right.addedAt)
        storedTracksRef.current = new Map(storedTracks.map((track) => [track.id, track]))
        setTracks(storedTracks.map(({ audio: _audio, ...track }) => track))
        setPlaylists(playlistRecords.map((playlist) => new Playlist(playlist)).sort((left, right) => left.createdAt - right.createdAt))
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'The local library could not be opened.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!selectedVideo) return
    function closeVideoOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedVideo(null)
    }
    window.addEventListener('keydown', closeVideoOnEscape)
    return () => window.removeEventListener('keydown', closeVideoOnEscape)
  }, [selectedVideo])

  useEffect(() => {
    const queue = new DoublyLinkedList<Track>()
    const queuePlaylist = queuePlaylistId ? playlists.find((playlist) => playlist.id === queuePlaylistId) : null
    const queueSource = queuePlaylist
      ? queuePlaylist.trackOrder.flatMap((id) => {
        const track = tracks.find((item) => item.id === id)
        return track ? [track] : []
      })
      : tracks
    queueSource.forEach((track) => queue.append(track))
    linkedQueueRef.current = queue
    currentNodeRef.current = currentTrack ? queue.find((track) => track.id === currentTrack.id) : null
  }, [currentTrack, playlists, queuePlaylistId, tracks])

  useEffect(() => {
    localStorage.setItem('sonora-favorites', JSON.stringify([...favoriteIds]))
  }, [favoriteIds])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    function handleKeyboardShortcuts(event: KeyboardEvent) {
      const target = event.target
      const isEditing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))
      if (event.key === '/' && !isEditing) {
        event.preventDefault()
        searchInputRef.current?.focus()
      } else if (event.key === 'Escape' && target === searchInputRef.current) {
        setSearch('')
        searchInputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts)
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [])

  async function importFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac|opus)$/i.test(file.name))
    if (!files.length) {
      setError('Choose audio files to add to your library.')
      return
    }

    setError('')
    try {
      const imported = files.map(trackFromFile)
      await library.addMany(imported)
      imported.forEach((track) => storedTracksRef.current.set(track.id, track))
      setTracks((existing) => [...existing, ...imported.map(({ audio: _audio, ...track }) => track)])
      setView('all')
      setSearch('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The audio files could not be saved.')
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  async function playTrack(track: Track, playlistId: string | null = null) {
    const storedTrack = storedTracksRef.current.get(track.id)
    const audio = audioRef.current
    if (!storedTrack || !audio) {
      setError('This audio file is unavailable. Try importing it again.')
      return
    }

    setError('')
    audio.pause()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(storedTrack.audio)
    objectUrlRef.current = url
    audio.src = url
    audio.load()
    setQueuePlaylistId(playlistId)
    setCurrentTrack(track)
    setCurrentTime(0)
    setDuration(0)
    try {
      await audio.play()
      setIsPlaying(true)
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return
      setIsPlaying(false)
      setError('Playback could not start. Try pressing play again.')
    }
  }

  function openCreatePlaylist(track: Track | null = null) {
    setRenamingPlaylistId(null)
    setPlaylistPickerTrack(track)
    setIsPlaylistNameDialogOpen(true)
  }

  async function savePlaylistName(name: string) {
    try {
      if (renamingPlaylistId) {
        const existing = playlists.find((playlist) => playlist.id === renamingPlaylistId)
        if (!existing) return
        const updated = new Playlist(existing.toRecord())
        updated.rename(name)
        await library.savePlaylist(updated.toRecord())
        setPlaylists((current) => current.map((playlist) => playlist.id === updated.id ? updated : playlist))
      } else {
        const created = Playlist.create(name)
        if (playlistPickerTrack) created.addTrack(playlistPickerTrack.id)
        await library.savePlaylist(created.toRecord())
        setPlaylists((current) => [...current, created])
        setSelectedPlaylistId(created.id)
        setView('playlist')
        setPlaylistPickerTrack(null)
      }
      setIsPlaylistNameDialogOpen(false)
      setRenamingPlaylistId(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The playlist could not be saved.')
    }
  }

  async function updatePlaylist(playlistId: string, update: (playlist: Playlist) => void) {
    const existing = playlists.find((playlist) => playlist.id === playlistId)
    if (!existing) return
    const updated = new Playlist(existing.toRecord())
    update(updated)
    try {
      await library.savePlaylist(updated.toRecord())
      setPlaylists((current) => current.map((playlist) => playlist.id === playlistId ? updated : playlist))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The playlist could not be updated.')
    }
  }

  async function deletePlaylist(playlistId: string) {
    try {
      await library.removePlaylist(playlistId)
      setPlaylists((current) => current.filter((playlist) => playlist.id !== playlistId))
      if (selectedPlaylistId === playlistId) {
        setSelectedPlaylistId(null)
        setView('all')
      }
      if (queuePlaylistId === playlistId) setQueuePlaylistId(null)
      setDeletingPlaylistId(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The playlist could not be deleted.')
    }
  }

  function playPlaylist(playlistId: string) {
    const playlist = playlists.find((item) => item.id === playlistId)
    const firstTrackId = playlist?.trackOrder[0]
    const firstTrack = tracks.find((track) => track.id === firstTrackId)
    if (!firstTrack || !playlist) {
      setError('Add a track to this playlist before playing it.')
      return
    }
    setSelectedPlaylistId(playlist.id)
    setView('playlist')
    void playTrack(firstTrack, playlist.id)
  }

  function addTrackToPlaylist(playlistId: string, trackId: string) {
    void updatePlaylist(playlistId, (playlist) => { playlist.addTrack(trackId) })
  }

  function removePlaylistTrack(playlistId: string, trackId: string) {
    void updatePlaylist(playlistId, (playlist) => { playlist.removeTrack(trackId) })
  }

  function movePlaylistTrack(playlistId: string, trackId: string, direction: PlaylistDirection) {
    void updatePlaylist(playlistId, (playlist) => { playlist.moveTrack(trackId, direction) })
  }

  function watchVideo(video: YouTubeVideo) {
    const audio = audioRef.current
    audio?.pause()
    audio?.removeAttribute('src')
    audio?.load()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
    setCurrentTrack(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setSelectedVideo(video)
  }

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else if (currentTrack) {
      void audio.play().then(() => setIsPlaying(true)).catch(() => setError('Playback could not start.'))
    } else if (tracks[0]) {
      void playTrack(tracks[0])
    }
  }

  function chooseNextTrack(direction: 'next' | 'previous'): Track | null {
    const queue = linkedQueueRef.current
    const currentNode = currentNodeRef.current
    if (!currentNode || !queue.length) return queue.first ? queue.find((track) => track.id === queue.first?.id)?.value ?? null : null

    if (isShuffle && direction === 'next' && queue.length > 1) {
      const candidates = [...queue].filter((track) => track.id !== currentNode.value.id)
      return candidates[pickRandomIndex(candidates.length)] ?? null
    }

    const nextNode = direction === 'next'
      ? queue.next(currentNode, repeatMode === 'all')
      : queue.previous(currentNode, repeatMode === 'all')
    return nextNode?.value ?? null
  }

  function skip(direction: 'next' | 'previous') {
    if (direction === 'previous' && audioRef.current && audioRef.current.currentTime > 3 && currentTrack) {
      audioRef.current.currentTime = 0
      setCurrentTime(0)
      return
    }
    const nextTrack = chooseNextTrack(direction)
    if (nextTrack) void playTrack(nextTrack)
    else if (direction === 'next') setIsPlaying(false)
  }

  function handleEnded() {
    if (repeatMode === 'one' && currentTrack) {
      void playTrack(currentTrack)
      return
    }
    const nextTrack = chooseNextTrack('next')
    if (nextTrack) void playTrack(nextTrack)
    else setIsPlaying(false)
  }

  function toggleFavorite(track: Track) {
    setFavoriteIds((current) => {
      const updated = new Set(current)
      if (updated.has(track.id)) updated.delete(track.id)
      else updated.add(track.id)
      return updated
    })
  }

  async function removeTrack(track: Track) {
    try {
      if (currentTrack?.id === track.id) {
        audioRef.current?.pause()
        if (audioRef.current) audioRef.current.removeAttribute('src')
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = ''
        setCurrentTrack(null)
        setIsPlaying(false)
      }
      await library.remove(track.id)
      storedTracksRef.current.delete(track.id)
      setTracks((existing) => existing.filter((item) => item.id !== track.id))
      setPlaylists((existing) => existing.map((playlist) => {
        if (!playlist.hasTrack(track.id)) return playlist
        const updated = new Playlist(playlist.toRecord())
        updated.removeTrack(track.id)
        return updated
      }))
      setFavoriteIds((current) => {
        const updated = new Set(current)
        updated.delete(track.id)
        return updated
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This track could not be removed.')
    }
  }

  function cycleRepeat() {
    setRepeatMode((current) => current === 'off' ? 'all' : current === 'all' ? 'one' : 'off')
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    void importFiles(event.dataTransfer.files)
  }

  return (
    <div
      className="app-shell"
      onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsDragging(false)
      }}
      onDrop={handleDrop}
    >
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Sonora home">
          <span className="brand-mark"><AudioLines size={21} strokeWidth={2.4} /></span>
          <span>sonora<span className="brand-period">.</span></span>
        </a>
        <p className="nav-label">YOUR SPACE</p>
        <nav className="primary-nav" aria-label="Library navigation">
          <button aria-label="My library" className={view === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => setView('all')}>
            <Disc3 size={18} /><span className="nav-item-label">My library</span><span className="nav-count">{tracks.length}</span>
          </button>
          <button aria-label="Favorites" className={view === 'favorites' ? 'nav-item active' : 'nav-item'} onClick={() => setView('favorites')}>
            <Heart size={18} /><span className="nav-item-label">Favorites</span><span className="nav-count">{favoriteIds.size}</span>
          </button>
          <button aria-label="Discover online" className={view === 'online' ? 'nav-item active' : 'nav-item'} onClick={() => {
            setView('online')
            if (search.trim().length >= 2) {
              setOnlineResults([])
              setOnlineError('')
              setIsOnlineLoading(true)
            }
          }}>
            <Compass size={18} /><span className="nav-item-label">Discover</span>
          </button>
        </nav>

        <div className="sidebar-library">
          <div className="sidebar-section-title"><span>YOUR TRACKS</span><button aria-label="Add audio" title="Add audio" onClick={() => inputRef.current?.click()}><Upload size={15} /></button></div>
          <div className="mini-track-list">
            {tracks.slice(-5).reverse().map((track) => (
              <button className={currentTrack?.id === track.id ? 'mini-track playing' : 'mini-track'} key={track.id} onClick={() => void playTrack(track)}>
                <span className="mini-cover"><Music2 size={14} /></span>
                <span className="mini-track-copy"><span>{track.title}</span><small>{track.artist}</small></span>
              </button>
            ))}
            {!tracks.length && <p className="sidebar-empty">Your songs will appear here.</p>}
          </div>
        </div>

        <PlaylistSidebar
          playlists={playlists}
          selectedId={selectedPlaylistId}
          onSelect={(playlistId) => { setSelectedPlaylistId(playlistId); setView('playlist') }}
          onCreate={() => openCreatePlaylist()}
        />

        <div className="sidebar-bottom">
          <span className="local-indicator" />
          <div><strong>On this device</strong><small>Your music stays yours</small></div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div className="search-box"><Search size={17} /><input ref={searchInputRef} value={search} onChange={(event) => {
            const value = event.target.value
            setSearch(value)
            if (view === 'online') {
              setOnlineResults([])
              setOnlineError('')
              setIsOnlineLoading(value.trim().length >= 2)
            }
          }} placeholder={view === 'online' ? 'Search YouTube music' : 'Search your music'} aria-label={view === 'online' ? 'Search YouTube music' : 'Search your music'} /><kbd>/</kbd></div>
          <button className="add-button" onClick={() => inputRef.current?.click()}><Upload size={16} /><span>Add music</span></button>
          <input ref={inputRef} className="visually-hidden" type="file" accept={acceptedAudioTypes} multiple onChange={(event) => event.target.files && void importFiles(event.target.files)} />
        </header>

        <div className="content-inner">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">{view === 'playlist' ? 'YOUR SEQUENCE / PLAYLIST' : 'A HOME FOR YOUR SOUND'}</p>
              <h1>{view === 'playlist' ? selectedPlaylist?.name ?? 'Your playlists.' : view === 'online' ? 'Find your next song.' : view === 'favorites' ? 'The ones you love.' : 'Your music, in full.'}</h1>
              <p className="welcome-copy">{view === 'playlist' ? 'A hand-picked sequence, arranged exactly the way you like.' : view === 'online' ? 'Search music videos and play them here with YouTube.' : 'A personal listening space, made from the music you already have.'}</p>
            </div>
            <div className="track-total"><span>{tracks.length.toString().padStart(2, '0')}</span><small>TRACKS<br />IN YOUR LIBRARY</small></div>
          </section>

          <section className={currentTrack && isPlaying ? 'featured-panel is-playing' : 'featured-panel'} aria-label="Now playing">
            <div className="featured-copy">
              <p className="eyebrow">{currentTrack ? 'NOW PLAYING' : 'YOUR LISTENING ROOM'}</p>
              <h2>{currentTrack?.title ?? 'Make room for a good song.'}</h2>
              <p className="featured-subtitle">{currentTrack?.artist ?? 'Choose a track from your library or add something new.'}</p>
              <button className="featured-play" onClick={togglePlayback} disabled={!currentTrack && tracks.length === 0} aria-label={isPlaying ? 'Pause playback' : 'Start playback'}>
                {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
                <span>{isPlaying ? 'Pause listening' : currentTrack ? 'Resume listening' : 'Start listening'}</span>
              </button>
            </div>
            <div className="featured-art" aria-hidden="true"><span className="art-sun" /><span className="art-ring ring-one" /><span className="art-ring ring-two" /><AudioLines className="art-wave" size={86} strokeWidth={1.2} /></div>
            <div className="featured-index"><span>01</span><span>—</span><span>{tracks.length.toString().padStart(2, '0')}</span></div>
          </section>

          <section className="library-section">
            <div className="section-heading">
              <div><p className="eyebrow">{view === 'online' ? 'VIDEO DISCOVERY' : view === 'playlist' ? 'CURATED BY YOU' : 'THE COLLECTION'}</p><h2>{view === 'online' ? 'Search YouTube' : view === 'playlist' ? selectedPlaylist?.name ?? 'Playlist' : view === 'favorites' ? 'Favorites' : 'Your library'}</h2></div>
              {view === 'playlist' && selectedPlaylist
                ? <button className="text-button" onClick={() => setAddingTracksPlaylistId(selectedPlaylist.id)}><Plus size={15} /> Add tracks</button>
                : view === 'online'
                  ? null
                  : <button className="text-button" onClick={() => view === 'favorites' ? inputRef.current?.click() : openCreatePlaylist()}>{view === 'favorites' ? <Upload size={15} /> : <Plus size={15} />}{view === 'favorites' ? 'Add music' : 'New playlist'}</button>}
            </div>

            {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><X size={16} /></button></div>}

            {view === 'online' ? (
              <VideoSearchResults query={search} results={onlineResults} isLoading={isOnlineLoading} error={onlineError} onWatch={watchVideo} />
            ) : view === 'playlist' && selectedPlaylist ? (
              <PlaylistDetail
                playlist={selectedPlaylist}
                tracks={tracks}
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                search={search}
                onPlay={(track) => void playTrack(track, selectedPlaylist.id)}
                onPlayPlaylist={() => playPlaylist(selectedPlaylist.id)}
                onAddTracks={() => setAddingTracksPlaylistId(selectedPlaylist.id)}
                onMoveTrack={(trackId, direction) => movePlaylistTrack(selectedPlaylist.id, trackId, direction)}
                onRemoveTrack={(trackId) => removePlaylistTrack(selectedPlaylist.id, trackId)}
                onRename={() => { setRenamingPlaylistId(selectedPlaylist.id); setIsPlaylistNameDialogOpen(true) }}
                onDelete={() => setDeletingPlaylistId(selectedPlaylist.id)}
              />
            ) : view === 'playlist' ? (
              <div className="empty-state"><div className="empty-icon"><ListMusic size={25} /></div><h3>Select a playlist</h3><p>Create a playlist or choose one from your collection.</p><button className="add-button" onClick={() => openCreatePlaylist()}><Plus size={16} /> Create playlist</button></div>
            ) : isLoading ? <div className="loading-state">Opening your local library...</div> : visibleTracks.length ? (
              <TrackTable
                tracks={visibleTracks}
                favoriteIds={favoriteIds}
                currentTrackId={currentTrack?.id ?? null}
                isPlaying={isPlaying}
                onPlay={(track) => void playTrack(track)}
                onToggleFavorite={toggleFavorite}
                onAddToPlaylist={setPlaylistPickerTrack}
                onRemove={(track) => void removeTrack(track)}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">{view === 'favorites' ? <Heart size={25} /> : <ListMusic size={25} />}</div>
                <h3>{view === 'favorites' ? 'No favorites yet' : search ? 'No matches found' : 'Your library is waiting'}</h3>
                <p>{view === 'favorites' ? 'Save a track with the heart and it will live here.' : search ? 'Try a different title or artist.' : 'Drop audio files anywhere on this page, or browse your device.'}</p>
                {!search && view === 'all' && <button className="add-button" onClick={() => inputRef.current?.click()}><Upload size={16} /> Choose audio files</button>}
              </div>
            )}
          </section>

          <footer className="page-footer"><span>SONORA / PERSONAL AUDIO</span><span>Made for the music you own.</span></footer>
        </div>
      </main>

      <PlayerBar
        audioRef={audioRef}
        currentTrack={currentTrack}
        selectedVideo={selectedVideo}
        favoriteIds={favoriteIds}
        isPlaying={isPlaying}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        volume={volume}
        currentTime={currentTime}
        duration={duration}
        canSkip={tracks.length > 0}
        onTogglePlayback={togglePlayback}
        onToggleShuffle={() => setIsShuffle((current) => !current)}
        onSkip={skip}
        onCycleRepeat={cycleRepeat}
        onToggleFavorite={toggleFavorite}
        onVolumeChange={setVolume}
        onSeek={(time) => { if (audioRef.current) audioRef.current.currentTime = time; setCurrentTime(time) }}
        onTimeUpdate={setCurrentTime}
        onDurationChange={setDuration}
        onEnded={handleEnded}
        onAudioError={() => { if (currentTrack) setError('This file could not be played by your browser. Try another audio format.'); setIsPlaying(false) }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {isDragging && <div className="drop-overlay" aria-live="polite"><div className="drop-message"><Upload size={32} /><strong>Drop your music here</strong><span>Audio files will be added to your local library</span></div></div>}

      {selectedVideo && (
        <div className="video-overlay" onClick={(event) => { if (event.target === event.currentTarget) setSelectedVideo(null) }}>
          <section className="video-dialog" role="dialog" aria-modal="true" aria-labelledby="video-dialog-title">
            <header className="video-dialog-header">
              <div><p className="eyebrow">NOW PLAYING ON YOUTUBE</p><h2 id="video-dialog-title">{selectedVideo.title}</h2><span>{selectedVideo.channelTitle}</span></div>
              <a className="youtube-external" href={`https://www.youtube.com/watch?v=${encodeURIComponent(selectedVideo.id)}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink size={14} /></a>
              <button className="icon-button" aria-label="Close video" autoFocus onClick={() => setSelectedVideo(null)}><X size={19} /></button>
            </header>
            <div className="video-frame">
              <iframe
                key={selectedVideo.id}
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedVideo.id)}?autoplay=1&playsinline=1&rel=0`}
                title={`${selectedVideo.title} by ${selectedVideo.channelTitle}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </section>
        </div>
      )}

      {isPlaylistNameDialogOpen && (
        <PlaylistNameDialog
          initialName={renamingPlaylistId ? playlists.find((playlist) => playlist.id === renamingPlaylistId)?.name ?? '' : ''}
          onClose={() => { setIsPlaylistNameDialogOpen(false); setRenamingPlaylistId(null) }}
          onSave={(name) => void savePlaylistName(name)}
        />
      )}

      {playlistPickerTrack && (
        <AddToPlaylistDialog
          track={playlistPickerTrack}
          playlists={playlists}
          onClose={() => setPlaylistPickerTrack(null)}
          onSelect={(playlistId) => { addTrackToPlaylist(playlistId, playlistPickerTrack.id); setPlaylistPickerTrack(null) }}
          onCreate={() => openCreatePlaylist(playlistPickerTrack)}
        />
      )}

      {addingTracksPlaylist && (
        <AddTracksDialog
          playlist={addingTracksPlaylist}
          tracks={tracks}
          onClose={() => setAddingTracksPlaylistId(null)}
          onAdd={(trackId) => addTrackToPlaylist(addingTracksPlaylist.id, trackId)}
        />
      )}

      {deletingPlaylist && (
        <DeletePlaylistDialog
          playlist={deletingPlaylist}
          onClose={() => setDeletingPlaylistId(null)}
          onDelete={() => void deletePlaylist(deletingPlaylist.id)}
        />
      )}
    </div>
  )
}

export default App