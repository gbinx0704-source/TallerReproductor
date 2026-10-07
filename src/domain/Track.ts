export type Track = {
  id: string
  title: string
  artist: string
  fileName: string
  mimeType: string
  addedAt: number
}

export type StoredTrack = Track & {
  audio: Blob
}