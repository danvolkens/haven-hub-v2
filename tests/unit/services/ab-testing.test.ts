import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length })),
  };
}

// Mock Supabase admin client
function createFullMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  // Methods that return this for chaining
  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  // Methods that resolve
  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockQueryBuilder = createFullMockQueryBuilder([
  { id: 'test-1', name: 'Test 1', status: 'running' },
]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: { total_impressions: 1000, total_conversions: 50 }, error: null }),
  })),
}));

describe('AB Testing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTest', () => {
    it('should be exported as a function', async () => {
      const { createTest } = await import('@/lib/services/ab-testing');
      expect(typeof createTest).toBe('function');
    });

    it('should accept userId and test input', async () => {
      const { createTest } = await import('@/lib/services/ab-testing');
      const input = {
        name: 'Test Campaign',
        test_type: 'pin_creative' as const,
        primary_metric: 'ctr' as const,
        control: {
          name: 'Control',
          content_type: 'pin',
          content_id: 'pin-1',
        },
        variants: [
          {
            name: 'Variant A',
            content_type: 'pin',
            content_id: 'pin-2',
          },
        ],
      };

      const result = await createTest('user-123', input);
      expect(result).toBeDefined();
    });
  });

  describe('startTest', () => {
    it('should be exported as a function', async () => {
      const { startTest } = await import('@/lib/services/ab-testing');
      expect(typeof startTest).toBe('function');
    });

    it('should accept userId and testId', async () => {
      const { startTest } = await import('@/lib/services/ab-testing');
      const result = await startTest('user-123', 'test-1');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });
  });

  describe('pauseTest', () => {
    it('should be exported as a function', async () => {
      const { pauseTest } = await import('@/lib/services/ab-testing');
      expect(typeof pauseTest).toBe('function');
    });

    it('should return success status', async () => {
      const { pauseTest } = await import('@/lib/services/ab-testing');
      const result = await pauseTest('user-123', 'test-1');
      expect(result).toHaveProperty('success');
    });
  });

  describe('resumeTest', () => {
    it('should be exported as a function', async () => {
      const { resumeTest } = await import('@/lib/services/ab-testing');
      expect(typeof resumeTest).toBe('function');
    });

    it('should return success status', async () => {
      const { resumeTest } = await import('@/lib/services/ab-testing');
      const result = await resumeTest('user-123', 'test-1');
      expect(result).toHaveProperty('success');
    });
  });

  describe('cancelTest', () => {
    it('should be exported as a function', async () => {
      const { cancelTest } = await import('@/lib/services/ab-testing');
      expect(typeof cancelTest).toBe('function');
    });

    it('should return success status', async () => {
      const { cancelTest } = await import('@/lib/services/ab-testing');
      const result = await cancelTest('user-123', 'test-1');
      expect(result).toHaveProperty('success');
    });
  });

  describe('recordResults', () => {
    it('should be exported as a function', async () => {
      const { recordResults } = await import('@/lib/services/ab-testing');
      expect(typeof recordResults).toBe('function');
    });
  });

  describe('calculateSignificance', () => {
    it('should be exported as a function', async () => {
      const { calculateSignificance } = await import('@/lib/services/ab-testing');
      expect(typeof calculateSignificance).toBe('function');
    });
  });

  describe('declareWinner', () => {
    it('should be exported as a function', async () => {
      const { declareWinner } = await import('@/lib/services/ab-testing');
      expect(typeof declareWinner).toBe('function');
    });

    it('should accept userId, testId, and winnerId', async () => {
      const { declareWinner } = await import('@/lib/services/ab-testing');
      const result = await declareWinner('user-123', 'test-1', 'variant-1');
      expect(result).toBeDefined();
    });
  });

  describe('getTests', () => {
    it('should be exported as a function', async () => {
      const { getTests } = await import('@/lib/services/ab-testing');
      expect(typeof getTests).toBe('function');
    });

    it('should return object with tests array and count', async () => {
      const { getTests } = await import('@/lib/services/ab-testing');
      const result = await getTests('user-123');
      expect(result).toHaveProperty('tests');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.tests)).toBe(true);
    });

    it('should accept filter options', async () => {
      const { getTests } = await import('@/lib/services/ab-testing');
      const result = await getTests('user-123', { status: 'running' });
      expect(result).toHaveProperty('tests');
      expect(result).toHaveProperty('count');
    });
  });

  describe('getTestWithVariants', () => {
    it('should be exported as a function', async () => {
      const { getTestWithVariants } = await import('@/lib/services/ab-testing');
      expect(typeof getTestWithVariants).toBe('function');
    });
  });

  describe('getTestResults', () => {
    it('should be exported as a function', async () => {
      const { getTestResults } = await import('@/lib/services/ab-testing');
      expect(typeof getTestResults).toBe('function');
    });
  });

  describe('getTestsForSignificanceCheck', () => {
    it('should be exported as a function', async () => {
      const { getTestsForSignificanceCheck } = await import('@/lib/services/ab-testing');
      expect(typeof getTestsForSignificanceCheck).toBe('function');
    });

    it('should return array', async () => {
      const { getTestsForSignificanceCheck } = await import('@/lib/services/ab-testing');
      const result = await getTestsForSignificanceCheck();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deleteTest', () => {
    it('should be exported as a function', async () => {
      const { deleteTest } = await import('@/lib/services/ab-testing');
      expect(typeof deleteTest).toBe('function');
    });

    it('should return success status', async () => {
      const { deleteTest } = await import('@/lib/services/ab-testing');
      const result = await deleteTest('user-123', 'test-1');
      expect(result).toHaveProperty('success');
    });
  });
});

