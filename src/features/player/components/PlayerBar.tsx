import type { RefObject } from 'react'
import { Heart, Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import type { RepeatMode } from '../../../domain/PlaybackSettings'
import type { Track } from '../../../domain/Track'
import type { YouTubeVideo } from '../../../domain/YouTubeVideo'

type PlayerBarProps = {
  audioRef: RefObject<HTMLAudioElement | null>
  currentTrack: Track | null
  selectedVideo: YouTubeVideo | null
  favoriteIds: Set<string>
  isPlaying: boolean
  isShuffle: boolean
  repeatMode: RepeatMode
  volume: number
  currentTime: number
  duration: number
  canSkip: boolean
  onTogglePlayback: () => void
  onToggleShuffle: () => void
  onSkip: (direction: 'next' | 'previous') => void
  onCycleRepeat: () => void
  onToggleFavorite: (track: Track) => void
  onVolumeChange: (volume: number) => void
  onSeek: (time: number) => void
  onTimeUpdate: (time: number) => void
  onDurationChange: (duration: number) => void
  onEnded: () => void
  onAudioError: () => void
  onPlay: () => void
  onPause: () => void
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function PlayerBar({
  audioRef,
  currentTrack,
  selectedVideo,
  favoriteIds,
  isPlaying,
  isShuffle,
  repeatMode,
  volume,
  currentTime,
  duration,
  canSkip,
  onTogglePlayback,
  onToggleShuffle,
  onSkip,
  onCycleRepeat,
  onToggleFavorite,
  onVolumeChange,
  onSeek,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onAudioError,
  onPlay,
  onPause,
}: PlayerBarProps) {
  const videoIsActive = Boolean(selectedVideo)

  return (
    <>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
        onDurationChange={(event) => onDurationChange(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={onAudioError}
      />

      <footer className="player-bar">
        <div className="player-track">
          <span className="player-cover"><Music2 size={19} /></span>
          <div className="player-track-copy"><strong>{selectedVideo?.title ?? currentTrack?.title ?? 'Nothing playing'}</strong><span>{selectedVideo ? `${selectedVideo.channelTitle} · YouTube` : currentTrack?.artist ?? 'Pick a song to begin'}</span></div>
          {currentTrack && <button className={favoriteIds.has(currentTrack.id) ? 'icon-button favorite selected' : 'icon-button favorite'} aria-label="Toggle favorite" onClick={() => onToggleFavorite(currentTrack)}><Heart size={17} fill={favoriteIds.has(currentTrack.id) ? 'currentColor' : 'none'} /></button>}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className={isShuffle ? 'control-button active-control' : 'control-button'} aria-label="Toggle shuffle" title="Shuffle" onClick={onToggleShuffle} disabled={videoIsActive}><Shuffle size={17} /></button>
            <button className="control-button skip-button" aria-label="Previous track" title="Previous track" onClick={() => onSkip('previous')} disabled={videoIsActive || !canSkip}><SkipBack size={19} fill="currentColor" /></button>
            <button className="main-play" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={onTogglePlayback} disabled={videoIsActive}><span>{isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</span></button>
            <button className="control-button skip-button" aria-label="Next track" title="Next track" onClick={() => onSkip('next')} disabled={videoIsActive || !canSkip}><SkipForward size={19} fill="currentColor" /></button>
            <button className={repeatMode !== 'off' ? 'control-button active-control' : 'control-button'} aria-label={`Repeat ${repeatMode}`} title={`Repeat ${repeatMode}`} onClick={onCycleRepeat} disabled={videoIsActive}>{repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}</button>
          </div>
          <div className="timeline"><span>{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} aria-label="Playback position" onChange={(event) => onSeek(Number(event.target.value))} disabled={videoIsActive || !currentTrack || !duration} /><span>{formatTime(duration)}</span></div>
        </div>

        <div className="player-volume"><Volume2 size={17} /><input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" onChange={(event) => onVolumeChange(Number(event.target.value))} disabled={videoIsActive} /></div>
      </footer>
    </>
  )
}