import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis before imports
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  sadd: vi.fn(),
  smembers: vi.fn(),
};

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedis),
}));

// Mock environment variables
vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test-redis.upstash.io');
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');

describe('Cache Layer Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cache-utils', () => {
    describe('cacheKey', () => {
      it('builds cache key from prefix and parts', async () => {
        const { cacheKey } = await import('@/lib/cache/cache-utils');

        expect(cacheKey('user', '123')).toBe('user:123');
        expect(cacheKey('board', 'user-1', 'board-2')).toBe('board:user-1:board-2');
        expect(cacheKey('prefix')).toBe('prefix');
      });

      it('handles numeric parts', async () => {
        const { cacheKey } = await import('@/lib/cache/cache-utils');

        expect(cacheKey('count', 42)).toBe('count:42');
        expect(cacheKey('page', 1, 20)).toBe('page:1:20');
      });
    });

    describe('TTL constants', () => {
      it('has correct TTL values', async () => {
        const { TTL } = await import('@/lib/cache/cache-utils');

        expect(TTL.VERY_SHORT).toBe(30);
        expect(TTL.SHORT).toBe(60);
        expect(TTL.MEDIUM).toBe(300);
        expect(TTL.LONG).toBe(3600);
        expect(TTL.VERY_LONG).toBe(86400);
        expect(TTL.USER_SETTINGS).toBe(60);
        expect(TTL.DESIGN_RULES).toBe(3600);
        expect(TTL.BOARDS).toBe(300);
        expect(TTL.INTEGRATION_STATUS).toBe(60);
        expect(TTL.APPROVAL_COUNTS).toBe(30);
      });
    });

    describe('CACHE_PREFIX constants', () => {
      it('has correct prefix values', async () => {
        const { CACHE_PREFIX } = await import('@/lib/cache/cache-utils');

        expect(CACHE_PREFIX.USER_SETTINGS).toBe('user_settings');
        expect(CACHE_PREFIX.DESIGN_RULES).toBe('design_rules');
        expect(CACHE_PREFIX.BOARDS).toBe('boards');
        expect(CACHE_PREFIX.APPROVAL_COUNTS).toBe('approval_counts');
        expect(CACHE_PREFIX.PIN_SCHEDULE).toBe('pin_schedule');
        expect(CACHE_PREFIX.RATE_LIMIT).toBe('rate_limit');
        expect(CACHE_PREFIX.INTEGRATION).toBe('integration');
        expect(CACHE_PREFIX.DAILY_METRICS).toBe('daily_metrics');
      });
    });

    describe('getOrSet', () => {
      it('returns cached value when available', async () => {
        mockRedis.get.mockResolvedValue({ name: 'cached' });

        const { getOrSet } = await import('@/lib/cache/cache-utils');
        const fetcher = vi.fn().mockResolvedValue({ name: 'fresh' });

        const result = await getOrSet('test-key', fetcher);

        expect(result).toEqual({ name: 'cached' });
        expect(fetcher).not.toHaveBeenCalled();
        expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      });

      it('fetches and caches when cache miss', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const { getOrSet, TTL } = await import('@/lib/cache/cache-utils');
        const fetcher = vi.fn().mockResolvedValue({ name: 'fresh' });

        const result = await getOrSet('test-key', fetcher);

        expect(result).toEqual({ name: 'fresh' });
        expect(fetcher).toHaveBeenCalled();
        // setex is called without await, but we can still check it was called
      });

      it('uses custom TTL when provided', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.setex.mockResolvedValue('OK');

        const { getOrSet } = await import('@/lib/cache/cache-utils');
        const fetcher = vi.fn().mockResolvedValue('data');

        await getOrSet('test-key', fetcher, 120);

        // Verify custom TTL is used (setex is called async)
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 120, 'data');
      });

      it('falls back to fetcher on cache error', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis error'));

        const { getOrSet } = await import('@/lib/cache/cache-utils');
        const fetcher = vi.fn().mockResolvedValue({ name: 'fallback' });

        const result = await getOrSet('test-key', fetcher);

        expect(result).toEqual({ name: 'fallback' });
        expect(fetcher).toHaveBeenCalled();
      });
    });

    describe('get', () => {
      it('returns cached value', async () => {
        mockRedis.get.mockResolvedValue({ data: 'test' });

        const { get } = await import('@/lib/cache/cache-utils');

        const result = await get('test-key');

        expect(result).toEqual({ data: 'test' });
        expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      });

      it('returns null on cache miss', async () => {
        mockRedis.get.mockResolvedValue(null);

        const { get } = await import('@/lib/cache/cache-utils');

        const result = await get('missing-key');

        expect(result).toBeNull();
      });

      it('returns null on error', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis error'));

        const { get } = await import('@/lib/cache/cache-utils');

        const result = await get('error-key');

        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('sets value with default TTL', async () => {
        mockRedis.setex.mockResolvedValue('OK');

        const { set, TTL } = await import('@/lib/cache/cache-utils');

        await set('test-key', { data: 'test' });

        expect(mockRedis.setex).toHaveBeenCalledWith('test-key', TTL.MEDIUM, { data: 'test' });
      });

      it('sets value with custom TTL', async () => {
        mockRedis.setex.mockResolvedValue('OK');

        const { set } = await import('@/lib/cache/cache-utils');

        await set('test-key', 'value', 60);

        expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 60, 'value');
      });

      it('handles set errors gracefully', async () => {
        mockRedis.setex.mockRejectedValue(new Error('Redis error'));

        const { set } = await import('@/lib/cache/cache-utils');

        // Should not throw
        await expect(set('test-key', 'value')).resolves.toBeUndefined();
      });
    });

    describe('invalidate', () => {
      it('deletes cache key', async () => {
        mockRedis.del.mockResolvedValue(1);

        const { invalidate } = await import('@/lib/cache/cache-utils');

        await invalidate('test-key');

        expect(mockRedis.del).toHaveBeenCalledWith('test-key');
      });

      it('handles delete errors gracefully', async () => {
        mockRedis.del.mockRejectedValue(new Error('Redis error'));

        const { invalidate } = await import('@/lib/cache/cache-utils');

        // Should not throw
        await expect(invalidate('test-key')).resolves.toBeUndefined();
      });
    });

    describe('invalidatePattern', () => {
      it('deletes all matching keys', async () => {
        mockRedis.keys.mockResolvedValue(['user:123:a', 'user:123:b', 'user:123:c']);
        mockRedis.del.mockResolvedValue(3);

        const { invalidatePattern } = await import('@/lib/cache/cache-utils');

        const count = await invalidatePattern('user:123:*');

        expect(count).toBe(3);
        expect(mockRedis.keys).toHaveBeenCalledWith('user:123:*');
        expect(mockRedis.del).toHaveBeenCalledWith('user:123:a', 'user:123:b', 'user:123:c');
      });

      it('returns 0 when no keys match', async () => {
        mockRedis.keys.mockResolvedValue([]);

        const { invalidatePattern } = await import('@/lib/cache/cache-utils');

        const count = await invalidatePattern('nonexistent:*');

        expect(count).toBe(0);
        expect(mockRedis.del).not.toHaveBeenCalled();
      });

      it('returns 0 on error', async () => {
        mockRedis.keys.mockRejectedValue(new Error('Redis error'));

        const { invalidatePattern } = await import('@/lib/cache/cache-utils');

        const count = await invalidatePattern('error:*');

        expect(count).toBe(0);
      });
    });

    describe('invalidateUserCache', () => {
      it('invalidates all user cache patterns', async () => {
        mockRedis.keys.mockResolvedValue([]);

        const { invalidateUserCache } = await import('@/lib/cache/cache-utils');

        await invalidateUserCache('user-123');

        expect(mockRedis.keys).toHaveBeenCalledWith('*:user-123:*');
        expect(mockRedis.keys).toHaveBeenCalledWith('*:user-123');
      });
    });

    describe('increment', () => {
      it('increments counter and sets expiry on first call', async () => {
        mockRedis.incr.mockResolvedValue(1);
        mockRedis.expire.mockResolvedValue(1);

        const { increment } = await import('@/lib/cache/cache-utils');

        const result = await increment('counter-key', 60);

        expect(result).toBe(1);
        expect(mockRedis.incr).toHaveBeenCalledWith('counter-key');
        expect(mockRedis.expire).toHaveBeenCalledWith('counter-key', 60);
      });

      it('increments counter without setting expiry on subsequent calls', async () => {
        mockRedis.incr.mockResolvedValue(5);

        const { increment } = await import('@/lib/cache/cache-utils');

        const result = await increment('counter-key', 60);

        expect(result).toBe(5);
        expect(mockRedis.incr).toHaveBeenCalledWith('counter-key');
        expect(mockRedis.expire).not.toHaveBeenCalled();
      });

      it('returns 0 on error', async () => {
        mockRedis.incr.mockRejectedValue(new Error('Redis error'));

        const { increment } = await import('@/lib/cache/cache-utils');

        const result = await increment('error-key');

        expect(result).toBe(0);
      });
    });

    describe('getCounter', () => {
      it('returns counter value', async () => {
        mockRedis.get.mockResolvedValue(42);

        const { getCounter } = await import('@/lib/cache/cache-utils');

        const result = await getCounter('counter-key');

        expect(result).toBe(42);
      });

      it('returns 0 when counter does not exist', async () => {
        mockRedis.get.mockResolvedValue(null);

        const { getCounter } = await import('@/lib/cache/cache-utils');

        const result = await getCounter('missing-counter');

        expect(result).toBe(0);
      });

      it('returns 0 on error', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis error'));

        const { getCounter } = await import('@/lib/cache/cache-utils');

        const result = await getCounter('error-counter');

        expect(result).toBe(0);
      });
    });
  });
});