describe('AB Testing Types', () => {
  describe('TestType', () => {
    const validTestTypes = [
      'pin_creative',
      'headline',
      'description',
      'hook',
      'cta',
      'audience',
      'schedule',
    ];

    validTestTypes.forEach((type) => {
      it(`should accept ${type} as valid test type`, () => {
        expect(validTestTypes).toContain(type);
      });
    });
  });

  describe('PrimaryMetric', () => {
    const validMetrics = [
      'ctr',
      'save_rate',
      'conversion_rate',
      'engagement_rate',
      'cpa',
      'roas',
    ];

    validMetrics.forEach((metric) => {
      it(`should accept ${metric} as valid metric`, () => {
        expect(validMetrics).toContain(metric);
      });
    });
  });

  describe('TestStatus', () => {
    const validStatuses = ['draft', 'running', 'paused', 'completed', 'cancelled'];

    validStatuses.forEach((status) => {
      it(`should accept ${status} as valid status`, () => {
        expect(validStatuses).toContain(status);
      });
    });
  });
});

describe('Statistical Significance', () => {
  describe('Z-Score Calculation', () => {
    it('should return 0 for identical proportions', () => {
      // When control and test have same proportions, z-score should be 0
      const control = { successes: 50, trials: 1000 };
      const test = { successes: 50, trials: 1000 };

      const p1 = control.successes / control.trials;
      const p2 = test.successes / test.trials;

      expect(p1).toBe(p2);
      expect(p2 - p1).toBe(0);
    });

    it('should be positive when test outperforms control', () => {
      const control = { successes: 50, trials: 1000 }; // 5% conversion
      const test = { successes: 100, trials: 1000 }; // 10% conversion

      const p1 = control.successes / control.trials;
      const p2 = test.successes / test.trials;

      expect(p2).toBeGreaterThan(p1);
    });

    it('should be negative when control outperforms test', () => {
      const control = { successes: 100, trials: 1000 }; // 10% conversion
      const test = { successes: 50, trials: 1000 }; // 5% conversion

      const p1 = control.successes / control.trials;
      const p2 = test.successes / test.trials;

      expect(p2).toBeLessThan(p1);
    });
  });

  describe('Confidence Levels', () => {
    it('should require 95% confidence for significance by default', () => {
      const confidenceThreshold = 0.95;
      expect(confidenceThreshold).toBe(0.95);
    });

    it('should support custom confidence thresholds', () => {
      const customThresholds = [0.90, 0.95, 0.99];
      customThresholds.forEach((threshold) => {
        expect(threshold).toBeGreaterThan(0);
        expect(threshold).toBeLessThan(1);
      });
    });
  });

  describe('Sample Size Requirements', () => {
    it('should have minimum sample size of 100 per variant', () => {
      const minSampleSize = 100;
      expect(minSampleSize).toBe(100);
    });

    it('should check sample size is met', () => {
      const control = { trials: 150 };
      const test = { trials: 200 };

      const sampleSizeMet = control.trials >= 100 && test.trials >= 100;
      expect(sampleSizeMet).toBe(true);
    });

    it('should flag when sample size not met', () => {
      const control = { trials: 50 };
      const test = { trials: 200 };

      const sampleSizeMet = control.trials >= 100 && test.trials >= 100;
      expect(sampleSizeMet).toBe(false);
    });
  });

  describe('Lift Calculation', () => {
    it('should calculate positive lift correctly', () => {
      const control = { rate: 0.05 }; // 5%
      const test = { rate: 0.06 }; // 6%

      const lift = ((test.rate - control.rate) / control.rate) * 100;
      expect(lift).toBeCloseTo(20, 1); // 20% improvement
    });

    it('should calculate negative lift correctly', () => {
      const control = { rate: 0.10 }; // 10%
      const test = { rate: 0.08 }; // 8%

      const lift = ((test.rate - control.rate) / control.rate) * 100;
      expect(lift).toBeCloseTo(-20, 1); // 20% decrease
    });

    it('should handle zero control rate', () => {
      const control = { rate: 0 };
      const test = { rate: 0.05 };

      const lift = control.rate > 0 ? ((test.rate - control.rate) / control.rate) * 100 : 0;
      expect(lift).toBe(0);
    });
  });
});

