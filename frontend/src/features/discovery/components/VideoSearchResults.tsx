import { Compass, Play, Search } from 'lucide-react'
import type { YouTubeVideo } from '../../../domain/entities/YouTubeVideo'

type VideoSearchResultsProps = {
  query: string
  results: YouTubeVideo[]
  isLoading: boolean
  error: string
  onWatch: (video: YouTubeVideo) => void
}

export function VideoSearchResults({ query, results, isLoading, error, onWatch }: VideoSearchResultsProps) {
  if (error) {
    return <div className="empty-state online-empty"><div className="empty-icon"><Compass size={25} /></div><h3>Online search unavailable</h3><p>{error}</p></div>
  }
  if (query.trim().length < 2) {
    return <div className="empty-state online-empty"><div className="empty-icon"><Search size={25} /></div><h3>Search the music video catalog</h3><p>Enter at least two characters to find videos that can play here.</p></div>
  }
  if (isLoading) return <div className="loading-state">Searching YouTube...</div>
  if (!results.length) {
    return <div className="empty-state online-empty"><div className="empty-icon"><Search size={25} /></div><h3>No videos found</h3><p>Try another song, artist, or spelling.</p></div>
  }

  return (
    <div className="video-grid">
      {results.map((video) => (
        <article className="video-result" key={video.id}>
          <button className="video-thumbnail" aria-label={`Play ${video.title}`} onClick={() => onWatch(video)}>
            {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" loading="lazy" />}
            <span className="video-play-icon"><Play size={21} fill="currentColor" /></span>
            <span className="video-source-label">YOUTUBE</span>
          </button>
          <div className="video-result-copy"><strong title={video.title}>{video.title}</strong><span>{video.channelTitle}</span></div>
          <button className="video-watch-button" onClick={() => onWatch(video)}><Play size={14} fill="currentColor" /> Watch video</button>
        </article>
      ))}
    </div>
  )
}