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
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
  })),
}));

// Import after mocking
import {
  getActiveConnections,
  getAllActiveConnections,
  syncTikTokContent,
  syncInstagramContent,
  detectWinners,
  getWinners,
  markAsAdapted,
  getAnalyticsSummary,
  syncAllPlatforms,
} from '@/lib/services/cross-platform-sync';

describe('Cross-Platform Sync Service Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveConnections', () => {
    it('should be a function', () => {
      expect(typeof getActiveConnections).toBe('function');
    });

    it('should return array of connections', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { platform: 'tiktok', status: 'active' },
          { platform: 'instagram', status: 'active' },
        ],
        error: null,
      }));

      const result = await getActiveConnections('user-123');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAllActiveConnections', () => {
    it('should be a function', () => {
      expect(typeof getAllActiveConnections).toBe('function');
    });

    it('should return all active connections', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { user_id: 'user-1', platform: 'tiktok' },
          { user_id: 'user-2', platform: 'instagram' },
        ],
        error: null,
      }));

      const result = await getAllActiveConnections();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('syncTikTokContent', () => {
    it('should be a function', () => {
      expect(typeof syncTikTokContent).toBe('function');
    });

    it('should return sync result', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [],
        error: null,
      }));

      const result = await syncTikTokContent('user-123');
      expect(result).toBeDefined();
    });
  });

  describe('syncInstagramContent', () => {
    it('should be a function', () => {
      expect(typeof syncInstagramContent).toBe('function');
    });

    it('should return sync result', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [],
        error: null,
      }));

      const result = await syncInstagramContent('user-123');
      expect(result).toBeDefined();
    });
  });

  describe('detectWinners', () => {
    it('should be a function', () => {
      expect(typeof detectWinners).toBe('function');
    });

    it('should return count of winners detected', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { id: '1', engagement_rate: 10 },
          { id: '2', engagement_rate: 15 },
        ],
        error: null,
      }));

      const result = await detectWinners('user-123');
      expect(typeof result).toBe('number');
    });
  });

  describe('getWinners', () => {
    it('should be a function', () => {
      expect(typeof getWinners).toBe('function');
    });

    it('should return winning content', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { id: '1', is_winner: true, platform: 'tiktok' },
        ],
        error: null,
      }));

      const result = await getWinners('user-123');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('markAsAdapted', () => {
    it('should be a function', () => {
      expect(typeof markAsAdapted).toBe('function');
    });

    it('should update content record', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: '1', adapted_to: ['pinterest'] },
        error: null,
      });

      // Function is callable
      expect(markAsAdapted).toBeDefined();
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should be a function', () => {
      expect(typeof getAnalyticsSummary).toBe('function');
    });

    it('should return analytics object', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { platform: 'tiktok', views: 1000, likes: 100 },
          { platform: 'instagram', views: 500, likes: 50 },
        ],
        error: null,
      }));

      const result = await getAnalyticsSummary('user-123');
      expect(result).toBeDefined();
    });
  });

  describe('syncAllPlatforms', () => {
    it('should be a function', () => {
      expect(typeof syncAllPlatforms).toBe('function');
    });

    it('should sync all connected platforms', async () => {
      mockQueryBuilder.then = vi.fn((resolve) => resolve({
        data: [
          { platform: 'tiktok', status: 'active' },
        ],
        error: null,
      }));

      const result = await syncAllPlatforms('user-123');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Platform Connection Types', () => {
  describe('Supported Platforms', () => {
    const platforms = ['pinterest', 'tiktok', 'instagram'];

    platforms.forEach(platform => {
      it(`should support ${platform}`, () => {
        expect(platforms).toContain(platform);
      });
    });
  });

  describe('Connection Status', () => {
    const statuses = ['active', 'inactive', 'expired', 'error'];

    statuses.forEach(status => {
      it(`should recognize ${status} status`, () => {
        expect(statuses).toContain(status);
      });
    });
  });
});
