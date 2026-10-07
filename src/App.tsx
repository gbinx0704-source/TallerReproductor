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
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react'
import { DoublyLinkedList, type DoublyLinkedListNode } from './domain/DoublyLinkedList'
import type { StoredTrack, Track } from './domain/Track'
import type { YouTubeVideo } from './domain/YouTubeVideo'
import { TrackLibrary, trackFromFile } from './services/TrackLibrary'
import { YouTubeCatalog } from './services/YouTubeCatalog'
import './App.css'

type RepeatMode = 'off' | 'all' | 'one'
type LibraryView = 'all' | 'favorites' | 'online'

const library = new TrackLibrary()
const youTubeCatalog = new YouTubeCatalog()
const acceptedAudioTypes = 'audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.opus'

function pickRandomIndex(length: number): number {
  return Math.floor(Math.random() * length)
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
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

  const visibleTracks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return tracks.filter((track) => {
      const matchesView = view === 'all' || (view === 'favorites' && favoriteIds.has(track.id))
      const matchesSearch = !query || `${track.title} ${track.artist} ${track.fileName}`
        .toLocaleLowerCase()
        .includes(query)
      return matchesView && matchesSearch
    })
  }, [favoriteIds, search, tracks, view])

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
    library.getAll()
      .then((storedTracks) => {
        if (!active) return
        storedTracks.sort((left, right) => left.addedAt - right.addedAt)
        storedTracksRef.current = new Map(storedTracks.map((track) => [track.id, track]))
        setTracks(storedTracks.map(({ audio: _audio, ...track }) => track))
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
    tracks.forEach((track) => queue.append(track))
    linkedQueueRef.current = queue
    currentNodeRef.current = currentTrack ? queue.find((track) => track.id === currentTrack.id) : null
  }, [currentTrack, tracks])

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

  async function playTrack(track: Track) {
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
              <p className="eyebrow">A HOME FOR YOUR SOUND</p>
              <h1>{view === 'online' ? 'Find your next song.' : view === 'favorites' ? 'The ones you love.' : 'Your music, in full.'}</h1>
              <p className="welcome-copy">{view === 'online' ? 'Search music videos and play them here with YouTube.' : 'A personal listening space, made from the music you already have.'}</p>
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
              <div><p className="eyebrow">{view === 'online' ? 'VIDEO DISCOVERY' : 'THE COLLECTION'}</p><h2>{view === 'online' ? 'Search YouTube' : view === 'favorites' ? 'Favorites' : 'Your library'}</h2></div>
              <button className="text-button" onClick={() => inputRef.current?.click()}><Upload size={15} /> Add tracks</button>
            </div>

            {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><X size={16} /></button></div>}

            {view === 'online' ? (
              onlineError ? (
                <div className="empty-state online-empty"><div className="empty-icon"><Compass size={25} /></div><h3>Online search unavailable</h3><p>{onlineError}</p></div>
              ) : search.trim().length < 2 ? (
                <div className="empty-state online-empty"><div className="empty-icon"><Search size={25} /></div><h3>Search the music video catalog</h3><p>Enter at least two characters to find videos that can play here.</p></div>
              ) : isOnlineLoading ? (
                <div className="loading-state">Searching YouTube...</div>
              ) : onlineResults.length ? (
                <div className="video-grid">
                  {onlineResults.map((video) => (
                    <article className="video-result" key={video.id}>
                      <button className="video-thumbnail" aria-label={`Play ${video.title}`} onClick={() => watchVideo(video)}>
                        {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" loading="lazy" />}
                        <span className="video-play-icon"><Play size={21} fill="currentColor" /></span>
                        <span className="video-source-label">YOUTUBE</span>
                      </button>
                      <div className="video-result-copy"><strong title={video.title}>{video.title}</strong><span>{video.channelTitle}</span></div>
                      <button className="video-watch-button" onClick={() => watchVideo(video)}><Play size={14} fill="currentColor" /> Watch video</button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state online-empty"><div className="empty-icon"><Search size={25} /></div><h3>No videos found</h3><p>Try another song, artist, or spelling.</p></div>
              )
            ) : isLoading ? <div className="loading-state">Opening your local library...</div> : visibleTracks.length ? (
              <div className="track-table-wrap">
                <div className="track-table-header"><span className="track-number">#</span><span>TITLE</span><span>FILE</span><span>ADDED</span><span aria-hidden="true" /></div>
                <div className="track-table">
                  {visibleTracks.map((track, index) => (
                    <div className={currentTrack?.id === track.id ? 'track-row current' : 'track-row'} key={track.id}>
                      <button className="track-number row-play" aria-label={`Play ${track.title}`} onClick={() => void playTrack(track)}>{currentTrack?.id === track.id && isPlaying ? <AudioLines size={16} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</button>
                      <button className="track-main" onClick={() => void playTrack(track)}>
                        <span className="track-cover"><Music2 size={17} /></span>
                        <span className="track-copy"><strong>{track.title}</strong><small>{track.artist}</small></span>
                      </button>
                      <span className="track-file" title={track.fileName}>{track.fileName}</span>
                      <span className="track-date">{new Date(track.addedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                      <span className="track-actions">
                        <button className={favoriteIds.has(track.id) ? 'icon-button favorite selected' : 'icon-button favorite'} aria-label={favoriteIds.has(track.id) ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`} onClick={() => toggleFavorite(track)}><Heart size={16} fill={favoriteIds.has(track.id) ? 'currentColor' : 'none'} /></button>
                        <button className="icon-button remove-track" aria-label={`Remove ${track.title}`} title="Remove from library" onClick={() => void removeTrack(track)}><Trash2 size={15} /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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

      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => {
          if (currentTrack) setError('This file could not be played by your browser. Try another audio format.')
          setIsPlaying(false)
        }}
      />

      <footer className="player-bar">
        <div className="player-track">
          <span className="player-cover"><Music2 size={19} /></span>
          <div className="player-track-copy"><strong>{selectedVideo?.title ?? currentTrack?.title ?? 'Nothing playing'}</strong><span>{selectedVideo ? `${selectedVideo.channelTitle} · YouTube` : currentTrack?.artist ?? 'Pick a song to begin'}</span></div>
          {currentTrack && <button className={favoriteIds.has(currentTrack.id) ? 'icon-button favorite selected' : 'icon-button favorite'} aria-label="Toggle favorite" onClick={() => toggleFavorite(currentTrack)}><Heart size={17} fill={favoriteIds.has(currentTrack.id) ? 'currentColor' : 'none'} /></button>}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className={isShuffle ? 'control-button active-control' : 'control-button'} aria-label="Toggle shuffle" title="Shuffle" onClick={() => setIsShuffle((current) => !current)} disabled={Boolean(selectedVideo)}><Shuffle size={17} /></button>
            <button className="control-button skip-button" aria-label="Previous track" title="Previous track" onClick={() => skip('previous')} disabled={Boolean(selectedVideo) || !tracks.length}><SkipBack size={19} fill="currentColor" /></button>
            <button className="main-play" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlayback} disabled={Boolean(selectedVideo)}><span>{isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</span></button>
            <button className="control-button skip-button" aria-label="Next track" title="Next track" onClick={() => skip('next')} disabled={Boolean(selectedVideo) || !tracks.length}><SkipForward size={19} fill="currentColor" /></button>
            <button className={repeatMode !== 'off' ? 'control-button active-control' : 'control-button'} aria-label={`Repeat ${repeatMode}`} title={`Repeat ${repeatMode}`} onClick={cycleRepeat} disabled={Boolean(selectedVideo)}>{repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}</button>
          </div>
          <div className="timeline"><span>{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} aria-label="Playback position" onChange={(event) => {
            const time = Number(event.target.value)
            if (audioRef.current) audioRef.current.currentTime = time
            setCurrentTime(time)
          }} disabled={Boolean(selectedVideo) || !currentTrack || !duration} /><span>{formatTime(duration)}</span></div>
        </div>

        <div className="player-volume"><Volume2 size={17} /><input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" onChange={(event) => setVolume(Number(event.target.value))} disabled={Boolean(selectedVideo)} /></div>
      </footer>

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
    </div>
  )
}

export default App