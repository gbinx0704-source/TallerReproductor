import type { YouTubeVideo } from '../../domain/entities/YouTubeVideo'

type YouTubeSearchResponse = {
  items?: YouTubeVideo[]
  error?: string
}

export class YouTubeCatalog {
  async search(query: string, signal?: AbortSignal): Promise<YouTubeVideo[]> {
    const params = new URLSearchParams({ q: query })
    const response = await fetch(`/.netlify/functions/youtube-search?${params}`, { signal })
    let payload: YouTubeSearchResponse
    try {
      payload = await response.json() as YouTubeSearchResponse
    } catch {
      throw new Error('Online search requires Netlify Dev locally or a deployed Netlify site.')
    }
    if (!response.ok) {
      throw new Error(payload.error ?? 'YouTube search is temporarily unavailable.')
    }
    return payload.items ?? []
  }
}