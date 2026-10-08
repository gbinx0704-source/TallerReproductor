import { DoublyLinkedList } from '../collections/DoublyLinkedList'

export type PlaylistRecord = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  trackIds: string[]
}

export type PlaylistDirection = 'up' | 'down'

export class Playlist {
  private readonly trackIds = new DoublyLinkedList<string>()
  readonly id: string
  readonly createdAt: number
  private changedAt: number
  private title: string

  constructor(record: PlaylistRecord) {
    this.id = record.id
    this.title = record.name
    this.createdAt = record.createdAt
    this.changedAt = record.updatedAt
    record.trackIds.forEach((trackId) => this.trackIds.append(trackId))
  }

  static create(name: string): Playlist {
    const timestamp = Date.now()
    return new Playlist({
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      trackIds: [],
    })
  }

  get name(): string {
    return this.title
  }

  get length(): number {
    return this.trackIds.length
  }

  get trackOrder(): string[] {
    return [...this.trackIds]
  }

  rename(name: string): void {
    const normalizedName = name.trim()
    if (!normalizedName) throw new Error('Playlist names cannot be empty.')
    this.title = normalizedName
    this.changedAt = Date.now()
  }

  hasTrack(trackId: string): boolean {
    return this.trackIds.find((id) => id === trackId) !== null
  }

  addTrack(trackId: string): boolean {
    if (this.hasTrack(trackId)) return false
    this.trackIds.append(trackId)
    this.changedAt = Date.now()
    return true
  }

  removeTrack(trackId: string): boolean {
    const node = this.trackIds.find((id) => id === trackId)
    if (!node) return false
    this.trackIds.remove(node)
    this.changedAt = Date.now()
    return true
  }

  moveTrack(trackId: string, direction: PlaylistDirection): boolean {
    const order = this.trackOrder
    const currentIndex = order.indexOf(trackId)
    if (currentIndex < 0) return false

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= order.length) return false

    const [movedTrack] = order.splice(currentIndex, 1)
    order.splice(nextIndex, 0, movedTrack)
    while (this.trackIds.length) {
      const firstNode = this.trackIds.find(() => true)
      if (firstNode) this.trackIds.remove(firstNode)
    }
    order.forEach((id) => this.trackIds.append(id))
    this.changedAt = Date.now()
    return true
  }

  toRecord(): PlaylistRecord {
    return {
      id: this.id,
      name: this.title,
      createdAt: this.createdAt,
      updatedAt: this.changedAt,
      trackIds: this.trackOrder,
    }
  }
}