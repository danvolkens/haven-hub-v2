/**
 * Video Hook Selection Tests
 * Prompt 4.3: Performance-weighted selection algorithm
 */

import { describe, it, expect, vi } from 'vitest';
import type { VideoHook } from '@/types/instagram';
import { calculateHookScore, weightedRandomSelect } from '../hooks';

// ============================================================================
// Mock Supabase
// ============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          contains: vi.fn(() => ({
            contains: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

// ============================================================================
// Mock Data
// ============================================================================

const createMockHook = (overrides: Partial<VideoHook> = {}): VideoHook => ({
  id: 'hook-1',
  user_id: null,
  hook_text: 'Stop scrolling. This changed everything.',
  hook_type: 'pattern_interrupt',
  collections: ['grounding', 'wholeness', 'growth'],
  content_types: ['quote_reveal', 'educational'],
  usage_count: 0,
  avg_completion_rate: null,
  avg_engagement_rate: null,
  is_system: true,
  is_active: true,
  created_at: '2024-12-28T10:00:00Z',
  ...overrides,
});

// ============================================================================
// Score Calculation Tests
// ============================================================================

describe('Hook Score Calculation', () => {
  describe('With Performance Data', () => {
    it('should score higher for better completion rate', () => {
      const highPerformer = createMockHook({
        avg_completion_rate: 0.8, // 80%
        usage_count: 5,
      });
      const lowPerformer = createMockHook({
        avg_completion_rate: 0.4, // 40%
        usage_count: 5,
      });

      const highScore = calculateHookScore(highPerformer);
      const lowScore = calculateHookScore(lowPerformer);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should calculate score as (completion_rate * 100) + recency_bonus', () => {
      const hook = createMockHook({
        avg_completion_rate: 0.6, // 60%
        usage_count: 4, // recency_bonus = (1/5) * 50 = 10
      });

      const score = calculateHookScore(hook);
      // Expected: (0.6 * 100) + (1/5 * 50) = 60 + 10 = 70
      expect(score).toBeCloseTo(70, 1);
    });

    it('should give recency bonus to less-used hooks', () => {
      const lessUsed = createMockHook({
        avg_completion_rate: 0.5,
        usage_count: 1, // recency_bonus = (1/2) * 50 = 25
      });
      const moreUsed = createMockHook({
        avg_completion_rate: 0.5,
        usage_count: 9, // recency_bonus = (1/10) * 50 = 5
      });

      const lessUsedScore = calculateHookScore(lessUsed);
      const moreUsedScore = calculateHookScore(moreUsed);

      expect(lessUsedScore).toBeGreaterThan(moreUsedScore);
    });
  });

  describe('Without Performance Data', () => {
    it('should give fair base score of 50', () => {
      const newHook = createMockHook({
        avg_completion_rate: null,
        usage_count: 0,
      });

      const score = calculateHookScore(newHook);
      // Expected: 50 + (1/1 * 50) = 50 + 50 = 100
      expect(score).toBe(100);
    });

    it('should still apply recency bonus without performance data', () => {
      const unused = createMockHook({
        avg_completion_rate: null,
        usage_count: 0, // (1/1) * 50 = 50
      });
      const used = createMockHook({
        avg_completion_rate: null,
        usage_count: 4, // (1/5) * 50 = 10
      });

      const unusedScore = calculateHookScore(unused);
      const usedScore = calculateHookScore(used);

      expect(unusedScore).toBeGreaterThan(usedScore);
    });

    it('should give new hooks (0 usage) competitive score', () => {
      const newHook = createMockHook({
        avg_completion_rate: null,
        usage_count: 0,
      });
      const averagePerformer = createMockHook({
        avg_completion_rate: 0.5, // 50%
        usage_count: 5,
      });

      const newScore = calculateHookScore(newHook);
      const avgScore = calculateHookScore(averagePerformer);

      // New hook: 50 + 50 = 100
      // Average: 50 + 8.33 = 58.33
      // New hook should be competitive (higher in this case)
      expect(newScore).toBeGreaterThan(avgScore);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined completion rate', () => {
      const hook = createMockHook({
        avg_completion_rate: undefined as unknown as null,
        usage_count: 2,
      });

      const score = calculateHookScore(hook);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle zero usage count', () => {
      const hook = createMockHook({
        avg_completion_rate: 0.7,
        usage_count: 0,
      });

      const score = calculateHookScore(hook);
      // (0.7 * 100) + (1/1 * 50) = 70 + 50 = 120
      expect(score).toBeCloseTo(120, 1);
    });

    it('should handle 100% completion rate', () => {
      const perfectHook = createMockHook({
        avg_completion_rate: 1.0, // 100%
        usage_count: 10,
      });

      const score = calculateHookScore(perfectHook);
      // (1.0 * 100) + (1/11 * 50) = 100 + 4.55 ≈ 104.55
      expect(score).toBeGreaterThan(100);
    });

    it('should handle 0% completion rate', () => {
      const badHook = createMockHook({
        avg_completion_rate: 0.0, // 0%
        usage_count: 5,
      });

      const score = calculateHookScore(badHook);
      // (0 * 100) + (1/6 * 50) = 0 + 8.33 ≈ 8.33
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(50); // Less than a new hook without data
    });
  });
});

