import { afterEach, describe, expect, it, vi } from 'vitest'
import youtubeSearch from '../netlify/functions/youtube-search.mjs'

describe('youtube-search function', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns a configuration message when the server key is missing', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '')

    const response = await youtubeSearch(new Request('https://site.test/.netlify/functions/youtube-search?q=music'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Add YOUTUBE_API_KEY to this Netlify site to enable online search.',
    })
  })

  it('filters and maps YouTube results using the server-side key', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'server-only-key')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [
        {
          id: { videoId: 'video-123' },
          snippet: {
            title: 'A song',
            channelTitle: 'An artist',
            publishedAt: '2026-01-01T00:00:00Z',
            thumbnails: { medium: { url: 'https://img.example/cover.jpg' } },
          },
        },
        { id: {}, snippet: { title: 'Unplayable result' } },
      ],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await youtubeSearch(new Request('https://site.test/.netlify/functions/youtube-search?q=A%20song'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [{
        id: 'video-123',
        title: 'A song',
        channelTitle: 'An artist',
        thumbnailUrl: 'https://img.example/cover.jpg',
        publishedAt: '2026-01-01T00:00:00Z',
      }],
    })
    const requestUrl = new URL(fetchMock.mock.calls[0][0])
    expect(requestUrl.searchParams.get('key')).toBe('server-only-key')
    expect(requestUrl.searchParams.get('videoEmbeddable')).toBe('true')
  })

  it('rejects invalid search terms before calling YouTube', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'server-only-key')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await youtubeSearch(new Request('https://site.test/.netlify/functions/youtube-search?q=x'))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})