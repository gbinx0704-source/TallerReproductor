import type { StoredTrack, Track } from '../domain/Track'

const databaseName = 'sonora-library'
const storeName = 'tracks'

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('The library request failed.'))
  })
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('The library update was cancelled.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('The library update failed.'))
  })
}

export class TrackLibrary {
  private databasePromise: Promise<IDBDatabase> | null = null

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('This browser could not open the local library.'))
      request.onblocked = () => reject(new Error('Close other player tabs to update the local library.'))
    })

    return this.databasePromise
  }

  async getAll(): Promise<StoredTrack[]> {
    const database = await this.openDatabase()
    const transaction = database.transaction(storeName, 'readonly')
    return requestResult(transaction.objectStore(storeName).getAll())
  }

  async addMany(tracks: StoredTrack[]): Promise<void> {
    const database = await this.openDatabase()
    const transaction = database.transaction(storeName, 'readwrite')
    const completed = transactionResult(transaction)
    const store = transaction.objectStore(storeName)
    tracks.forEach((track) => store.add(track))
    await completed
  }

  async update(track: Track): Promise<void> {
    const database = await this.openDatabase()
    const transaction = database.transaction(storeName, 'readwrite')
    const completed = transactionResult(transaction)
    const store = transaction.objectStore(storeName)
    const existing = await requestResult<StoredTrack | undefined>(store.get(track.id))
    if (!existing) throw new Error('This track is no longer in your library.')
    store.put({ ...existing, ...track })
    await completed
  }

  async remove(id: string): Promise<void> {
    const database = await this.openDatabase()
    const transaction = database.transaction(storeName, 'readwrite')
    const completed = transactionResult(transaction)
    transaction.objectStore(storeName).delete(id)
    await completed
  }
}

export function trackFromFile(file: File): StoredTrack {
  const title = file.name.replace(/\.[^.]+$/, '') || file.name
  return {
    id: crypto.randomUUID(),
    title,
    artist: 'Local audio',
    fileName: file.name,
    mimeType: file.type,
    addedAt: Date.now(),
    audio: file,
  }
}