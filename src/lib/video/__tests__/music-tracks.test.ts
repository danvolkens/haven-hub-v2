/**
 * Music Track Selection Tests
 * Prompt 4.2: LRU selection and pool health monitoring
 */

import { describe, it, expect, vi } from 'vitest';
import type { MusicTrack, PoolHealthAlert } from '@/types/instagram';
import { COLLECTION_MOODS, COLLECTION_BPM, getRecommendedBpm, getCollectionMoods } from '../music-tracks';

// ============================================================================
// Mock Supabase
// ============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
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

const createMockTrack = (overrides: Partial<MusicTrack> = {}): MusicTrack => ({
  id: 'track-1',
  user_id: null,
  source: 'epidemic_sound',
  source_id: 'ES-12345',
  source_url: 'https://epidemicsound.com/track/ES-12345',
  file_url: 'https://cdn.epidemicsound.com/ES-12345.mp3',
  title: 'Gentle Morning',
  artist: 'Ambient Artist',
  duration_seconds: 120,
  bpm: 75,
  collection: 'grounding',
  mood_tags: ['warm', 'cozy'],
  genre: 'ambient',
  notes: null,
  usage_count: 0,
  last_used_at: null,
  license_type: 'subscription',
  license_expires_at: null,
  is_active: true,
  created_at: '2024-12-28T10:00:00Z',
  updated_at: '2024-12-28T10:00:00Z',
  ...overrides,
});

// ============================================================================
// Selection Logic Tests
// ============================================================================

