import { afterEach, describe, expect, it, vi } from 'vitest'
import { YouTubeCatalog } from './YouTubeCatalog'

describe('YouTubeCatalog', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests the same-origin function without exposing an API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: 'video-123',
          title: 'A song',
          channelTitle: 'An artist',
          thumbnailUrl: 'https://img.example/cover.jpg',
          publishedAt: '2026-01-01T00:00:00Z',
        }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const videos = await new YouTubeCatalog().search('A song')

    expect(videos).toEqual([{
      id: 'video-123',
      title: 'A song',
      channelTitle: 'An artist',
      thumbnailUrl: 'https://img.example/cover.jpg',
      publishedAt: '2026-01-01T00:00:00Z',
    }])
    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string, 'https://sonora.test')
    expect(requestUrl.pathname).toBe('/.netlify/functions/youtube-search')
    expect(requestUrl.searchParams.get('q')).toBe('A song')
    expect(requestUrl.searchParams.has('key')).toBe(false)
  })
})