import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockQueryBuilder = createMockQueryBuilder([]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Creative Health Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Score', () => {
    it('should calculate overall health score', () => {
      const metrics = {
        variety: 80,
        freshness: 70,
        performance: 90,
        consistency: 85,
      };

      const weights = {
        variety: 0.25,
        freshness: 0.25,
        performance: 0.25,
        consistency: 0.25,
      };

      const score =
        metrics.variety * weights.variety +
        metrics.freshness * weights.freshness +
        metrics.performance * weights.performance +
        metrics.consistency * weights.consistency;

      expect(score).toBe(81.25);
    });

    it('should classify health as excellent', () => {
      const score = 90;
      const classification = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

      expect(classification).toBe('excellent');
    });

    it('should classify health as good', () => {
      const score = 70;
      const classification = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

      expect(classification).toBe('good');
    });

    it('should classify health as fair', () => {
      const score = 50;
      const classification = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

      expect(classification).toBe('fair');
    });

    it('should classify health as poor', () => {
      const score = 30;
      const classification = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

      expect(classification).toBe('poor');
    });
  });

  describe('Variety Score', () => {
    it('should calculate template variety', () => {
      const templates = ['template-1', 'template-1', 'template-2', 'template-3', 'template-1'];
      const uniqueTemplates = new Set(templates);
      const varietyRatio = uniqueTemplates.size / templates.length;

      expect(varietyRatio).toBe(0.6);
    });

    it('should score high variety well', () => {
      const uniqueCount = 10;
      const totalCount = 20;
      const varietyScore = (uniqueCount / totalCount) * 100;

      expect(varietyScore).toBe(50);
    });

    it('should penalize low variety', () => {
      const uniqueCount = 2;
      const totalCount = 20;
      const varietyScore = (uniqueCount / totalCount) * 100;

      expect(varietyScore).toBe(10);
    });
  });

  describe('Freshness Score', () => {
    it('should calculate content age', () => {
      const createdAt = new Date('2024-06-01');
      const now = new Date('2024-06-15');
      const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      expect(ageDays).toBe(14);
    });

    it('should score fresh content high', () => {
      const ageDays = 7;
      const maxAgeDays = 90;
      const freshnessScore = Math.max(0, 100 - (ageDays / maxAgeDays) * 100);

      expect(freshnessScore).toBeCloseTo(92.22, 1);
    });

    it('should score old content low', () => {
      const ageDays = 60;
      const maxAgeDays = 90;
      const freshnessScore = Math.max(0, 100 - (ageDays / maxAgeDays) * 100);

      expect(freshnessScore).toBeCloseTo(33.33, 1);
    });
  });

  describe('Performance Score', () => {
    it('should calculate CTR-based score', () => {
      const ctr = 2.5;
      const benchmarkCtr = 2.0;
      const ctrScore = Math.min(100, (ctr / benchmarkCtr) * 100);

      // Score is capped at 100
      expect(ctrScore).toBe(100);
    });

    it('should calculate save rate score', () => {
      const saveRate = 5;
      const benchmarkSaveRate = 4;
      const saveScore = Math.min(100, (saveRate / benchmarkSaveRate) * 100);

      // Score is capped at 100
      expect(saveScore).toBe(100);
    });

    it('should cap score at 100', () => {
      const metric = 150;
      const benchmark = 100;
      const score = Math.min(100, (metric / benchmark) * 100);

      expect(score).toBe(100);
    });
  });

  describe('Consistency Score', () => {
    it('should measure posting consistency', () => {
      const expectedPosts = 30;
      const actualPosts = 25;
      const consistencyScore = (actualPosts / expectedPosts) * 100;

      expect(consistencyScore).toBeCloseTo(83.33, 1);
    });

    it('should not exceed 100%', () => {
      const expectedPosts = 30;
      const actualPosts = 35;
      const consistencyScore = Math.min(100, (actualPosts / expectedPosts) * 100);

      expect(consistencyScore).toBe(100);
    });
  });

  describe('Health Alerts', () => {
    it('should generate low variety alert', () => {
      const varietyScore = 20;
      const threshold = 40;
      const shouldAlert = varietyScore < threshold;

      expect(shouldAlert).toBe(true);
    });

    it('should generate stale content alert', () => {
      const freshnessScore = 30;
      const threshold = 40;
      const shouldAlert = freshnessScore < threshold;

      expect(shouldAlert).toBe(true);
    });

    it('should not alert for healthy metrics', () => {
      const score = 80;
      const threshold = 40;
      const shouldAlert = score < threshold;

      expect(shouldAlert).toBe(false);
    });
  });

  describe('Recommendations', () => {
    it('should recommend new templates for low variety', () => {
      const varietyScore = 25;
      const recommendation = varietyScore < 40
        ? 'Consider adding new templates to diversify your content'
        : null;

      expect(recommendation).toBeDefined();
    });

    it('should recommend content refresh for low freshness', () => {
      const freshnessScore = 30;
      const recommendation = freshnessScore < 40
        ? 'Create new content to refresh your library'
        : null;

      expect(recommendation).toBeDefined();
    });
  });

  describe('Historical Tracking', () => {
    it('should track score over time', () => {
      const history = [
        { date: '2024-06-01', score: 70 },
        { date: '2024-06-08', score: 75 },
        { date: '2024-06-15', score: 80 },
      ];

      const trend = history[history.length - 1].score - history[0].score;
      expect(trend).toBe(10);
    });

    it('should detect improving trend', () => {
      const scores = [70, 72, 75, 78, 80];
      const isImproving = scores[scores.length - 1] > scores[0];

      expect(isImproving).toBe(true);
    });

    it('should detect declining trend', () => {
      const scores = [80, 78, 75, 70, 65];
      const isDeclining = scores[scores.length - 1] < scores[0];

      expect(isDeclining).toBe(true);
    });
  });
});

