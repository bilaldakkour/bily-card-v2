type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class InMemoryTTLCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>()

  get(key: string): T | null {
    const found = this.store.get(key)
    if (!found) return null

    if (Date.now() > found.expiresAt) {
      this.store.delete(key)
      return null
    }

    return found.value
  }

  set(key: string, value: T, ttlMs: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  delete(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

const pending = new Map<string, Promise<unknown>>()

export async function dedupeRequest<T>(key: string, action: () => Promise<T>) {
  const existing = pending.get(key)
  if (existing) return existing as Promise<T>

  const promise = action().finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}

