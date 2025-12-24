import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const DEFAULT_TTL = 60 * 5; // 5 minutes

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data as T | null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = DEFAULT_TTL, tags = [] } = options;

  try {
    await redis.set(key, value, { ex: ttl });

    // Store tags for invalidation
    if (tags.length > 0) {
      for (const tag of tags) {
        await redis.sadd(`cache:tag:${tag}`, key);
      }
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

export async function cacheInvalidateByTag(tag: string): Promise<void> {
  try {
    const keys = await redis.smembers(`cache:tag:${tag}`);

    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.del(`cache:tag:${tag}`);
    }
  } catch (error) {
    console.error('Cache invalidate error:', error);
  }
}

// Cache wrapper for async functions
export function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try cache first
      const cached = await cacheGet<T>(key);
      if (cached !== null) {
        return resolve(cached);
      }

      // Execute function
      const result = await fn();

      // Cache result
      await cacheSet(key, result, options);

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// User-specific cache key generator
export function userCacheKey(userId: string, ...parts: string[]): string {
  return `user:${userId}:${parts.join(':')}`;
}
