/**
 * Video Hook Selection Service
 * Prompt 4.3: Performance-weighted random selection for video hooks
 */

import { createClient } from '@/lib/supabase/server';
import type { VideoHook, Collection, VideoContentType } from '@/types/instagram';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Scoring weights for hook selection
 */
const SCORING = {
  // For hooks with performance data
  COMPLETION_RATE_WEIGHT: 100, // multiply avg_completion_rate by this
  RECENCY_BONUS_WEIGHT: 50, // divide by (usage_count + 1)

  // For hooks without performance data (give fair chance)
  NO_DATA_BASE_SCORE: 50,
  NO_DATA_RECENCY_BONUS: 50,
};

// ============================================================================
// Types
// ============================================================================

export interface SelectHookOptions {
  excludeIds?: string[];
}

interface ScoredHook {
  hook: VideoHook;
  score: number;
}

// ============================================================================
// Main Selection Function
// ============================================================================

/**
 * Select a video hook using performance-weighted random selection
 *
 * Algorithm:
 * 1. Query active hooks matching collection and content type
 * 2. Calculate score for each hook:
 *    - With performance data: (avg_completion_rate * 100) + (1 / (usage_count + 1)) * 50
 *    - Without data: 50 + (1 / (usage_count + 1)) * 50
 * 3. Perform weighted random selection based on scores
 * 4. Update usage_count on selection
 */
export async function selectHook(
  collection: Collection,
  contentType: VideoContentType,
  options: SelectHookOptions = {}
): Promise<VideoHook | null> {
  const supabase = await createClient();
  const { excludeIds = [] } = options;

  // Query matching hooks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .contains('collections', [collection])
    .contains('content_types', [contentType]);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: hooks, error } = await query;

  if (error || !hooks || hooks.length === 0) {
    // Fallback: try without content type filter
    return selectHookFallback(supabase, collection, excludeIds);
  }

  const typedHooks = hooks as VideoHook[];

  // Calculate scores for each hook
  const scoredHooks = typedHooks.map(hook => ({
    hook,
    score: calculateHookScore(hook),
  }));

  // Perform weighted random selection
  const selectedHook = weightedRandomSelect(scoredHooks);

  if (selectedHook) {
    await updateHookUsage(supabase, selectedHook.id);
  }

  return selectedHook;
}

/**
 * Fallback selection when no hooks match exact criteria
 */
async function selectHookFallback(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  collection: Collection,
  excludeIds: string[]
): Promise<VideoHook | null> {
  // Try just collection match
  let query = supabase
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .contains('collections', [collection]);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: hooks } = await query;

  if (!hooks || hooks.length === 0) {
    // Last resort: any active hook
    const { data: anyHooks } = await supabase
      .from('video_hooks')
      .select('*')
      .eq('is_active', true)
      .limit(10);

    if (!anyHooks || anyHooks.length === 0) {
      return null;
    }

    const typedHooks = anyHooks as VideoHook[];
    const scoredHooks = typedHooks.map(hook => ({
      hook,
      score: calculateHookScore(hook),
    }));

    const selected = weightedRandomSelect(scoredHooks);
    if (selected) {
      await updateHookUsage(supabase, selected.id);
    }
    return selected;
  }

  const typedHooks = hooks as VideoHook[];
  const scoredHooks = typedHooks.map(hook => ({
    hook,
    score: calculateHookScore(hook),
  }));

  const selected = weightedRandomSelect(scoredHooks);
  if (selected) {
    await updateHookUsage(supabase, selected.id);
  }
  return selected;
}

// ============================================================================
// Scoring Algorithm
// ============================================================================

/**
 * Calculate selection score for a hook
 *
 * Hooks with good performance data get higher scores
 * New hooks (no data) get a fair base score
 * Less-used hooks get a recency bonus
 */
export function calculateHookScore(hook: VideoHook): number {
  const hasPerformanceData =
    hook.avg_completion_rate !== null &&
    hook.avg_completion_rate !== undefined;

  const usageCount = hook.usage_count ?? 0;

  if (hasPerformanceData) {
    // Score = (completion_rate * 100) + recency_bonus
    const completionScore = (hook.avg_completion_rate ?? 0) * SCORING.COMPLETION_RATE_WEIGHT;
    const recencyBonus = (1 / (usageCount + 1)) * SCORING.RECENCY_BONUS_WEIGHT;
    return completionScore + recencyBonus;
  } else {
    // No performance data: give fair chance + recency bonus
    const recencyBonus = (1 / (usageCount + 1)) * SCORING.NO_DATA_RECENCY_BONUS;
    return SCORING.NO_DATA_BASE_SCORE + recencyBonus;
  }
}

