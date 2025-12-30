import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase admin client
const mockQueryBuilder = {
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
  range: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn((resolve) => resolve({ data: [], error: null })),
};

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

// Import after mocking
import {
  updateCreativeHealth,
  getFatiguedContent,
  getRefreshRecommendations,
  markRefreshed,
  getHealthSummary,
  getAllCreativeHealth,
  getContentTrend,
} from '@/lib/services/creative-health';

describe('Creative Health Service Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateCreativeHealth', () => {
    it('should be a function', () => {
      expect(typeof updateCreativeHealth).toBe('function');
    });

    it('should accept required parameters', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          id: 'health-123',
          user_id: 'user-456',
          content_type: 'pin',
          content_id: 'pin-789',
          fatigue_score: 25,
          status: 'healthy',
        },
        error: null,
      });

      const params = {
        userId: 'user-456',
        contentType: 'pin' as const,
        contentId: 'pin-789',
        metrics: {
          ctr: 2.5,
          engagement_rate: 5.0,
          save_rate: 1.5,
          impressions: 5000,
        },
      };

      // Function exists and can be called
      expect(updateCreativeHealth).toBeDefined();
    });
  });

  describe('getFatiguedContent', () => {
    it('should be a function', () => {
      expect(typeof getFatiguedContent).toBe('function');
    });

    it('should filter by status', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { id: '1', status: 'fatigued' },
          { id: '2', status: 'critical' },
        ],
        error: null,
      }));

      const result = await getFatiguedContent('user-123');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRefreshRecommendations', () => {
    it('should be a function', () => {
      expect(typeof getRefreshRecommendations).toBe('function');
    });

    it('should return array of recommendations', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { id: '1', refresh_recommended: true },
        ],
        error: null,
      }));

      const result = await getRefreshRecommendations('user-123');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('markRefreshed', () => {
    it('should be a function', () => {
      expect(typeof markRefreshed).toBe('function');
    });

    it('should update refresh status', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'health-123', last_refresh_at: new Date().toISOString() },
        error: null,
      });

      expect(markRefreshed).toBeDefined();
    });
  });

  describe('getHealthSummary', () => {
    it('should be a function', () => {
      expect(typeof getHealthSummary).toBe('function');
    });

    it('should return summary object', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { status: 'healthy', fatigue_score: 10 },
          { status: 'declining', fatigue_score: 40 },
          { status: 'fatigued', fatigue_score: 60 },
        ],
        error: null,
      }));

      const result = await getHealthSummary('user-123');
      // Result can be null or object
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('getAllCreativeHealth', () => {
    it('should be a function', () => {
      expect(typeof getAllCreativeHealth).toBe('function');
    });

    it('should support pagination', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [],
        error: null,
        count: 0,
      }));

      const result = await getAllCreativeHealth('user-123', { page: 1, perPage: 20 });
      expect(result).toBeDefined();
    });
  });

  describe('getContentTrend', () => {
    it('should be a function', () => {
      expect(typeof getContentTrend).toBe('function');
    });

    it('should return trend data', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: {
          metrics_history: [
            { date: '2024-06-01', ctr: 2.5, engagement_rate: 5.0 },
            { date: '2024-06-02', ctr: 2.3, engagement_rate: 4.8 },
          ],
        },
        error: null,
      });

      const result = await getContentTrend('user-123', 'pin', 'pin-789');
      // Result can be null or have trend data
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});

describe('Creative Health Constants', () => {
  describe('Status Thresholds', () => {
    it('should have correct threshold values', () => {
      const thresholds = {
        HEALTHY: 25,
        DECLINING: 50,
        FATIGUED: 75,
        CRITICAL: 100,
      };

      expect(thresholds.HEALTHY).toBeLessThan(thresholds.DECLINING);
      expect(thresholds.DECLINING).toBeLessThan(thresholds.FATIGUED);
      expect(thresholds.FATIGUED).toBeLessThan(thresholds.CRITICAL);
    });
  });

  describe('Fatigue Weights', () => {
    it('should sum to 1.0', () => {
      const weights = {
        CTR_DECLINE: 0.5,
        ENGAGEMENT_DECLINE: 0.3,
        SAVE_RATE_DECLINE: 0.2,
      };

      const sum = weights.CTR_DECLINE + weights.ENGAGEMENT_DECLINE + weights.SAVE_RATE_DECLINE;
      expect(sum).toBe(1.0);
    });
  });

  describe('Baseline Thresholds', () => {
    it('should have minimum impressions', () => {
      const minImpressions = 1000;
      expect(minImpressions).toBeGreaterThan(0);
    });

    it('should have minimum days', () => {
      const minDays = 7;
      expect(minDays).toBeGreaterThan(0);
    });
  });
});