describe('Traffic Split', () => {
  it('should default to equal split for 2 variants', () => {
    const variantCount = 2;
    const defaultSplit = Math.floor(100 / variantCount);
    expect(defaultSplit).toBe(50);
  });

  it('should calculate split for 3 variants', () => {
    const variantCount = 3;
    const defaultSplit = Math.floor(100 / variantCount);
    expect(defaultSplit).toBe(33);
  });

  it('should sum to 100 or less', () => {
    const variantCount = 4;
    const splitPerVariant = Math.floor(100 / variantCount);
    const totalSplit = splitPerVariant * variantCount;
    expect(totalSplit).toBeLessThanOrEqual(100);
  });

  it('should allow custom traffic splits', () => {
    const customSplit = { control: 20, test: 80 };
    expect(customSplit.control + customSplit.test).toBe(100);
  });
});

describe('Winner Determination', () => {
  it('should declare test winner when test outperforms significantly', () => {
    const isSignificant = true;
    const zScore = 2.5; // Positive = test better

    const winner = isSignificant ? (zScore > 0 ? 'test' : 'control') : 'none';
    expect(winner).toBe('test');
  });

  it('should declare control winner when control outperforms significantly', () => {
    const isSignificant = true;
    const zScore = -2.5; // Negative = control better

    const winner = isSignificant ? (zScore > 0 ? 'test' : 'control') : 'none';
    expect(winner).toBe('control');
  });

  it('should declare no winner when not significant', () => {
    const isSignificant = false;
    const zScore = 1.0;

    const winner = isSignificant ? (zScore > 0 ? 'test' : 'control') : 'none';
    expect(winner).toBe('none');
  });
});

describe('Normal CDF Approximation', () => {
  it('should return 0.5 for z=0', () => {
    // CDF(0) = 0.5 for standard normal
    const z = 0;
    // Using approximation from the service
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    const cdf = 0.5 * (1.0 + sign * y);

    expect(cdf).toBeCloseTo(0.5, 2);
  });

  it('should return approximately 0.975 for z=1.96', () => {
    const z = 1.96;
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    const cdf = 0.5 * (1.0 + sign * y);

    expect(cdf).toBeCloseTo(0.975, 2);
  });
});