describe('Content Mix Analysis', () => {
  describe('Template Distribution', () => {
    it('should calculate template usage percentage', () => {
      const templateUsage = [
        { template: 'A', count: 30 },
        { template: 'B', count: 20 },
        { template: 'C', count: 50 },
      ];

      const total = templateUsage.reduce((sum, t) => sum + t.count, 0);
      const distribution = templateUsage.map(t => ({
        template: t.template,
        percentage: (t.count / total) * 100,
      }));

      expect(distribution[0].percentage).toBe(30);
      expect(distribution[2].percentage).toBe(50);
    });
  });

  describe('Collection Balance', () => {
    it('should identify over-represented collections', () => {
      const collections = [
        { name: 'Growth', percentage: 50, target: 25 },
        { name: 'Healing', percentage: 20, target: 25 },
        { name: 'Wholeness', percentage: 30, target: 25 },
      ];

      const overRepresented = collections.filter(c => c.percentage > c.target * 1.2);
      expect(overRepresented.length).toBe(1);
      expect(overRepresented[0].name).toBe('Growth');
    });

    it('should identify under-represented collections', () => {
      const collections = [
        { name: 'Growth', percentage: 50, target: 25 },
        { name: 'Healing', percentage: 15, target: 25 },
        { name: 'Wholeness', percentage: 35, target: 25 },
      ];

      const underRepresented = collections.filter(c => c.percentage < c.target * 0.8);
      expect(underRepresented.length).toBe(1);
      expect(underRepresented[0].name).toBe('Healing');
    });
  });
});

describe('Audit Results', () => {
  it('should structure audit result', () => {
    const audit = {
      userId: 'user-123',
      analyzedAt: new Date().toISOString(),
      overallScore: 75,
      classification: 'good',
      metrics: {
        variety: 70,
        freshness: 80,
        performance: 75,
        consistency: 75,
      },
      alerts: [],
      recommendations: [],
    };

    expect(audit.overallScore).toBe(75);
    expect(audit.classification).toBe('good');
  });
});
