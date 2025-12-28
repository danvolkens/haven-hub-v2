/**
 * Music Track Selection Service
 * Prompt 4.2: Smart LRU-based music selection with mood matching
 */

import { createClient } from '@/lib/supabase/server';
import type { MusicTrack, Collection, PoolHealthAlert } from '@/types/instagram';

// ============================================================================
// Configuration
// ============================================================================

const POOL_THRESHOLDS = {
  CRITICAL: 5,
  WARNING: 10,
};

const COLLECTIONS: Collection[] = ['grounding', 'wholeness', 'growth', 'general'];

/**
 * Mood tags associated with each collection
 * Used for filtering when specific mood is desired
 */
export const COLLECTION_MOODS: Record<Collection, string[]> = {
  grounding: ['warm', 'stable', 'anchoring', 'cozy', 'safe'],
  wholeness: ['tender', 'nurturing', 'gentle', 'soft', 'compassionate'],
  growth: ['hopeful', 'emerging', 'building', 'fresh', 'uplifting'],
  general: ['calm', 'sanctuary', 'neutral', 'peaceful', 'ambient'],
};

/**
 * Recommended BPM ranges by collection
 */
export const COLLECTION_BPM: Record<Collection, { min: number; max: number }> = {
  grounding: { min: 60, max: 80 },
  wholeness: { min: 65, max: 85 },
  growth: { min: 70, max: 100 },
  general: { min: 60, max: 90 },
};

// ============================================================================
// Types
// ============================================================================

export interface SelectMusicOptions {
  excludeIds?: string[];
  minDuration?: number;
  maxDuration?: number;
  targetBpm?: { min: number; max: number };
}

// ============================================================================
// Main Selection Function
// ============================================================================

/**
 * Select music track using LRU algorithm with collection matching
 *
 * Priority:
 * 1. Unused tracks in requested collection (usage_count = 0)
 * 2. Least recently used in requested collection
 * 3. If no tracks in collection, fallback to 'general'
 */
export async function selectMusic(
  collection: Collection,
  options: SelectMusicOptions = {}
): Promise<MusicTrack | null> {
  const supabase = await createClient();
  const { excludeIds = [] } = options;

  // First try to select from the requested collection
  let track = await selectFromCollection(supabase, collection, excludeIds, options);

  // If no track found and not already trying general, fallback to general
  if (!track && collection !== 'general') {
    track = await selectFromCollection(supabase, 'general', excludeIds, options);
  }

  // Update usage tracking if track was selected
  if (track) {
    await updateUsageTracking(supabase, track.id);
  }

  return track;
}

/**
 * Select track from a specific collection
 */
async function selectFromCollection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  collection: Collection,
  excludeIds: string[],
  options: SelectMusicOptions
): Promise<MusicTrack | null> {
  const { minDuration, maxDuration, targetBpm } = options;

  // Build query for unused tracks first (priority)
  let query = supabase
    .from('music_tracks')
    .select('*')
    .eq('collection', collection)
    .eq('is_active', true)
    .eq('usage_count', 0)
    .order('created_at', { ascending: true })
    .limit(1);

  // Apply optional filters
  if (minDuration) {
    query = query.gte('duration_seconds', minDuration);
  }
  if (maxDuration) {
    query = query.lte('duration_seconds', maxDuration);
  }
  if (targetBpm) {
    query = query.gte('bpm', targetBpm.min).lte('bpm', targetBpm.max);
  }

  // Exclude specific IDs
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: unusedTracks } = await query;

  if (unusedTracks && unusedTracks.length > 0) {
    return unusedTracks[0] as MusicTrack;
  }

  // If no unused tracks, get least recently used
  let lruQuery = supabase
    .from('music_tracks')
    .select('*')
    .eq('collection', collection)
    .eq('is_active', true)
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(1);

  if (minDuration) {
    lruQuery = lruQuery.gte('duration_seconds', minDuration);
  }
  if (maxDuration) {
    lruQuery = lruQuery.lte('duration_seconds', maxDuration);
  }
  if (targetBpm) {
    lruQuery = lruQuery.gte('bpm', targetBpm.min).lte('bpm', targetBpm.max);
  }

  if (excludeIds.length > 0) {
    lruQuery = lruQuery.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: lruTracks } = await lruQuery;

  if (lruTracks && lruTracks.length > 0) {
    return lruTracks[0] as MusicTrack;
  }

  return null;
}

