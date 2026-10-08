function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export default async function youtubeSearch(request) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Only GET requests are supported.' }, 405)
  }

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (query.length < 2 || query.length > 120) {
    return jsonResponse({ error: 'Search terms must be between 2 and 120 characters.' }, 400)
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return jsonResponse({ error: 'Add YOUTUBE_API_KEY to this Netlify site to enable online search.' }, 503)
  }

  const youtubeUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  youtubeUrl.searchParams.set('part', 'snippet')
  youtubeUrl.searchParams.set('type', 'video')
  youtubeUrl.searchParams.set('videoEmbeddable', 'true')
  youtubeUrl.searchParams.set('safeSearch', 'moderate')
  youtubeUrl.searchParams.set('maxResults', '18')
  youtubeUrl.searchParams.set('q', query)
  youtubeUrl.searchParams.set('key', apiKey)

  let response
  let payload
  try {
    response = await fetch(youtubeUrl, { signal: request.signal })
    payload = await response.json()
  } catch {
    return jsonResponse({ error: 'YouTube search is temporarily unavailable.' }, 502)
  }

  if (!response.ok) {
    const error = response.status === 403
      ? 'YouTube rejected the request. Check API activation, key restrictions, and quota.'
      : 'YouTube search is temporarily unavailable.'
    return jsonResponse({ error }, 502)
  }

  const items = (payload.items ?? []).flatMap((item) => {
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

  return jsonResponse({ items })
}