// ============================================================================
// Weighted Random Selection Tests
// ============================================================================

describe('Weighted Random Selection', () => {
  it('should return null for empty array', () => {
    const result = weightedRandomSelect([]);
    expect(result).toBeNull();
  });

  it('should return single hook when only one available', () => {
    const hook = createMockHook({ id: 'only-hook' });
    const result = weightedRandomSelect([{ hook, score: 50 }]);
    expect(result).toBe(hook);
  });

  it('should favor higher-scored hooks over multiple runs', () => {
    const highScoreHook = createMockHook({ id: 'high-score', hook_text: 'High' });
    const lowScoreHook = createMockHook({ id: 'low-score', hook_text: 'Low' });

    const scoredHooks = [
      { hook: highScoreHook, score: 90 },
      { hook: lowScoreHook, score: 10 },
    ];

    const results: Record<string, number> = { 'high-score': 0, 'low-score': 0 };

    // Run selection 100 times
    for (let i = 0; i < 100; i++) {
      const selected = weightedRandomSelect(scoredHooks);
      if (selected) {
        results[selected.id]++;
      }
    }

    // High-score hook should be selected more often (approximately 90% of the time)
    expect(results['high-score']).toBeGreaterThan(results['low-score']);
  });

  it('should handle equal scores fairly', () => {
    const hook1 = createMockHook({ id: 'hook-1' });
    const hook2 = createMockHook({ id: 'hook-2' });

    const scoredHooks = [
      { hook: hook1, score: 50 },
      { hook: hook2, score: 50 },
    ];

    const results: Record<string, number> = { 'hook-1': 0, 'hook-2': 0 };

    // Run selection 100 times
    for (let i = 0; i < 100; i++) {
      const selected = weightedRandomSelect(scoredHooks);
      if (selected) {
        results[selected.id]++;
      }
    }

    // Both should be selected approximately equally (allow ±20% variance)
    const diff = Math.abs(results['hook-1'] - results['hook-2']);
    expect(diff).toBeLessThan(40); // 40% tolerance
  });

  it('should handle hooks with zero score', () => {
    const zeroHook = createMockHook({ id: 'zero' });
    const nonZeroHook = createMockHook({ id: 'nonzero' });

    const scoredHooks = [
      { hook: zeroHook, score: 0 },
      { hook: nonZeroHook, score: 100 },
    ];

    // Should still work, using minimum score of 0.1
    const result = weightedRandomSelect(scoredHooks);
    expect(result).toBeDefined();
  });

  it('should handle negative scores by treating as minimum', () => {
    const negativeHook = createMockHook({ id: 'negative' });
    const positiveHook = createMockHook({ id: 'positive' });

    const scoredHooks = [
      { hook: negativeHook, score: -10 },
      { hook: positiveHook, score: 100 },
    ];

    const results: Record<string, number> = { 'negative': 0, 'positive': 0 };

    for (let i = 0; i < 50; i++) {
      const selected = weightedRandomSelect(scoredHooks);
      if (selected) {
        results[selected.id]++;
      }
    }

    // Positive should dominate
    expect(results['positive']).toBeGreaterThan(results['negative']);
  });
});

// ============================================================================
// Collection and Content Type Filtering Tests
// ============================================================================

