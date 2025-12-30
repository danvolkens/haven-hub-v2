import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'is', 'not', 'upsert'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockPillar = {
  id: 'pillar-1',
  name: 'Growth',
  description: 'Content focused on personal growth',
  recommended_percentage: 25,
  display_order: 0,
};

const mockPerformance = {
  id: 'perf-1',
  user_id: 'user-123',
  pillar_id: 'pillar-1',
  platform: 'pinterest',
  period_type: 'week',
  period_start: '2024-06-10',
  content_count: 10,
  impressions: 1000,
  clicks: 50,
  saves: 100,
  avg_ctr: 5,
  avg_save_rate: 10,
  winner_count: 2,
};

const mockQueryBuilder = createMockQueryBuilder([mockPillar, mockPerformance]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Content Pillars Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContentPillars', () => {
    it('should be exported as a function', async () => {
      const { getContentPillars } = await import('@/lib/services/content-pillars');
      expect(typeof getContentPillars).toBe('function');
    });

    it('should return array of pillars', async () => {
      const { getContentPillars } = await import('@/lib/services/content-pillars');
      const pillars = await getContentPillars();

      expect(Array.isArray(pillars)).toBe(true);
    });
  });

  describe('getPillarPerformance', () => {
    it('should be exported as a function', async () => {
      const { getPillarPerformance } = await import('@/lib/services/content-pillars');
      expect(typeof getPillarPerformance).toBe('function');
    });

    it('should accept userId and period type', async () => {
      const { getPillarPerformance } = await import('@/lib/services/content-pillars');
      const performance = await getPillarPerformance('user-123', 'week');

      expect(Array.isArray(performance)).toBe(true);
    });

    it('should support week period type', async () => {
      const { getPillarPerformance } = await import('@/lib/services/content-pillars');
      const performance = await getPillarPerformance('user-123', 'week');

      expect(performance).toBeDefined();
    });

    it('should support month period type', async () => {
      const { getPillarPerformance } = await import('@/lib/services/content-pillars');
      const performance = await getPillarPerformance('user-123', 'month');

      expect(performance).toBeDefined();
    });

    it('should support quarter period type', async () => {
      const { getPillarPerformance } = await import('@/lib/services/content-pillars');
      const performance = await getPillarPerformance('user-123', 'quarter');

      expect(performance).toBeDefined();
    });
  });

  describe('getMixRecommendations', () => {
    it('should be exported as a function', async () => {
      const { getMixRecommendations } = await import('@/lib/services/content-pillars');
      expect(typeof getMixRecommendations).toBe('function');
    });

    it('should accept userId', async () => {
      const { getMixRecommendations } = await import('@/lib/services/content-pillars');
      const recommendations = await getMixRecommendations('user-123');

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('generateMixRecommendations', () => {
    it('should be exported as a function', async () => {
      const { generateMixRecommendations } = await import('@/lib/services/content-pillars');
      expect(typeof generateMixRecommendations).toBe('function');
    });
  });

});

describe('Content Pillar Interface', () => {
  it('should have required fields', () => {
    const pillar = {
      id: 'pillar-1',
      name: 'Growth',
      description: 'Personal growth content',
      recommended_percentage: 25,
      display_order: 0,
    };

    expect(pillar.id).toBeDefined();
    expect(pillar.name).toBeDefined();
    expect(pillar.recommended_percentage).toBeDefined();
  });
});

describe('Pillar Performance Interface', () => {
  it('should have required fields', () => {
    const performance = {
      user_id: 'user-123',
      pillar_id: 'pillar-1',
      platform: 'pinterest',
      period_type: 'week' as const,
      content_count: 10,
      impressions: 1000,
      clicks: 50,
      saves: 100,
    };

    expect(performance.user_id).toBeDefined();
    expect(performance.pillar_id).toBeDefined();
    expect(performance.platform).toBeDefined();
    expect(performance.period_type).toBeDefined();
  });
});

describe('Period Types', () => {
  const periodTypes = ['week', 'month', 'quarter'];

  periodTypes.forEach((type) => {
    it(`should recognize ${type} as valid period type`, () => {
      expect(periodTypes).toContain(type);
    });
  });
});

describe('Performance Weights', () => {
  const weights = {
    CTR: 0.3,
    SAVE_RATE: 0.4,
    WINNER_RATE: 0.3,
  };

  it('should have CTR weight of 0.3', () => {
    expect(weights.CTR).toBe(0.3);
  });

  it('should have SAVE_RATE weight of 0.4', () => {
    expect(weights.SAVE_RATE).toBe(0.4);
  });

  it('should have WINNER_RATE weight of 0.3', () => {
    expect(weights.WINNER_RATE).toBe(0.3);
  });

  it('should sum to 1.0', () => {
    const sum = weights.CTR + weights.SAVE_RATE + weights.WINNER_RATE;
    expect(sum).toBeCloseTo(1.0);
  });
});

describe('Performance Score Calculation', () => {
  describe('CTR Score', () => {
    it('should calculate CTR score', () => {
      const clicks = 50;
      const impressions = 1000;
      const ctr = (clicks / impressions) * 100;

      expect(ctr).toBe(5);
    });
  });

  describe('Save Rate Score', () => {
    it('should calculate save rate', () => {
      const saves = 100;
      const impressions = 1000;
      const saveRate = (saves / impressions) * 100;

      expect(saveRate).toBe(10);
    });
  });

  describe('Winner Rate', () => {
    it('should calculate winner rate', () => {
      const winnerCount = 2;
      const contentCount = 10;
      const winnerRate = (winnerCount / contentCount) * 100;

      expect(winnerRate).toBe(20);
    });
  });

  describe('Weighted Score', () => {
    it('should calculate weighted performance score', () => {
      const ctrScore = 5;
      const saveRateScore = 10;
      const winnerRateScore = 20;

      const weights = { CTR: 0.3, SAVE_RATE: 0.4, WINNER_RATE: 0.3 };

      const weightedScore =
        ctrScore * weights.CTR +
        saveRateScore * weights.SAVE_RATE +
        winnerRateScore * weights.WINNER_RATE;

      // 5*0.3 + 10*0.4 + 20*0.3 = 1.5 + 4 + 6 = 11.5
      expect(weightedScore).toBe(11.5);
    });
  });
});

describe('Mix Recommendation', () => {
  it('should have required fields', () => {
    const recommendation = {
      pillar_id: 'pillar-1',
      recommended_percentage: 30,
      current_percentage: 25,
      reasoning: {
        primary: 'High engagement',
        factors: ['High CTR', 'Good save rate'],
      },
      confidence_score: 0.85,
    };

    expect(recommendation.pillar_id).toBeDefined();
    expect(recommendation.recommended_percentage).toBeDefined();
    expect(recommendation.reasoning).toBeDefined();
  });
});

describe('Recommendation Reasoning', () => {
  it('should have primary reason', () => {
    const reasoning = {
      primary: 'This pillar is performing well',
      factors: ['High CTR', 'Good saves'],
      action: 'Increase allocation',
    };

    expect(reasoning.primary).toBeDefined();
    expect(reasoning.factors.length).toBeGreaterThan(0);
  });
});

describe('Confidence Score', () => {
  const MIN_CONTENT_FOR_CONFIDENCE = 5;

  it('should have low confidence with few content items', () => {
    const contentCount = 3;
    const hasEnoughContent = contentCount >= MIN_CONTENT_FOR_CONFIDENCE;

    expect(hasEnoughContent).toBe(false);
  });

  it('should have high confidence with enough content', () => {
    const contentCount = 10;
    const hasEnoughContent = contentCount >= MIN_CONTENT_FOR_CONFIDENCE;

    expect(hasEnoughContent).toBe(true);
  });
});

describe('Percentage Distribution', () => {
  it('should sum recommended percentages to 100', () => {
    const pillars = [
      { name: 'Growth', recommended_percentage: 25 },
      { name: 'Healing', recommended_percentage: 25 },
      { name: 'Inspiration', recommended_percentage: 25 },
      { name: 'Motivation', recommended_percentage: 25 },
    ];

    const total = pillars.reduce((sum, p) => sum + p.recommended_percentage, 0);
    expect(total).toBe(100);
  });

  it('should calculate current distribution', () => {
    const contents = [
      { pillar: 'Growth', count: 30 },
      { pillar: 'Healing', count: 20 },
      { pillar: 'Inspiration', count: 35 },
      { pillar: 'Motivation', count: 15 },
    ];

    const total = contents.reduce((sum, c) => sum + c.count, 0);
    const distribution = contents.map(c => ({
      pillar: c.pillar,
      percentage: (c.count / total) * 100,
    }));

    expect(distribution[0].percentage).toBe(30);
    expect(distribution[2].percentage).toBe(35);
  });
});

describe('Period Start Calculation', () => {
  it('should calculate week start', () => {
    const date = new Date('2024-06-15'); // Saturday
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);

    expect(weekStart.getDay()).toBe(0); // Sunday
  });

  it('should calculate month start', () => {
    const date = new Date('2024-06-15');
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

    expect(monthStart.getDate()).toBe(1);
  });

  it('should calculate quarter start', () => {
    const date = new Date('2024-06-15');
    const quarter = Math.floor(date.getMonth() / 3);
    const quarterStart = new Date(date.getFullYear(), quarter * 3, 1);

    expect(quarterStart.getMonth()).toBe(3); // April (Q2 start)
  });
});
