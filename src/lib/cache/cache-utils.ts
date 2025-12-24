import redis from './redis';

// TTL constants in seconds
export const TTL = {
  VERY_SHORT: 30,      // 30 seconds
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  VERY_LONG: 86400,    // 24 hours

  // Feature-specific TTLs
  USER_SETTINGS: 60,   // 1 minute (frequently accessed, may change)
  DESIGN_RULES: 3600,  // 1 hour (rarely changes)
  BOARDS: 300,         // 5 minutes (synced periodically)
  INTEGRATION_STATUS: 60, // 1 minute
  APPROVAL_COUNTS: 30, // 30 seconds (real-time-ish)
} as const;

// Cache key prefixes for organization
export const CACHE_PREFIX = {
  USER_SETTINGS: 'user_settings',
  DESIGN_RULES: 'design_rules',
  BOARDS: 'boards',
  APPROVAL_COUNTS: 'approval_counts',
  PIN_SCHEDULE: 'pin_schedule',
  RATE_LIMIT: 'rate_limit',
  INTEGRATION: 'integration',
  DAILY_METRICS: 'daily_metrics',
} as const;

/**
 * Build a cache key from prefix and parts
 */
export function cacheKey(prefix: string, ...parts: (string | number)[]): string {
  return [prefix, ...parts].join(':');
}

/**
 * Get a value from cache, or fetch and cache it if not present
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = TTL.MEDIUM
): Promise<T> {
  if (!redis) {
    // Redis not available, just fetch
    return fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const value = await fetcher();

    // Cache it (don't await to avoid blocking)
    redis.setex(key, ttlSeconds, value).catch((err) => {
      console.error(`Failed to cache key ${key}:`, err);
    });

    return value;
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    // Fall back to fetcher on cache error
    return fetcher();
  }
}

/**
 * Get a value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in cache
 */
export async function set<T>(
  key: string,
  value: T,
  ttlSeconds: number = TTL.MEDIUM
): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(key, ttlSeconds, value);
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
  }
}

/**
 * Delete a key from cache
 */
export async function invalidate(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache invalidate error for key ${key}:`, error);
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  if (!redis) return 0;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Invalidate all cache keys for a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await invalidatePattern(`*:${userId}:*`);
  await invalidatePattern(`*:${userId}`);
}

/**
 * Increment a counter (useful for rate limiting, usage tracking)
 */
export async function increment(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  if (!redis) return 0;

  try {
    const newValue = await redis.incr(key);
    if (ttlSeconds && newValue === 1) {
      // Set expiry only on first increment
      await redis.expire(key, ttlSeconds);
    }
    return newValue;
  } catch (error) {
    console.error(`Cache increment error for key ${key}:`, error);
    return 0;
  }
}

/**
 * Get current counter value
 */
export async function getCounter(key: string): Promise<number> {
  if (!redis) return 0;

  try {
    const value = await redis.get<number>(key);
    return value ?? 0;
  } catch (error) {
    console.error(`Cache getCounter error for key ${key}:`, error);
    return 0;
  }
}
