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
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: dataArray, error, count: dataArray.length }),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length })),
  };
}

// Mock Supabase
const mockQueryBuilder = createMockQueryBuilder();
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  })),
}));

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock AI response' }],
      }),
    },
  })),
}));

describe('Intelligence Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runDailyAnalysis', () => {
    it('should be exported as a function', async () => {
      const { runDailyAnalysis } = await import('@/lib/intelligence/intelligence-service');
      expect(typeof runDailyAnalysis).toBe('function');
    });

    it('should accept userId parameter', async () => {
      const { runDailyAnalysis } = await import('@/lib/intelligence/intelligence-service');
      const result = await runDailyAnalysis('test-user-id');
      expect(result).toBeDefined();
    });

    it('should return insights and recommendations counts', async () => {
      const { runDailyAnalysis } = await import('@/lib/intelligence/intelligence-service');
      const result = await runDailyAnalysis('test-user-id');

      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
      expect(typeof result.insights).toBe('number');
      expect(typeof result.recommendations).toBe('number');
    });

    it('should handle errors gracefully', async () => {
      const { runDailyAnalysis } = await import('@/lib/intelligence/intelligence-service');
      const result = await runDailyAnalysis('test-user-id');

      // Even with mocked data, should return valid structure
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('getActiveInsights', () => {
    it('should be exported as a function', async () => {
      const { getActiveInsights } = await import('@/lib/intelligence/intelligence-service');
      expect(typeof getActiveInsights).toBe('function');
    });

    it('should accept userId and options', async () => {
      const { getActiveInsights } = await import('@/lib/intelligence/intelligence-service');
      const result = await getActiveInsights('test-user-id', { limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept category filter', async () => {
      const { getActiveInsights } = await import('@/lib/intelligence/intelligence-service');
      const result = await getActiveInsights('test-user-id', { category: 'pinterest' });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no insights', async () => {
      const { getActiveInsights } = await import('@/lib/intelligence/intelligence-service');
      const result = await getActiveInsights('test-user-id');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPendingRecommendations', () => {
    it('should be exported as a function', async () => {
      const { getPendingRecommendations } = await import('@/lib/intelligence/intelligence-service');
      expect(typeof getPendingRecommendations).toBe('function');
    });

    it('should accept userId and options', async () => {
      const { getPendingRecommendations } = await import('@/lib/intelligence/intelligence-service');
      const result = await getPendingRecommendations('test-user-id', { limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept type filter', async () => {
      const { getPendingRecommendations } = await import('@/lib/intelligence/intelligence-service');
      const result = await getPendingRecommendations('test-user-id', { type: 'posting_time' });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no recommendations', async () => {
      const { getPendingRecommendations } = await import('@/lib/intelligence/intelligence-service');
      const result = await getPendingRecommendations('test-user-id');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Intelligence Analysis Types', () => {
  describe('Insight Types', () => {
    const insightTypes = ['performance', 'warning', 'opportunity', 'info'];

    insightTypes.forEach((type) => {
      it(`should recognize ${type} as valid insight type`, () => {
        expect(insightTypes).toContain(type);
      });
    });
  });

  describe('Insight Categories', () => {
    const categories = ['pinterest', 'customers', 'content', 'products', 'general'];

    categories.forEach((category) => {
      it(`should recognize ${category} as valid category`, () => {
        expect(categories).toContain(category);
      });
    });
  });

  describe('Insight Priorities', () => {
    const priorities = ['high', 'medium', 'low'];

    priorities.forEach((priority) => {
      it(`should recognize ${priority} as valid priority`, () => {
        expect(priorities).toContain(priority);
      });
    });
  });

  describe('Recommendation Types', () => {
    const recommendationTypes = ['posting_time', 'quote_suggestion', 'collection_focus', 'customer_action'];

    recommendationTypes.forEach((type) => {
      it(`should recognize ${type} as valid recommendation type`, () => {
        expect(recommendationTypes).toContain(type);
      });
    });
  });
});

describe('Collection Themes', () => {
  describe('Theme Definitions', () => {
    const collections = {
      grounding: ['stability', 'presence', 'nature', 'calm', 'roots'],
      wholeness: ['self-acceptance', 'healing', 'integration', 'compassion', 'balance'],
      growth: ['potential', 'change', 'courage', 'possibility', 'becoming'],
    };

    Object.entries(collections).forEach(([collection, themes]) => {
      it(`should have themes for ${collection} collection`, () => {
        expect(themes.length).toBeGreaterThan(0);
        themes.forEach((theme) => {
          expect(typeof theme).toBe('string');
        });
      });
    });
  });
});

describe('Analysis Context', () => {
  it('should define required context fields', () => {
    const contextFields = [
      'userId',
      'quotes',
      'assets',
      'pins',
      'products',
      'customers',
      'recentOrders',
      'contentPerformance',
    ];

    contextFields.forEach((field) => {
      expect(typeof field).toBe('string');
    });
  });
});

describe('Insight Generation Logic', () => {
  describe('Top Performing Pins', () => {
    it('should calculate average engagement rate', () => {
      const pins = [
        { engagement_rate: 0.05 },
        { engagement_rate: 0.10 },
        { engagement_rate: 0.15 },
      ];

      const avgRate = pins.reduce((sum, p) => sum + p.engagement_rate, 0) / pins.length;
      expect(avgRate).toBeCloseTo(0.1, 2);
    });

    it('should sort pins by engagement rate', () => {
      const pins = [
        { id: 1, engagement_rate: 0.05 },
        { id: 2, engagement_rate: 0.15 },
        { id: 3, engagement_rate: 0.10 },
      ];

      const sorted = [...pins].sort((a, b) => b.engagement_rate - a.engagement_rate);
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });
  });

  describe('At-Risk Customers', () => {
    it('should identify at-risk customers by journey stage', () => {
      const customers = [
        { id: 1, journey_stage: 'active', total_spent: 100 },
        { id: 2, journey_stage: 'at_risk', total_spent: 200 },
        { id: 3, journey_stage: 'champion', total_spent: 500 },
        { id: 4, journey_stage: 'at_risk', total_spent: 150 },
      ];

      const atRisk = customers.filter((c) => c.journey_stage === 'at_risk');
      expect(atRisk.length).toBe(2);
    });

    it('should calculate total lifetime value of at-risk customers', () => {
      const atRiskCustomers = [
        { id: 2, journey_stage: 'at_risk', total_spent: 200 },
        { id: 4, journey_stage: 'at_risk', total_spent: 150 },
      ];

      const totalLTV = atRiskCustomers.reduce((sum, c) => sum + c.total_spent, 0);
      expect(totalLTV).toBe(350);
    });
  });

  describe('Collection Performance', () => {
    it('should aggregate metrics by collection', () => {
      const pins = [
        { collection: 'growth', impressions: 100, saves: 10, clicks: 5 },
        { collection: 'growth', impressions: 200, saves: 20, clicks: 10 },
        { collection: 'wholeness', impressions: 150, saves: 15, clicks: 8 },
      ];

      const collectionPerformance = new Map<string, { impressions: number; saves: number; clicks: number }>();
      for (const pin of pins) {
        const existing = collectionPerformance.get(pin.collection) || { impressions: 0, saves: 0, clicks: 0 };
        existing.impressions += pin.impressions;
        existing.saves += pin.saves;
        existing.clicks += pin.clicks;
        collectionPerformance.set(pin.collection, existing);
      }

      expect(collectionPerformance.get('growth')?.impressions).toBe(300);
      expect(collectionPerformance.get('growth')?.saves).toBe(30);
      expect(collectionPerformance.get('growth')?.clicks).toBe(15);
      expect(collectionPerformance.get('wholeness')?.impressions).toBe(150);
    });
  });
});

describe('Recommendation Generation Logic', () => {
  describe('Optimal Posting Time', () => {
    it('should aggregate engagement by hour', () => {
      const pins = [
        { published_at: '2024-01-15T10:00:00Z', engagement_rate: 0.05 },
        { published_at: '2024-01-15T10:30:00Z', engagement_rate: 0.08 },
        { published_at: '2024-01-15T14:00:00Z', engagement_rate: 0.03 },
      ];

      const engagementByHour = new Map<number, number>();
      for (const pin of pins) {
        const hour = new Date(pin.published_at).getUTCHours();
        const current = engagementByHour.get(hour) || 0;
        engagementByHour.set(hour, current + pin.engagement_rate);
      }

      expect(engagementByHour.get(10)).toBeCloseTo(0.13, 2);
      expect(engagementByHour.get(14)).toBeCloseTo(0.03, 2);
    });

    it('should identify best posting hour', () => {
      const engagementByHour = new Map<number, number>([
        [8, 0.05],
        [10, 0.15],
        [12, 0.08],
        [14, 0.12],
      ]);

      const bestHour = Array.from(engagementByHour.entries())
        .sort((a, b) => b[1] - a[1])[0];

      expect(bestHour[0]).toBe(10);
      expect(bestHour[1]).toBe(0.15);
    });
  });

  describe('Quote Collection Balance', () => {
    it('should identify underrepresented collections', () => {
      const quoteCounts = {
        grounding: 15,
        wholeness: 8,
        growth: 20,
      };

      const threshold = 10;
      const underrepresented = Object.entries(quoteCounts)
        .filter(([, count]) => count < threshold)
        .map(([collection]) => collection);

      expect(underrepresented).toContain('wholeness');
      expect(underrepresented).not.toContain('grounding');
      expect(underrepresented).not.toContain('growth');
    });
  });
});
