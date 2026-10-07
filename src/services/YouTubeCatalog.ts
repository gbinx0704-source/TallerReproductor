import type { YouTubeVideo } from '../domain/YouTubeVideo'

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: {
      title?: string
      channelTitle?: string
      publishedAt?: string
      thumbnails?: {
        high?: { url?: string }
        medium?: { url?: string }
        default?: { url?: string }
      }
    }
  }>
  error?: { message?: string }
}

export class YouTubeCatalog {
  private readonly apiKey: string | undefined

  constructor(apiKey = import.meta.env.VITE_YOUTUBE_API_KEY) {
    this.apiKey = apiKey
  }

  async search(query: string, signal?: AbortSignal): Promise<YouTubeVideo[]> {
    if (!this.apiKey) {
      throw new Error('YouTube search needs an API key. Add VITE_YOUTUBE_API_KEY to your local environment or GitHub Actions secrets.')
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('type', 'video')
    url.searchParams.set('videoEmbeddable', 'true')
    url.searchParams.set('safeSearch', 'moderate')
    url.searchParams.set('maxResults', '18')
    url.searchParams.set('q', query)
    url.searchParams.set('key', this.apiKey)

    const response = await fetch(url, { signal })
    const payload = await response.json() as YouTubeSearchResponse
    if (!response.ok) {
      throw new Error(payload.error?.message ?? 'YouTube search is temporarily unavailable.')
    }

    return (payload.items ?? []).flatMap((item) => {
      const id = item.id?.videoId
      const snippet = item.snippet
      if (!id || !snippet?.title) return []
      return [{
        id,
        title: snippet.title,
        channelTitle: snippet.channelTitle ?? 'YouTube creator',
        thumbnailUrl: snippet.thumbnails?.high?.url
          ?? snippet.thumbnails?.medium?.url
          ?? snippet.thumbnails?.default?.url
          ?? '',
        publishedAt: snippet.publishedAt ?? '',
      }]
    })
  }
}