// ============================================================================
// Weighted Random Selection
// ============================================================================

/**
 * Select a hook using weighted random selection
 *
 * Higher scores = higher probability of selection
 */
export function weightedRandomSelect(scoredHooks: ScoredHook[]): VideoHook | null {
  if (scoredHooks.length === 0) {
    return null;
  }

  // Calculate total weight
  const totalWeight = scoredHooks.reduce((sum, item) => sum + Math.max(item.score, 0.1), 0);

  if (totalWeight === 0) {
    // Fallback to uniform random
    const randomIndex = Math.floor(Math.random() * scoredHooks.length);
    return scoredHooks[randomIndex].hook;
  }

  // Generate random value
  let random = Math.random() * totalWeight;

  // Select based on cumulative weight
  for (const item of scoredHooks) {
    random -= Math.max(item.score, 0.1);
    if (random <= 0) {
      return item.hook;
    }
  }

  // Fallback to last item
  return scoredHooks[scoredHooks.length - 1].hook;
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Update usage count for selected hook
 */
async function updateHookUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  hookId: string
): Promise<void> {
  // Try RPC first for atomic increment
  await supabase.rpc('increment_hook_usage', { hook_id: hookId }).catch(() => {
    // Fallback: direct update
    supabase
      .from('video_hooks')
      .update({ usage_count: supabase.sql`usage_count + 1` })
      .eq('id', hookId);
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all hooks for a collection
 */
export async function getHooksForCollection(
  collection: Collection
): Promise<VideoHook[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hooks } = await (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .contains('collections', [collection])
    .order('usage_count', { ascending: true });

  return (hooks ?? []) as VideoHook[];
}

/**
 * Get all hooks for a content type
 */
export async function getHooksForContentType(
  contentType: VideoContentType
): Promise<VideoHook[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hooks } = await (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .contains('content_types', [contentType])
    .order('avg_completion_rate', { ascending: false, nullsFirst: false });

  return (hooks ?? []) as VideoHook[];
}

/**
 * Get top performing hooks
 */
export async function getTopPerformingHooks(
  limit: number = 10
): Promise<VideoHook[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hooks } = await (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .not('avg_completion_rate', 'is', null)
    .order('avg_completion_rate', { ascending: false })
    .limit(limit);

  return (hooks ?? []) as VideoHook[];
}

/**
 * Update hook performance metrics
 */
export async function updateHookPerformance(
  hookId: string,
  completionRate: number,
  engagementRate: number
): Promise<void> {
  const supabase = await createClient();

  // Get current values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hook } = await (supabase as any)
    .from('video_hooks')
    .select('usage_count, avg_completion_rate, avg_engagement_rate')
    .eq('id', hookId)
    .single();

  if (!hook) return;

  // Calculate running average
  const usageCount = (hook.usage_count ?? 0) + 1;
  const prevCompletion = hook.avg_completion_rate ?? completionRate;
  const prevEngagement = hook.avg_engagement_rate ?? engagementRate;

  const newCompletionRate =
    prevCompletion + (completionRate - prevCompletion) / usageCount;
  const newEngagementRate =
    prevEngagement + (engagementRate - prevEngagement) / usageCount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('video_hooks')
    .update({
      avg_completion_rate: newCompletionRate,
      avg_engagement_rate: newEngagementRate,
    })
    .eq('id', hookId);
}

/**
 * Add a new hook
 */
export async function addHook(
  hook: Omit<VideoHook, 'id' | 'created_at' | 'usage_count' | 'avg_completion_rate' | 'avg_engagement_rate'>
): Promise<VideoHook | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('video_hooks')
    .insert({
      ...hook,
      usage_count: 0,
      avg_completion_rate: null,
      avg_engagement_rate: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add hook:', error);
    return null;
  }

  return data as VideoHook;
}

/**
 * Get hook statistics
 */
export async function getHookStats(): Promise<{
  total: number;
  active: number;
  withPerformanceData: number;
  avgCompletionRate: number;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allHooks } = await (supabase as any)
    .from('video_hooks')
    .select('*');

  const hooks = (allHooks ?? []) as VideoHook[];

  const activeHooks = hooks.filter(h => h.is_active);
  const hooksWithData = hooks.filter(h => h.avg_completion_rate !== null);
  const avgCompletion =
    hooksWithData.length > 0
      ? hooksWithData.reduce((sum, h) => sum + (h.avg_completion_rate ?? 0), 0) / hooksWithData.length
      : 0;

  return {
    total: hooks.length,
    active: activeHooks.length,
    withPerformanceData: hooksWithData.length,
    avgCompletionRate: avgCompletion,
  };
}
