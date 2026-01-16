import { MemoryCache } from '../../dna-data/cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', { data: 'test' });
      expect(cache.get('key1')).toEqual({ data: 'test' });
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check key existence', () => {
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('should return correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.keys()).toContain('key1');
      expect(cache.keys()).toContain('key2');
    });
  });

  describe('fetchWithDedup', () => {
    it('should fetch and cache value', async () => {
      const fetcher = jest.fn().mockResolvedValue('fetched-value');
      
      const result = await cache.fetchWithDedup('key1', fetcher);
      
      expect(result).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cache.get('key1')).toBe('fetched-value');
    });

    it('should return cached value without fetching', async () => {
      cache.set('key1', 'cached-value');
      const fetcher = jest.fn().mockResolvedValue('fetched-value');
      
      const result = await cache.fetchWithDedup('key1', fetcher);
      
      expect(result).toBe('cached-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should deduplicate concurrent fetches', async () => {
      let resolvePromise: (value: string) => void;
      const slowFetcher = jest.fn().mockImplementation(() => {
        return new Promise<string>((resolve) => {
          resolvePromise = resolve;
        });
      });

      const promise1 = cache.fetchWithDedup('key1', slowFetcher);
      const promise2 = cache.fetchWithDedup('key1', slowFetcher);

      // Both should be waiting on the same fetch
      expect(slowFetcher).toHaveBeenCalledTimes(1);

      // Resolve the fetch
      resolvePromise!('result');

      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(slowFetcher).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error('fetch failed'));
      
      await expect(cache.fetchWithDedup('key1', fetcher)).rejects.toThrow('fetch failed');
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('fetchBatch', () => {
    it('should fetch multiple keys in parallel', async () => {
      const fetcher = jest.fn().mockImplementation((key: string) => 
        Promise.resolve(`value-${key}`)
      );

      const results = await cache.fetchBatch(['a', 'b', 'c'], fetcher);

      expect(results.size).toBe(3);
      expect(results.get('a')).toBe('value-a');
      expect(results.get('b')).toBe('value-b');
      expect(results.get('c')).toBe('value-c');
    });

    it('should use cached values when available', async () => {
      cache.set('a', 'cached-a');
      const fetcher = jest.fn().mockImplementation((key: string) => 
        Promise.resolve(`value-${key}`)
      );

      const results = await cache.fetchBatch(['a', 'b'], fetcher);

      expect(results.get('a')).toBe('cached-a');
      expect(results.get('b')).toBe('value-b');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledWith('b');
    });
  });
});
