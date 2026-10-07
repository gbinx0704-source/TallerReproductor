import { afterEach, describe, expect, it, vi } from 'vitest'
import { YouTubeCatalog } from './YouTubeCatalog'

describe('YouTubeCatalog', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('searches only embeddable videos and maps playable results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: { videoId: 'video-123' },
          snippet: {
            title: 'A song',
            channelTitle: 'An artist',
            publishedAt: '2026-01-01T00:00:00Z',
            thumbnails: { medium: { url: 'https://img.example/cover.jpg' } },
          },
        }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const videos = await new YouTubeCatalog('test-key').search('A song')

    expect(videos).toEqual([{
      id: 'video-123',
      title: 'A song',
      channelTitle: 'An artist',
      thumbnailUrl: 'https://img.example/cover.jpg',
      publishedAt: '2026-01-01T00:00:00Z',
    }])
    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string)
    expect(requestUrl.searchParams.get('videoEmbeddable')).toBe('true')
    expect(requestUrl.searchParams.get('q')).toBe('A song')
  })
})