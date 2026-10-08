import { describe, expect, it } from 'vitest'
import { Playlist } from './Playlist'

function createPlaylist(): Playlist {
  return new Playlist({
    id: 'playlist-1',
    name: 'Late night drive',
    createdAt: 1,
    updatedAt: 1,
    trackIds: ['track-a', 'track-b', 'track-c'],
  })
}

describe('Playlist', () => {
  it('adds unique tracks and keeps membership in a doubly linked order', () => {
    const playlist = createPlaylist()

    expect(playlist.addTrack('track-b')).toBe(false)
    expect(playlist.addTrack('track-d')).toBe(true)
    expect(playlist.trackOrder).toEqual(['track-a', 'track-b', 'track-c', 'track-d'])
    expect(playlist.length).toBe(4)
  })

  it('moves tracks in either direction and prevents crossing playlist bounds', () => {
    const playlist = createPlaylist()

    expect(playlist.moveTrack('track-b', 'up')).toBe(true)
    expect(playlist.trackOrder).toEqual(['track-b', 'track-a', 'track-c'])
    expect(playlist.moveTrack('track-b', 'up')).toBe(false)
    expect(playlist.moveTrack('track-b', 'down')).toBe(true)
    expect(playlist.trackOrder).toEqual(['track-a', 'track-b', 'track-c'])
    expect(playlist.moveTrack('missing', 'down')).toBe(false)
  })

  it('removes a track and restores the same order from its stored record', () => {
    const playlist = createPlaylist()
    playlist.removeTrack('track-b')
    playlist.rename('  Night ride  ')

    const restored = new Playlist(playlist.toRecord())
    expect(restored.name).toBe('Night ride')
    expect(restored.trackOrder).toEqual(['track-a', 'track-c'])
    expect(restored.removeTrack('track-b')).toBe(false)
  })

  it('rejects an empty name', () => {
    expect(() => createPlaylist().rename('  ')).toThrow('Playlist names cannot be empty.')
  })
})