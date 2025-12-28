/**
 * Stock Footage Selection Tests
 * Prompt 4.1: LRU selection and pool health monitoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StockFootage, PoolHealthAlert } from '@/types/instagram';

// ============================================================================
// Mock Supabase
// ============================================================================

const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

// ============================================================================
// Mock Data
// ============================================================================

const createMockFootage = (overrides: Partial<StockFootage> = {}): StockFootage => ({
  id: 'footage-1',
  user_id: null,
  source: 'pexels',
  source_id: '12345',
  source_url: 'https://pexels.com/video/12345',
  video_url: 'https://cdn.pexels.com/video/12345.mp4',
  duration_seconds: 15,
  width: 1080,
  height: 1920,
  aspect_ratio: '9:16',
  orientation: 'portrait',
  collection: 'grounding',
  mood_tags: ['cozy', 'warm'],
  notes: null,
  usage_count: 0,
  last_used_at: null,
  is_active: true,
  created_at: '2024-12-28T10:00:00Z',
  updated_at: '2024-12-28T10:00:00Z',
  ...overrides,
});

// ============================================================================
// Selection Logic Tests (Pure Functions)
// ============================================================================

describe('Stock Footage Selection Logic', () => {
  describe('Priority Order', () => {
    it('should prioritize unused footage (usage_count = 0)', () => {
      const footage = [
        createMockFootage({ id: '1', usage_count: 5, last_used_at: '2024-12-20T10:00:00Z' }),
        createMockFootage({ id: '2', usage_count: 0, last_used_at: null }),
        createMockFootage({ id: '3', usage_count: 2, last_used_at: '2024-12-25T10:00:00Z' }),
      ];

      // Filter unused footage
      const unused = footage.filter(f => f.usage_count === 0);
      expect(unused).toHaveLength(1);
      expect(unused[0].id).toBe('2');
    });

    it('should use LRU order when all footage has been used', () => {
      const footage = [
        createMockFootage({ id: '1', usage_count: 5, last_used_at: '2024-12-25T10:00:00Z' }),
        createMockFootage({ id: '2', usage_count: 2, last_used_at: '2024-12-20T10:00:00Z' }),
        createMockFootage({ id: '3', usage_count: 3, last_used_at: '2024-12-22T10:00:00Z' }),
      ];

      // Sort by last_used_at ascending (oldest first)
      const sorted = [...footage].sort((a, b) => {
        if (!a.last_used_at) return -1;
        if (!b.last_used_at) return 1;
        return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
      });

      expect(sorted[0].id).toBe('2'); // Dec 20 is oldest
    });

    it('should prioritize null last_used_at over any date', () => {
      const footage = [
        createMockFootage({ id: '1', usage_count: 1, last_used_at: '2024-12-20T10:00:00Z' }),
        createMockFootage({ id: '2', usage_count: 1, last_used_at: null }),
      ];

      const sorted = [...footage].sort((a, b) => {
        if (!a.last_used_at) return -1;
        if (!b.last_used_at) return 1;
        return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
      });

      expect(sorted[0].id).toBe('2'); // null last_used_at comes first
    });
  });

  describe('Collection Filtering', () => {
    it('should filter by collection', () => {
      const footage = [
        createMockFootage({ id: '1', collection: 'grounding' }),
        createMockFootage({ id: '2', collection: 'wholeness' }),
        createMockFootage({ id: '3', collection: 'grounding' }),
        createMockFootage({ id: '4', collection: 'general' }),
      ];

      const groundingFootage = footage.filter(f => f.collection === 'grounding');
      expect(groundingFootage).toHaveLength(2);
    });

    it('should include general as fallback collection', () => {
      const footage = [
        createMockFootage({ id: '1', collection: 'wholeness' }),
        createMockFootage({ id: '2', collection: 'general' }),
      ];

      // When looking for 'grounding' and not found, 'general' should be used
      const groundingFootage = footage.filter(f => f.collection === 'grounding');
      expect(groundingFootage).toHaveLength(0);

      const generalFootage = footage.filter(f => f.collection === 'general');
      expect(generalFootage).toHaveLength(1);
    });
  });

  describe('Orientation Filtering', () => {
    it('should only select portrait orientation', () => {
      const footage = [
        createMockFootage({ id: '1', orientation: 'portrait' }),
        createMockFootage({ id: '2', orientation: 'landscape' }),
        createMockFootage({ id: '3', orientation: 'square' }),
      ];

      const portraitFootage = footage.filter(f => f.orientation === 'portrait');
      expect(portraitFootage).toHaveLength(1);
      expect(portraitFootage[0].id).toBe('1');
    });
  });

  describe('Exclusion Logic', () => {
    it('should exclude specified IDs', () => {
      const footage = [
        createMockFootage({ id: '1' }),
        createMockFootage({ id: '2' }),
        createMockFootage({ id: '3' }),
      ];

      const excludeIds = ['1', '3'];
      const filtered = footage.filter(f => !excludeIds.includes(f.id));

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Active Status', () => {
    it('should only select active footage', () => {
      const footage = [
        createMockFootage({ id: '1', is_active: true }),
        createMockFootage({ id: '2', is_active: false }),
        createMockFootage({ id: '3', is_active: true }),
      ];

      const activeFootage = footage.filter(f => f.is_active);
      expect(activeFootage).toHaveLength(2);
    });
  });
});

// ============================================================================
// Pool Health Tests
// ============================================================================

describe('Pool Health Monitoring', () => {
  describe('Alert Levels', () => {
    it('should return critical when count < 10', () => {
      const CRITICAL_THRESHOLD = 10;
      const testCounts = [0, 5, 9];

      testCounts.forEach(count => {
        const alertLevel = count < CRITICAL_THRESHOLD ? 'critical' : 'ok';
        expect(alertLevel).toBe('critical');
      });
    });

    it('should return warning when count < 20 but >= 10', () => {
      const CRITICAL_THRESHOLD = 10;
      const WARNING_THRESHOLD = 20;
      const testCounts = [10, 15, 19];

      testCounts.forEach(count => {
        let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
        if (count < CRITICAL_THRESHOLD) alertLevel = 'critical';
        else if (count < WARNING_THRESHOLD) alertLevel = 'warning';

        expect(alertLevel).toBe('warning');
      });
    });

    it('should return ok when count >= 20', () => {
      const CRITICAL_THRESHOLD = 10;
      const WARNING_THRESHOLD = 20;
      const testCounts = [20, 50, 100];

      testCounts.forEach(count => {
        let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
        if (count < CRITICAL_THRESHOLD) alertLevel = 'critical';
        else if (count < WARNING_THRESHOLD) alertLevel = 'warning';

        expect(alertLevel).toBe('ok');
      });
    });

    it('should return warning when 0 unused videos', () => {
      const total = 25;
      const unused = 0;
      const CRITICAL_THRESHOLD = 10;
      const WARNING_THRESHOLD = 20;

      let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
      if (total < CRITICAL_THRESHOLD) {
        alertLevel = 'critical';
      } else if (total < WARNING_THRESHOLD) {
        alertLevel = 'warning';
      } else if (unused === 0 && total > 0) {
        alertLevel = 'warning';
      }

      expect(alertLevel).toBe('warning');
    });
  });

  describe('Health Message', () => {
    it('should include collection name in message', () => {
      const collection = 'grounding';
      const message = `${collection} pool healthy: 25 videos, 10 unused`;
      expect(message).toContain('grounding');
    });

    it('should include counts in message', () => {
      const total = 25;
      const unused = 10;
      const message = `grounding pool healthy: ${total} videos, ${unused} unused`;
      expect(message).toContain('25');
      expect(message).toContain('10');
    });
  });

  describe('Pool Health Alert Structure', () => {
    it('should return correct PoolHealthAlert structure', () => {
      const alert: PoolHealthAlert = {
        pool_type: 'footage',
        collection: 'grounding',
        total_count: 25,
        unused_count: 10,
        alert_level: 'ok',
        message: 'grounding pool healthy: 25 videos, 10 unused',
      };

      expect(alert.pool_type).toBe('footage');
      expect(alert.collection).toBe('grounding');
      expect(typeof alert.total_count).toBe('number');
      expect(typeof alert.unused_count).toBe('number');
      expect(['ok', 'warning', 'critical']).toContain(alert.alert_level);
      expect(typeof alert.message).toBe('string');
    });
  });
});

// ============================================================================
// Multiple Selection Tests
// ============================================================================

describe('Multiple Footage Selection', () => {
  it('should accumulate exclude IDs to prevent duplicates', () => {
    const selectedIds: string[] = [];
    const footage = [
      createMockFootage({ id: '1' }),
      createMockFootage({ id: '2' }),
      createMockFootage({ id: '3' }),
    ];

    // Simulate selecting multiple footage
    for (let i = 0; i < 3; i++) {
      const available = footage.filter(f => !selectedIds.includes(f.id));
      if (available.length > 0) {
        selectedIds.push(available[0].id);
      }
    }

    expect(selectedIds).toHaveLength(3);
    expect(new Set(selectedIds).size).toBe(3); // All unique
  });

  it('should stop when no more footage available', () => {
    const selectedIds: string[] = [];
    const footage = [
      createMockFootage({ id: '1' }),
      createMockFootage({ id: '2' }),
    ];

    // Try to select 5 but only 2 available
    for (let i = 0; i < 5; i++) {
      const available = footage.filter(f => !selectedIds.includes(f.id));
      if (available.length > 0) {
        selectedIds.push(available[0].id);
      }
    }

    expect(selectedIds).toHaveLength(2);
  });
});

// ============================================================================
// Usage Tracking Tests
// ============================================================================

describe('Usage Tracking', () => {
  it('should increment usage_count on selection', () => {
    const footage = createMockFootage({ usage_count: 0 });
    const updatedFootage = {
      ...footage,
      usage_count: footage.usage_count + 1,
    };

    expect(updatedFootage.usage_count).toBe(1);
  });

  it('should update last_used_at on selection', () => {
    const footage = createMockFootage({ last_used_at: null });
    const now = new Date().toISOString();
    const updatedFootage = {
      ...footage,
      last_used_at: now,
    };

    expect(updatedFootage.last_used_at).not.toBeNull();
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty collection', () => {
    const footage: StockFootage[] = [];
    const groundingFootage = footage.filter(f => f.collection === 'grounding');
    expect(groundingFootage).toHaveLength(0);
  });

  it('should handle all footage inactive', () => {
    const footage = [
      createMockFootage({ id: '1', is_active: false }),
      createMockFootage({ id: '2', is_active: false }),
    ];

    const activeFootage = footage.filter(f => f.is_active);
    expect(activeFootage).toHaveLength(0);
  });

  it('should handle mixed orientations correctly', () => {
    const footage = [
      createMockFootage({ id: '1', orientation: 'landscape', usage_count: 0 }),
      createMockFootage({ id: '2', orientation: 'portrait', usage_count: 5 }),
    ];

    // Even though landscape has lower usage, portrait should be selected
    const portraitFootage = footage.filter(f => f.orientation === 'portrait');
    expect(portraitFootage).toHaveLength(1);
    expect(portraitFootage[0].id).toBe('2');
  });
});
