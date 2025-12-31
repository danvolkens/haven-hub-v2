import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  sadd: vi.fn(),
  smembers: vi.fn(),
};

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => mockRedis),
  },
}));

describe('Redis Cache Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cacheGet', () => {
    it('returns cached value', async () => {
      mockRedis.get.mockResolvedValue({ id: 1, name: 'test' });

      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet<{ id: number; name: string }>('test-key');

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('returns null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet('missing-key');

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet('error-key');

      expect(result).toBeNull();
    });
  });

  describe('cacheSet', () => {
    it('sets value with default TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      await cacheSet('test-key', { data: 'value' });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'value' },
        { ex: 300 } // Default 5 minutes
      );
    });

    it('sets value with custom TTL', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      await cacheSet('test-key', 'value', { ttl: 60 });

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'value', { ex: 60 });
    });

    it('stores tags for invalidation', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      await cacheSet('test-key', 'value', { tags: ['tag1', 'tag2'] });

      expect(mockRedis.sadd).toHaveBeenCalledWith('cache:tag:tag1', 'test-key');
      expect(mockRedis.sadd).toHaveBeenCalledWith('cache:tag:tag2', 'test-key');
    });

    it('handles set errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'));

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      // Should not throw
      await expect(cacheSet('test-key', 'value')).resolves.toBeUndefined();
    });
  });

  describe('cacheDelete', () => {
    it('deletes cache key', async () => {
      mockRedis.del.mockResolvedValue(1);

      const { cacheDelete } = await import('@/lib/cache/redis-cache');

      await cacheDelete('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('handles delete errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const { cacheDelete } = await import('@/lib/cache/redis-cache');

      // Should not throw
      await expect(cacheDelete('test-key')).resolves.toBeUndefined();
    });
  });

  describe('cacheInvalidateByTag', () => {
    it('deletes all keys with tag', async () => {
      mockRedis.smembers.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedis.del.mockResolvedValue(4);

      const { cacheInvalidateByTag } = await import('@/lib/cache/redis-cache');

      await cacheInvalidateByTag('user:123');

      expect(mockRedis.smembers).toHaveBeenCalledWith('cache:tag:user:123');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:tag:user:123');
    });

    it('does nothing when no keys have tag', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const { cacheInvalidateByTag } = await import('@/lib/cache/redis-cache');

      await cacheInvalidateByTag('empty-tag');

      expect(mockRedis.smembers).toHaveBeenCalledWith('cache:tag:empty-tag');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockRedis.smembers.mockRejectedValue(new Error('Redis error'));

      const { cacheInvalidateByTag } = await import('@/lib/cache/redis-cache');

      // Should not throw
      await expect(cacheInvalidateByTag('error-tag')).resolves.toBeUndefined();
    });
  });

  describe('withCache', () => {
    it('returns cached value when available', async () => {
      mockRedis.get.mockResolvedValue({ cached: true });

      const { withCache } = await import('@/lib/cache/redis-cache');
      const fn = vi.fn().mockResolvedValue({ cached: false });

      const result = await withCache('test-key', fn);

      expect(result).toEqual({ cached: true });
      expect(fn).not.toHaveBeenCalled();
    });

    it('executes function and caches on miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const { withCache } = await import('@/lib/cache/redis-cache');
      const fn = vi.fn().mockResolvedValue({ fresh: true });

      const result = await withCache('test-key', fn);

      expect(result).toEqual({ fresh: true });
      expect(fn).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-key',
        { fresh: true },
        { ex: 300 }
      );
    });

    it('uses custom options', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);

      const { withCache } = await import('@/lib/cache/redis-cache');
      const fn = vi.fn().mockResolvedValue('data');

      await withCache('test-key', fn, { ttl: 120, tags: ['tag1'] });

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'data', { ex: 120 });
      expect(mockRedis.sadd).toHaveBeenCalledWith('cache:tag:tag1', 'test-key');
    });

    it('rejects when function throws', async () => {
      mockRedis.get.mockResolvedValue(null);

      const { withCache } = await import('@/lib/cache/redis-cache');
      const fn = vi.fn().mockRejectedValue(new Error('Function error'));

      await expect(withCache('test-key', fn)).rejects.toThrow('Function error');
    });
  });

  describe('userCacheKey', () => {
    it('generates user-specific cache key', async () => {
      const { userCacheKey } = await import('@/lib/cache/redis-cache');

      expect(userCacheKey('user-123')).toBe('user:user-123:');
      expect(userCacheKey('user-123', 'settings')).toBe('user:user-123:settings');
      expect(userCacheKey('user-123', 'boards', 'list')).toBe('user:user-123:boards:list');
    });
  });
});