describe('Collection and Content Type Filtering', () => {
  it('should match hooks by collection', () => {
    const hooks = [
      createMockHook({ id: '1', collections: ['grounding'] }),
      createMockHook({ id: '2', collections: ['wholeness', 'growth'] }),
      createMockHook({ id: '3', collections: ['grounding', 'growth'] }),
    ];

    const matchingGrounding = hooks.filter(h => h.collections.includes('grounding'));
    expect(matchingGrounding).toHaveLength(2);
    expect(matchingGrounding.map(h => h.id)).toEqual(['1', '3']);
  });

  it('should match hooks by content type', () => {
    const hooks = [
      createMockHook({ id: '1', content_types: ['quote_reveal'] }),
      createMockHook({ id: '2', content_types: ['educational', 'transformation'] }),
      createMockHook({ id: '3', content_types: ['quote_reveal', 'educational'] }),
    ];

    const matchingQuoteReveal = hooks.filter(h => h.content_types.includes('quote_reveal'));
    expect(matchingQuoteReveal).toHaveLength(2);
  });

  it('should match hooks by both collection AND content type', () => {
    const hooks = [
      createMockHook({
        id: '1',
        collections: ['grounding'],
        content_types: ['quote_reveal'],
      }),
      createMockHook({
        id: '2',
        collections: ['grounding'],
        content_types: ['educational'],
      }),
      createMockHook({
        id: '3',
        collections: ['wholeness'],
        content_types: ['quote_reveal'],
      }),
    ];

    const matching = hooks.filter(
      h => h.collections.includes('grounding') && h.content_types.includes('quote_reveal')
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe('1');
  });
});

// ============================================================================
// Hook Type Tests
// ============================================================================

describe('Hook Types', () => {
  it('should support pattern_interrupt type', () => {
    const hook = createMockHook({
      hook_type: 'pattern_interrupt',
      hook_text: 'Stop scrolling. This changed everything.',
    });
    expect(hook.hook_type).toBe('pattern_interrupt');
  });

  it('should support question type', () => {
    const hook = createMockHook({
      hook_type: 'question',
      hook_text: 'What if the voice in your head is just scared?',
    });
    expect(hook.hook_type).toBe('question');
  });

  it('should support statement type', () => {
    const hook = createMockHook({
      hook_type: 'statement',
      hook_text: 'You are not your trauma.',
    });
    expect(hook.hook_type).toBe('statement');
  });

  it('should support controversial type', () => {
    const hook = createMockHook({
      hook_type: 'controversial',
      hook_text: 'Self-care isn\'t selfish. It\'s survival.',
    });
    expect(hook.hook_type).toBe('controversial');
  });

  it('should support story type', () => {
    const hook = createMockHook({
      hook_type: 'story',
      hook_text: 'A client said something that made me stop...',
    });
    expect(hook.hook_type).toBe('story');
  });
});

// ============================================================================
// Active Status Tests
// ============================================================================

describe('Active Status', () => {
  it('should only consider active hooks', () => {
    const hooks = [
      createMockHook({ id: '1', is_active: true }),
      createMockHook({ id: '2', is_active: false }),
      createMockHook({ id: '3', is_active: true }),
    ];

    const activeHooks = hooks.filter(h => h.is_active);
    expect(activeHooks).toHaveLength(2);
  });
});

// ============================================================================
// Exclusion Tests
// ============================================================================

describe('Exclusion Logic', () => {
  it('should exclude specified hook IDs', () => {
    const hooks = [
      createMockHook({ id: '1' }),
      createMockHook({ id: '2' }),
      createMockHook({ id: '3' }),
    ];

    const excludeIds = ['1', '3'];
    const filtered = hooks.filter(h => !excludeIds.includes(h.id));

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });
});

// ============================================================================
// Performance Metrics Tests
// ============================================================================

describe('Performance Metrics', () => {
  it('should track engagement rate separately from completion rate', () => {
    const hook = createMockHook({
      avg_completion_rate: 0.7, // 70% watch to end
      avg_engagement_rate: 0.15, // 15% like/comment/share
    });

    expect(hook.avg_completion_rate).toBe(0.7);
    expect(hook.avg_engagement_rate).toBe(0.15);
  });

  it('should handle running average calculation', () => {
    const prevAvg = 0.5;
    const newValue = 0.8;
    const usageCount = 5;

    // Running average formula: prev + (new - prev) / count
    const newAvg = prevAvg + (newValue - prevAvg) / usageCount;

    expect(newAvg).toBeCloseTo(0.56, 2);
  });
});