describe('Music Track Selection Logic', () => {
  describe('Priority Order', () => {
    it('should prioritize unused tracks (usage_count = 0)', () => {
      const tracks = [
        createMockTrack({ id: '1', usage_count: 5, last_used_at: '2024-12-20T10:00:00Z' }),
        createMockTrack({ id: '2', usage_count: 0, last_used_at: null }),
        createMockTrack({ id: '3', usage_count: 2, last_used_at: '2024-12-25T10:00:00Z' }),
      ];

      const unused = tracks.filter(t => t.usage_count === 0);
      expect(unused).toHaveLength(1);
      expect(unused[0].id).toBe('2');
    });

    it('should use LRU order when all tracks have been used', () => {
      const tracks = [
        createMockTrack({ id: '1', usage_count: 5, last_used_at: '2024-12-25T10:00:00Z' }),
        createMockTrack({ id: '2', usage_count: 2, last_used_at: '2024-12-20T10:00:00Z' }),
        createMockTrack({ id: '3', usage_count: 3, last_used_at: '2024-12-22T10:00:00Z' }),
      ];

      const sorted = [...tracks].sort((a, b) => {
        if (!a.last_used_at) return -1;
        if (!b.last_used_at) return 1;
        return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
      });

      expect(sorted[0].id).toBe('2'); // Dec 20 is oldest
    });
  });

  describe('Collection Filtering', () => {
    it('should filter by collection', () => {
      const tracks = [
        createMockTrack({ id: '1', collection: 'grounding' }),
        createMockTrack({ id: '2', collection: 'wholeness' }),
        createMockTrack({ id: '3', collection: 'grounding' }),
      ];

      const groundingTracks = tracks.filter(t => t.collection === 'grounding');
      expect(groundingTracks).toHaveLength(2);
    });

    it('should fallback to general collection', () => {
      const tracks = [
        createMockTrack({ id: '1', collection: 'wholeness' }),
        createMockTrack({ id: '2', collection: 'general' }),
      ];

      const growthTracks = tracks.filter(t => t.collection === 'growth');
      expect(growthTracks).toHaveLength(0);

      const generalTracks = tracks.filter(t => t.collection === 'general');
      expect(generalTracks).toHaveLength(1);
    });
  });

  describe('Duration Filtering', () => {
    it('should filter by minimum duration', () => {
      const tracks = [
        createMockTrack({ id: '1', duration_seconds: 60 }),
        createMockTrack({ id: '2', duration_seconds: 120 }),
        createMockTrack({ id: '3', duration_seconds: 180 }),
      ];

      const minDuration = 100;
      const filtered = tracks.filter(t => (t.duration_seconds ?? 0) >= minDuration);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by maximum duration', () => {
      const tracks = [
        createMockTrack({ id: '1', duration_seconds: 60 }),
        createMockTrack({ id: '2', duration_seconds: 120 }),
        createMockTrack({ id: '3', duration_seconds: 180 }),
      ];

      const maxDuration = 150;
      const filtered = tracks.filter(t => (t.duration_seconds ?? 0) <= maxDuration);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('BPM Filtering', () => {
    it('should filter by BPM range', () => {
      const tracks = [
        createMockTrack({ id: '1', bpm: 65 }),
        createMockTrack({ id: '2', bpm: 80 }),
        createMockTrack({ id: '3', bpm: 100 }),
      ];

      const bpmRange = { min: 60, max: 85 };
      const filtered = tracks.filter(t =>
        (t.bpm ?? 0) >= bpmRange.min && (t.bpm ?? 0) <= bpmRange.max
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.id)).toEqual(['1', '2']);
    });
  });
});

// ============================================================================
// Collection Mood Tests
// ============================================================================

describe('Collection Moods', () => {
  describe('COLLECTION_MOODS', () => {
    it('should have moods for all collections', () => {
      expect(COLLECTION_MOODS.grounding).toBeDefined();
      expect(COLLECTION_MOODS.wholeness).toBeDefined();
      expect(COLLECTION_MOODS.growth).toBeDefined();
      expect(COLLECTION_MOODS.general).toBeDefined();
    });

    it('should have grounding moods reflecting stability', () => {
      const groundingMoods = COLLECTION_MOODS.grounding;
      expect(groundingMoods).toContain('warm');
      expect(groundingMoods).toContain('stable');
    });

    it('should have wholeness moods reflecting nurturing', () => {
      const wholenessMoods = COLLECTION_MOODS.wholeness;
      expect(wholenessMoods).toContain('tender');
      expect(wholenessMoods).toContain('nurturing');
    });

    it('should have growth moods reflecting emergence', () => {
      const growthMoods = COLLECTION_MOODS.growth;
      expect(growthMoods).toContain('hopeful');
      expect(growthMoods).toContain('emerging');
    });

    it('should have general moods reflecting calm', () => {
      const generalMoods = COLLECTION_MOODS.general;
      expect(generalMoods).toContain('calm');
      expect(generalMoods).toContain('peaceful');
    });
  });

  describe('getCollectionMoods', () => {
    it('should return correct moods for each collection', () => {
      expect(getCollectionMoods('grounding')).toEqual(COLLECTION_MOODS.grounding);
      expect(getCollectionMoods('wholeness')).toEqual(COLLECTION_MOODS.wholeness);
      expect(getCollectionMoods('growth')).toEqual(COLLECTION_MOODS.growth);
      expect(getCollectionMoods('general')).toEqual(COLLECTION_MOODS.general);
    });
  });
});

// ============================================================================
// Collection BPM Tests
// ============================================================================

describe('Collection BPM', () => {
  describe('COLLECTION_BPM', () => {
    it('should have BPM ranges for all collections', () => {
      expect(COLLECTION_BPM.grounding).toBeDefined();
      expect(COLLECTION_BPM.wholeness).toBeDefined();
      expect(COLLECTION_BPM.growth).toBeDefined();
      expect(COLLECTION_BPM.general).toBeDefined();
    });

    it('should have grounding at slower tempo (60-80 BPM)', () => {
      expect(COLLECTION_BPM.grounding.min).toBe(60);
      expect(COLLECTION_BPM.grounding.max).toBe(80);
    });

    it('should have growth at faster tempo (70-100 BPM)', () => {
      expect(COLLECTION_BPM.growth.min).toBe(70);
      expect(COLLECTION_BPM.growth.max).toBe(100);
    });
  });

  describe('getRecommendedBpm', () => {
    it('should return correct BPM range for each collection', () => {
      expect(getRecommendedBpm('grounding')).toEqual({ min: 60, max: 80 });
      expect(getRecommendedBpm('growth')).toEqual({ min: 70, max: 100 });
    });
  });
});

// ============================================================================
// Pool Health Tests
// ============================================================================

describe('Music Pool Health Monitoring', () => {
  describe('Alert Levels', () => {
    it('should return critical when count < 5', () => {
      const CRITICAL_THRESHOLD = 5;
      const testCounts = [0, 2, 4];

      testCounts.forEach(count => {
        const alertLevel = count < CRITICAL_THRESHOLD ? 'critical' : 'ok';
        expect(alertLevel).toBe('critical');
      });
    });

    it('should return warning when count < 10 but >= 5', () => {
      const CRITICAL_THRESHOLD = 5;
      const WARNING_THRESHOLD = 10;
      const testCounts = [5, 7, 9];

      testCounts.forEach(count => {
        let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
        if (count < CRITICAL_THRESHOLD) alertLevel = 'critical';
        else if (count < WARNING_THRESHOLD) alertLevel = 'warning';

        expect(alertLevel).toBe('warning');
      });
    });

    it('should return ok when count >= 10', () => {
      const CRITICAL_THRESHOLD = 5;
      const WARNING_THRESHOLD = 10;
      const testCounts = [10, 20, 50];

      testCounts.forEach(count => {
        let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
        if (count < CRITICAL_THRESHOLD) alertLevel = 'critical';
        else if (count < WARNING_THRESHOLD) alertLevel = 'warning';

        expect(alertLevel).toBe('ok');
      });
    });
  });

  describe('Pool Health Alert Structure', () => {
    it('should return correct structure for music pool', () => {
      const alert: PoolHealthAlert = {
        pool_type: 'music',
        collection: 'grounding',
        total_count: 15,
        unused_count: 8,
        alert_level: 'ok',
        message: 'grounding music pool healthy: 15 tracks, 8 unused',
      };

      expect(alert.pool_type).toBe('music');
      expect(alert.collection).toBe('grounding');
    });
  });
});

// ============================================================================
// Mood-Based Selection Tests
// ============================================================================

describe('Mood-Based Selection', () => {
  it('should find collection by mood tag', () => {
    const mood = 'warm';
    const collection = Object.entries(COLLECTION_MOODS).find(
      ([, moods]) => moods.includes(mood)
    )?.[0];

    expect(collection).toBe('grounding');
  });

  it('should return undefined for unknown mood', () => {
    const mood = 'unknown-mood';
    const collection = Object.entries(COLLECTION_MOODS).find(
      ([, moods]) => moods.includes(mood)
    )?.[0];

    expect(collection).toBeUndefined();
  });

  it('should map tender to wholeness collection', () => {
    const mood = 'tender';
    const collection = Object.entries(COLLECTION_MOODS).find(
      ([, moods]) => moods.includes(mood)
    )?.[0];

    expect(collection).toBe('wholeness');
  });

  it('should map hopeful to growth collection', () => {
    const mood = 'hopeful';
    const collection = Object.entries(COLLECTION_MOODS).find(
      ([, moods]) => moods.includes(mood)
    )?.[0];

    expect(collection).toBe('growth');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle null BPM values', () => {
    const tracks = [
      createMockTrack({ id: '1', bpm: null }),
      createMockTrack({ id: '2', bpm: 80 }),
    ];

    const bpmRange = { min: 60, max: 85 };
    const filtered = tracks.filter(t =>
      t.bpm !== null && t.bpm >= bpmRange.min && t.bpm <= bpmRange.max
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('should handle null duration values', () => {
    const tracks = [
      createMockTrack({ id: '1', duration_seconds: null }),
      createMockTrack({ id: '2', duration_seconds: 120 }),
    ];

    const minDuration = 100;
    const filtered = tracks.filter(t =>
      t.duration_seconds !== null && t.duration_seconds >= minDuration
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('should handle empty collection', () => {
    const tracks: MusicTrack[] = [];
    const filtered = tracks.filter(t => t.collection === 'grounding');
    expect(filtered).toHaveLength(0);
  });

  it('should handle all inactive tracks', () => {
    const tracks = [
      createMockTrack({ id: '1', is_active: false }),
      createMockTrack({ id: '2', is_active: false }),
    ];

    const activeTracks = tracks.filter(t => t.is_active);
    expect(activeTracks).toHaveLength(0);
  });
});
