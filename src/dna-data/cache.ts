/**
 * Simple in-memory cache utility for preventing duplicate fetches
 * Used by IndexLoader and ModelLoader
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingFetches: Map<string, Promise<unknown>> = new Map();

  /**
   * Get a cached value by key
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      return entry.data as T;
    }
    return undefined;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.pendingFetches.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Fetch with deduplication - prevents multiple simultaneous fetches for the same key
   * If a fetch is already in progress for a key, returns the existing promise
   */
  async fetchWithDedup<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Return cached data if available
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Check if there's already a pending fetch for this key
    const pending = this.pendingFetches.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Start new fetch and track it
    const fetchPromise = fetcher()
      .then((data) => {
        this.set(key, data);
        this.pendingFetches.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingFetches.delete(key);
        throw error;
      });

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Batch fetch multiple keys, deduplicating and caching
   */
  async fetchBatch<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises: Promise<void>[] = [];

    for (const key of keys) {
      const promise = this.fetchWithDedup(key, () => fetcher(key))
        .then((data) => {
          results.set(key, data);
        })
        .catch((error) => {
          console.error(`Failed to fetch ${key}:`, error);
        });
      promises.push(promise);
    }

    await Promise.all(promises);
    return results;
  }
}

// Singleton instances for different cache domains
export const indexCache = new MemoryCache();
export const modelCache = new MemoryCache();

// Export the class for testing purposes
export { MemoryCache };
