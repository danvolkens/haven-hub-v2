/**
 * Stock Footage Selection Service
 * Prompt 4.1: Smart LRU-based footage selection with pool health monitoring
 */

import { createClient } from '@/lib/supabase/server';
import type { StockFootage, Collection, PoolHealthAlert } from '@/types/instagram';

// ============================================================================
// Configuration
// ============================================================================

const POOL_THRESHOLDS = {
  CRITICAL: 10,
  WARNING: 20,
};

const COLLECTIONS: Collection[] = ['grounding', 'wholeness', 'growth', 'general'];

// ============================================================================
// Types
// ============================================================================

export interface SelectFootageOptions {
  excludeIds?: string[];
  requirePortrait?: boolean;
}

// ============================================================================
// Main Selection Function
// ============================================================================

/**
 * Select stock footage using LRU algorithm with collection matching
 *
 * Priority:
 * 1. Unused footage in requested collection (usage_count = 0)
 * 2. Least recently used in requested collection
 * 3. If no footage in collection, fallback to 'general'
 */
export async function selectFootage(
  collection: Collection,
  options: SelectFootageOptions = {}
): Promise<StockFootage | null> {
  const supabase = await createClient();
  const { excludeIds = [], requirePortrait = true } = options;

  // First try to select from the requested collection
  let footage = await selectFromCollection(supabase, collection, excludeIds, requirePortrait);

  // If no footage found and not already trying general, fallback to general
  if (!footage && collection !== 'general') {
    footage = await selectFromCollection(supabase, 'general', excludeIds, requirePortrait);
  }

  // Update usage tracking if footage was selected
  if (footage) {
    await updateUsageTracking(supabase, footage.id);
  }

  return footage;
}

/**
 * Select footage from a specific collection
 */
async function selectFromCollection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  collection: Collection,
  excludeIds: string[],
  requirePortrait: boolean
): Promise<StockFootage | null> {
  // Build query for unused footage first (priority)
  let query = supabase
    .from('stock_footage')
    .select('*')
    .eq('collection', collection)
    .eq('is_active', true)
    .eq('usage_count', 0)
    .order('created_at', { ascending: true })
    .limit(1);

  // Apply portrait filter
  if (requirePortrait) {
    query = query.eq('orientation', 'portrait');
  }

  // Exclude specific IDs
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: unusedFootage } = await query;

  if (unusedFootage && unusedFootage.length > 0) {
    return unusedFootage[0] as StockFootage;
  }

  // If no unused footage, get least recently used
  let lruQuery = supabase
    .from('stock_footage')
    .select('*')
    .eq('collection', collection)
    .eq('is_active', true)
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(1);

  if (requirePortrait) {
    lruQuery = lruQuery.eq('orientation', 'portrait');
  }

  if (excludeIds.length > 0) {
    lruQuery = lruQuery.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: lruFootage } = await lruQuery;

  if (lruFootage && lruFootage.length > 0) {
    return lruFootage[0] as StockFootage;
  }

  return null;
}

/**
 * Update usage tracking for selected footage
 */
async function updateUsageTracking(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  footageId: string
): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from('stock_footage')
    .update({
      usage_count: supabase.rpc ? undefined : 1, // Will be handled by RPC or raw SQL
      last_used_at: now,
    })
    .eq('id', footageId);

  // Increment usage_count separately
  await supabase.rpc('increment_footage_usage', { footage_id: footageId }).catch(() => {
    // Fallback: direct update if RPC doesn't exist
    supabase
      .from('stock_footage')
      .update({ last_used_at: now })
      .eq('id', footageId);
  });
}

// ============================================================================
// Pool Health Monitoring
// ============================================================================

/**
 * Check health of all footage pools
 *
 * Returns alerts for:
 * - Collections with < 20 videos (warning)
 * - Collections with < 10 videos (critical)
 * - Collections with 0 unused videos (warning)
 */
export async function checkPoolHealth(): Promise<PoolHealthAlert[]> {
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
    .from('stock_footage')
    .select('*', { count: 'exact', head: true })
    .eq('collection', collection)
    .eq('is_active', true)
    .eq('orientation', 'portrait');

  // Get unused count
  const { count: unusedCount } = await supabase
    .from('stock_footage')
    .select('*', { count: 'exact', head: true })
    .eq('collection', collection)
    .eq('is_active', true)
    .eq('orientation', 'portrait')
    .eq('usage_count', 0);

  const total = totalCount ?? 0;
  const unused = unusedCount ?? 0;

  // Determine alert level and message
  let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
  let message = `${collection} pool healthy: ${total} videos, ${unused} unused`;

  if (total < POOL_THRESHOLDS.CRITICAL) {
    alertLevel = 'critical';
    message = `${collection} pool critical: Only ${total} videos (minimum ${POOL_THRESHOLDS.CRITICAL})`;
  } else if (total < POOL_THRESHOLDS.WARNING) {
    alertLevel = 'warning';
    message = `${collection} pool low: ${total} videos (recommended ${POOL_THRESHOLDS.WARNING}+)`;
  } else if (unused === 0 && total > 0) {
    alertLevel = 'warning';
    message = `${collection} pool fully cycled: All ${total} videos have been used`;
  }

  return {
    pool_type: 'footage',
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
export async function getPoolHealth(collection: Collection): Promise<PoolHealthAlert> {
  const supabase = await createClient();
  return getCollectionHealth(supabase, collection);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get count of available footage in a collection
 */
export async function getFootageCount(
  collection: Collection,
  onlyUnused: boolean = false
): Promise<number> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('stock_footage')
    .select('*', { count: 'exact', head: true })
    .eq('collection', collection)
    .eq('is_active', true)
    .eq('orientation', 'portrait');

  if (onlyUnused) {
    query = query.eq('usage_count', 0);
  }

  const { count } = await query;
  return count ?? 0;
}

/**
 * Reset usage tracking for a collection (useful for testing or manual reset)
 */
export async function resetCollectionUsage(collection: Collection): Promise<void> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('stock_footage')
    .update({
      usage_count: 0,
      last_used_at: null,
    })
    .eq('collection', collection);
}

/**
 * Add new footage to the pool
 */
export async function addFootage(
  footage: Omit<StockFootage, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'>
): Promise<StockFootage | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('stock_footage')
    .insert({
      ...footage,
      usage_count: 0,
      last_used_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add footage:', error);
    return null;
  }

  return data as StockFootage;
}

/**
 * Get multiple footage items for carousel/multi-video content
 */
export async function selectMultipleFootage(
  collection: Collection,
  count: number,
  options: SelectFootageOptions = {}
): Promise<StockFootage[]> {
  const selectedFootage: StockFootage[] = [];
  const excludeIds = [...(options.excludeIds || [])];

  for (let i = 0; i < count; i++) {
    const footage = await selectFootage(collection, {
      ...options,
      excludeIds,
    });

    if (footage) {
      selectedFootage.push(footage);
      excludeIds.push(footage.id);
    } else {
      break; // No more footage available
    }
  }

  return selectedFootage;
}
