import { Redis } from '@upstash/redis';

// Ensure environment variables are set
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('Upstash Redis credentials not configured. Caching will be disabled.');
}

// Create Redis client (will throw if credentials missing in production)
export const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export default redis;

// Check if Redis is available
export function isRedisAvailable(): boolean {
  return redis !== null;
}
