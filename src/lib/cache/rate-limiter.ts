import { Ratelimit } from '@upstash/ratelimit';
import redis from './redis';

// Only create rate limiters if Redis is available
const createRateLimiter = (
  config: { requests: number; window: `${number} ${'s' | 'm' | 'h' | 'd'}` },
  prefix: string
) => {
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `ratelimit:${prefix}`,
  });
};

// API rate limiters
export const apiLimiter = createRateLimiter(
  { requests: 100, window: '1 m' },
  'api'
);

// Public endpoint rate limiters (more restrictive)
export const publicApiLimiter = createRateLimiter(
  { requests: 30, window: '1 m' },
  'public'
);

// Quiz submission rate limiter
export const quizLimiter = createRateLimiter(
  { requests: 10, window: '1 m' },
  'quiz'
);

// Webhook rate limiter (higher limit for incoming webhooks)
export const webhookLimiter = createRateLimiter(
  { requests: 1000, window: '1 m' },
  'webhook'
);

// Export rate limiter
export const exportLimiter = createRateLimiter(
  { requests: 5, window: '1 h' },
  'export'
);

// Pinterest API rate limiter (per spec: 100 requests/min for pins)
export const pinterestLimiter = createRateLimiter(
  { requests: 90, window: '1 m' }, // Leave 10% buffer
  'pinterest'
);

/**
 * Check rate limit and return result
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!limiter) {
    // No rate limiting if Redis unavailable
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Rate limit middleware helper for API routes
 */
export async function rateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<Response | null> {
  const result = await checkRateLimit(limiter, identifier);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.reset),
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return null; // No rate limit hit
}
