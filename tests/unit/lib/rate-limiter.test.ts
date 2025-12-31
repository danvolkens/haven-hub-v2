import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Ratelimit before imports
const mockLimiterResult = {
  success: true,
  limit: 100,
  remaining: 99,
  reset: Date.now() + 60000,
};

const mockLimit = vi.fn().mockResolvedValue(mockLimiterResult);

// Create a mock class with static method
class MockRatelimit {
  static slidingWindow = vi.fn().mockReturnValue({});
  limit = mockLimit;
  constructor() {}
}

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
}));

// Mock Redis - must return a non-null value for rate limiters to be created
vi.mock('@/lib/cache/redis', () => ({
  default: { get: vi.fn(), set: vi.fn() },
  redis: { get: vi.fn(), set: vi.fn() },
}));

describe('Rate Limiter Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue(mockLimiterResult);
  });

  describe('checkRateLimit', () => {
    it('returns success when under limit', async () => {
      const { checkRateLimit, apiLimiter } = await import('@/lib/cache/rate-limiter');

      const result = await checkRateLimit(apiLimiter, 'user-123');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('returns failure when rate limited', async () => {
      mockLimit.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 30000,
      });

      const { checkRateLimit, apiLimiter } = await import('@/lib/cache/rate-limiter');

      const result = await checkRateLimit(apiLimiter, 'user-123');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('returns success when limiter is null', async () => {
      const { checkRateLimit } = await import('@/lib/cache/rate-limiter');

      const result = await checkRateLimit(null, 'user-123');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBe(0);
    });
  });

  describe('rateLimit', () => {
    it('returns null when under limit', async () => {
      const { rateLimit, apiLimiter } = await import('@/lib/cache/rate-limiter');

      const result = await rateLimit(apiLimiter, 'user-123');

      expect(result).toBeNull();
    });

    it('returns 429 response when rate limited', async () => {
      const reset = Date.now() + 30000;
      mockLimit.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset,
      });

      const { rateLimit, apiLimiter } = await import('@/lib/cache/rate-limiter');

      const result = await rateLimit(apiLimiter, 'user-123');

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);

      const body = await result?.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('returns correct rate limit headers', async () => {
      const reset = Date.now() + 30000;
      mockLimit.mockResolvedValue({
        success: false,
        limit: 100,
        remaining: 0,
        reset,
      });

      const { rateLimit, apiLimiter } = await import('@/lib/cache/rate-limiter');

      const result = await rateLimit(apiLimiter, 'user-123');

      expect(result?.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('X-RateLimit-Reset')).toBe(String(reset));
      expect(result?.headers.get('Retry-After')).toBeDefined();
    });

    it('returns null when limiter is null', async () => {
      const { rateLimit } = await import('@/lib/cache/rate-limiter');

      const result = await rateLimit(null, 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('Rate limiter configurations', () => {
    it('exports apiLimiter', async () => {
      const { apiLimiter } = await import('@/lib/cache/rate-limiter');
      expect(apiLimiter).toBeDefined();
    });

    it('exports publicApiLimiter', async () => {
      const { publicApiLimiter } = await import('@/lib/cache/rate-limiter');
      expect(publicApiLimiter).toBeDefined();
    });

    it('exports quizLimiter', async () => {
      const { quizLimiter } = await import('@/lib/cache/rate-limiter');
      expect(quizLimiter).toBeDefined();
    });

    it('exports webhookLimiter', async () => {
      const { webhookLimiter } = await import('@/lib/cache/rate-limiter');
      expect(webhookLimiter).toBeDefined();
    });

    it('exports exportLimiter', async () => {
      const { exportLimiter } = await import('@/lib/cache/rate-limiter');
      expect(exportLimiter).toBeDefined();
    });

    it('exports pinterestLimiter', async () => {
      const { pinterestLimiter } = await import('@/lib/cache/rate-limiter');
      expect(pinterestLimiter).toBeDefined();
    });
  });
});
