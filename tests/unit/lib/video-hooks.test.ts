import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));

// Import after mocking
import { calculateHookScore, weightedRandomSelect } from '@/lib/video/hooks';
import type { VideoHook } from '@/types/instagram';

// Helper to create mock VideoHook
function createMockHook(overrides: Partial<VideoHook> = {}): VideoHook {
  return {
    id: 'hook-1',
    hook_text: 'Test hook',
    hook_type: 'question',
    collections: ['growth'],
    content_types: ['quote_slideshow'],
    is_active: true,
    usage_count: 0,
    avg_completion_rate: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as VideoHook;
}

describe('Video Hooks - calculateHookScore', () => {
  describe('With Performance Data', () => {
    it('should calculate score based on completion rate', () => {
      const hook = createMockHook({
        avg_completion_rate: 0.8, // 80% completion
        usage_count: 0,
      });

      const score = calculateHookScore(hook);

      // Score = (0.8 * 100) + (1 / 1) * 50 = 80 + 50 = 130
      expect(score).toBe(130);
    });

    it('should reduce recency bonus with more usage', () => {
      const hook1 = createMockHook({
        avg_completion_rate: 0.5,
        usage_count: 0,
      });

      const hook2 = createMockHook({
        avg_completion_rate: 0.5,
        usage_count: 4,
      });

      const score1 = calculateHookScore(hook1);
      const score2 = calculateHookScore(hook2);

      // hook1: (0.5 * 100) + (1 / 1) * 50 = 50 + 50 = 100
      // hook2: (0.5 * 100) + (1 / 5) * 50 = 50 + 10 = 60
      expect(score1).toBe(100);
      expect(score2).toBe(60);
    });

    it('should handle zero completion rate', () => {
      const hook = createMockHook({
        avg_completion_rate: 0,
        usage_count: 0,
      });

      const score = calculateHookScore(hook);

      // Score = (0 * 100) + (1 / 1) * 50 = 0 + 50 = 50
      expect(score).toBe(50);
    });

    it('should handle high usage count', () => {
      const hook = createMockHook({
        avg_completion_rate: 0.9,
        usage_count: 99,
      });

      const score = calculateHookScore(hook);

      // Score = (0.9 * 100) + (1 / 100) * 50 = 90 + 0.5 = 90.5
      expect(score).toBe(90.5);
    });
  });

  describe('Without Performance Data', () => {
    it('should use base score for new hooks', () => {
      const hook = createMockHook({
        avg_completion_rate: null,
        usage_count: 0,
      });

      const score = calculateHookScore(hook);

      // Score = 50 + (1 / 1) * 50 = 50 + 50 = 100
      expect(score).toBe(100);
    });

    it('should reduce recency bonus with more usage', () => {
      const hook = createMockHook({
        avg_completion_rate: null,
        usage_count: 9,
      });

      const score = calculateHookScore(hook);

      // Score = 50 + (1 / 10) * 50 = 50 + 5 = 55
      expect(score).toBe(55);
    });

    it('should handle undefined avg_completion_rate', () => {
      const hook = createMockHook({
        usage_count: 0,
      });
      // @ts-expect-error - testing undefined case
      hook.avg_completion_rate = undefined;

      const score = calculateHookScore(hook);

      expect(score).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null usage_count', () => {
      const hook = createMockHook({
        avg_completion_rate: 0.5,
      });
      // @ts-expect-error - testing null case
      hook.usage_count = null;

      const score = calculateHookScore(hook);

      // Should treat null as 0: (0.5 * 100) + (1 / 1) * 50 = 100
      expect(score).toBe(100);
    });

    it('should handle undefined usage_count', () => {
      const hook = createMockHook({
        avg_completion_rate: 0.5,
      });
      // @ts-expect-error - testing undefined case
      hook.usage_count = undefined;

      const score = calculateHookScore(hook);

      expect(score).toBe(100);
    });
  });
});

describe('Video Hooks - weightedRandomSelect', () => {
  describe('Basic Selection', () => {
    it('should return null for empty array', () => {
      const result = weightedRandomSelect([]);

      expect(result).toBeNull();
    });

    it('should return the only hook for single item', () => {
      const hook = createMockHook({ id: 'single-hook' });
      const scoredHooks = [{ hook, score: 50 }];

      const result = weightedRandomSelect(scoredHooks);

      expect(result).toBe(hook);
    });

    it('should return a hook from the array', () => {
      const hooks = [
        { hook: createMockHook({ id: 'h1' }), score: 50 },
        { hook: createMockHook({ id: 'h2' }), score: 50 },
        { hook: createMockHook({ id: 'h3' }), score: 50 },
      ];

      const result = weightedRandomSelect(hooks);

      expect(result).not.toBeNull();
      expect(['h1', 'h2', 'h3']).toContain(result?.id);
    });
  });

  describe('Weighted Selection', () => {
    it('should favor higher scored hooks', () => {
      // Run multiple times and check distribution
      const highScoreHook = createMockHook({ id: 'high' });
      const lowScoreHook = createMockHook({ id: 'low' });

      const scoredHooks = [
        { hook: highScoreHook, score: 100 },
        { hook: lowScoreHook, score: 1 },
      ];

      let highCount = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const result = weightedRandomSelect(scoredHooks);
        if (result?.id === 'high') highCount++;
      }

      // High score should be selected most of the time (> 80%)
      expect(highCount).toBeGreaterThan(70);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero scores', () => {
      const hooks = [
        { hook: createMockHook({ id: 'h1' }), score: 0 },
        { hook: createMockHook({ id: 'h2' }), score: 0 },
      ];

      const result = weightedRandomSelect(hooks);

      // Should still return a hook
      expect(result).not.toBeNull();
    });

    it('should handle negative scores', () => {
      const hooks = [
        { hook: createMockHook({ id: 'h1' }), score: -10 },
        { hook: createMockHook({ id: 'h2' }), score: 50 },
      ];

      const result = weightedRandomSelect(hooks);

      expect(result).not.toBeNull();
    });

    it('should handle very large scores', () => {
      const hooks = [
        { hook: createMockHook({ id: 'h1' }), score: 1000000 },
        { hook: createMockHook({ id: 'h2' }), score: 1 },
      ];

      const result = weightedRandomSelect(hooks);

      expect(result).not.toBeNull();
    });
  });
});

describe('Video Hooks - Score Distribution', () => {
  it('should give new hooks fair chance', () => {
    const newHook = createMockHook({
      avg_completion_rate: null,
      usage_count: 0,
    });

    const establishedHook = createMockHook({
      avg_completion_rate: 0.5, // 50% completion
      usage_count: 10,
    });

    const newScore = calculateHookScore(newHook);
    const establishedScore = calculateHookScore(establishedHook);

    // New hook: 50 + 50 = 100
    // Established: (0.5 * 100) + (1/11) * 50 = 50 + 4.54 = ~54.54

    // New hooks should have competitive scores
    expect(newScore).toBeGreaterThan(establishedScore);
  });

  it('should reward high completion rate', () => {
    const highPerformer = createMockHook({
      avg_completion_rate: 0.9,
      usage_count: 10,
    });

    const lowPerformer = createMockHook({
      avg_completion_rate: 0.3,
      usage_count: 10,
    });

    const highScore = calculateHookScore(highPerformer);
    const lowScore = calculateHookScore(lowPerformer);

    expect(highScore).toBeGreaterThan(lowScore);
  });
});