/**
 * Update usage tracking for selected track
 */
async function updateUsageTracking(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  trackId: string
): Promise<void> {
  const now = new Date().toISOString();

  // Try RPC first for atomic increment
  await supabase.rpc('increment_music_usage', { track_id: trackId }).catch(() => {
    // Fallback: direct update
    supabase
      .from('music_tracks')
      .update({ last_used_at: now })
      .eq('id', trackId);
  });
}

// ============================================================================
// Pool Health Monitoring
// ============================================================================

/**
 * Check health of all music pools
 */
export async function checkMusicPoolHealth(): Promise<PoolHealthAlert[]> {
  const supabase = await createClient();
  const alerts: PoolHealthAlert[] = [];

  for (const collection of COLLECTIONS) {
    const health = await getCollectionHealth(supabase, collection);

    if (health.alert_level !== 'ok') {
      alerts.push(health);
    }
  }

  return alerts;
}

/**
 * Get health status for a specific collection
 */
async function getCollectionHealth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  collection: Collection
): Promise<PoolHealthAlert> {
  // Get total count
  const { count: totalCount } = await supabase
    .from('music_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('collection', collection)
    .eq('is_active', true);

  // Get unused count
  const { count: unusedCount } = await supabase
    .from('music_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('collection', collection)
    .eq('is_active', true)
    .eq('usage_count', 0);

  const total = totalCount ?? 0;
  const unused = unusedCount ?? 0;

  // Determine alert level and message
  let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
  let message = `${collection} music pool healthy: ${total} tracks, ${unused} unused`;

  if (total < POOL_THRESHOLDS.CRITICAL) {
    alertLevel = 'critical';
    message = `${collection} music pool critical: Only ${total} tracks (minimum ${POOL_THRESHOLDS.CRITICAL})`;
  } else if (total < POOL_THRESHOLDS.WARNING) {
    alertLevel = 'warning';
    message = `${collection} music pool low: ${total} tracks (recommended ${POOL_THRESHOLDS.WARNING}+)`;
  } else if (unused === 0 && total > 0) {
    alertLevel = 'warning';
    message = `${collection} music pool fully cycled: All ${total} tracks have been used`;
  }

  return {
    pool_type: 'music',
    collection,
    total_count: total,
    unused_count: unused,
    alert_level: alertLevel,
    message,
  };
}

/**
 * Get health status for a specific collection (public API)
 */
export async function getMusicPoolHealth(collection: Collection): Promise<PoolHealthAlert> {
  const supabase = await createClient();
  return getCollectionHealth(supabase, collection);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get count of available tracks in a collection
 */
export async function getMusicCount(
  collection: Collection,
  onlyUnused: boolean = false
): Promise<number> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('music_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('collection', collection)
    .eq('is_active', true);

  if (onlyUnused) {
    query = query.eq('usage_count', 0);
  }

  const { count } = await query;
  return count ?? 0;
}

/**
 * Reset usage tracking for a collection
 */
export async function resetMusicUsage(collection: Collection): Promise<void> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('music_tracks')
    .update({
      usage_count: 0,
      last_used_at: null,
    })
    .eq('collection', collection);
}

/**
 * Add new music track to the pool
 */
export async function addMusicTrack(
  track: Omit<MusicTrack, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>
): Promise<MusicTrack | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('music_tracks')
    .insert({
      ...track,
      usage_count: 0,
      last_used_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add music track:', error);
    return null;
  }

  return data as MusicTrack;
}

/**
 * Get recommended BPM range for a collection
 */
export function getRecommendedBpm(collection: Collection): { min: number; max: number } {
  return COLLECTION_BPM[collection];
}

/**
 * Get mood tags for a collection
 */
export function getCollectionMoods(collection: Collection): string[] {
  return COLLECTION_MOODS[collection];
}

/**
 * Select music matching a specific mood
 */
export async function selectMusicByMood(
  mood: string,
  options: SelectMusicOptions = {}
): Promise<MusicTrack | null> {
  // Find which collection the mood belongs to
  const collection = Object.entries(COLLECTION_MOODS).find(
    ([, moods]) => moods.includes(mood)
  )?.[0] as Collection | undefined;

  return selectMusic(collection || 'general', options);
}
