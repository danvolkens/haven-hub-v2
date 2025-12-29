/**
 * TikTok Hook Selection Service
 * Prompt I.2: Intelligent hook selection algorithm
 *
 * Selection priority:
 * 1. Match content_type
 * 2. Match collection (or 'any')
 * 3. Match platform
 * 4. Exclude hooks used in last 14 days
 * 5. Prefer higher completion_rate
 * 6. Least-recently-used as tiebreaker
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type HookType =
  | 'pattern_interrupt'
  | 'direct_address'
  | 'curiosity'
  | 'controversy'
  | 'story'
  | 'pov'
  | 'read_when';

export type ContentType = 'quote_reveal' | 'transformation' | 'educational' | 'bts' | 'trending';
export type Collection = 'grounding' | 'wholeness' | 'growth' | 'any';
export type Platform = 'tiktok' | 'instagram' | 'both';

export interface VideoHook {
  id: string;
  hook_text: string;
  hook_type: HookType;
  content_types: ContentType[];
  collections: Collection[];
  platforms: Platform[];
  avg_completion_rate: number;
  usage_count: number;
  last_used_at: string | null;
  is_active: boolean;
  is_system: boolean;
}

export interface HookSelectionParams {
  content_type: ContentType;
  collection?: Collection;
  platform: Platform;
  exclude_hook_ids?: string[];
}

export interface HookWithScore extends VideoHook {
  score: number;
}

// ============================================================================
// Constants
// ============================================================================

const DAYS_BEFORE_REUSE = 14;
const NEW_HOOK_BOOST = 1.1; // 10% boost for hooks with <5 uses
const MIN_USES_FOR_PERFORMANCE = 5;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Select the best hook based on criteria
 */
export async function selectHook(
  params: HookSelectionParams
): Promise<VideoHook | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { content_type, collection = 'any', platform, exclude_hook_ids = [] } = params;

  // Get hooks used in last 14 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_BEFORE_REUSE);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentUsage } = await (supabase as any)
    .from('hook_usage')
    .select('hook_id')
    .eq('user_id', user.id)
    .gte('used_at', cutoffDate.toISOString());

  const recentHookIds = (recentUsage || []).map((u: { hook_id: string }) => u.hook_id);
  const allExcluded = [...exclude_hook_ids, ...recentHookIds];

  // Query matching hooks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .contains('content_types', [content_type]);

  // Platform filter - match specific platform or 'both'
  if (platform !== 'both') {
    query = query.or(`platforms.cs.{${platform}},platforms.cs.{both}`);
  }

  // Collection filter - match specific collection or 'any'
  if (collection !== 'any') {
    query = query.or(`collections.cs.{${collection}},collections.cs.{any}`);
  }

  const { data: hooks, error } = await query;

  if (error) {
    console.error('Failed to fetch hooks:', error);
    return null;
  }

  if (!hooks || hooks.length === 0) {
    return null;
  }

  // Filter out excluded hooks
  let availableHooks = hooks.filter(
    (h: VideoHook) => !allExcluded.includes(h.id)
  ) as VideoHook[];

  // If all hooks are excluded, fall back to least-recently-used
  if (availableHooks.length === 0) {
    availableHooks = hooks.sort((a: VideoHook, b: VideoHook) => {
      if (!a.last_used_at && !b.last_used_at) return 0;
      if (!a.last_used_at) return -1;
      if (!b.last_used_at) return 1;
      return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
    });
    availableHooks = [availableHooks[0]];
  }

  // Score and rank hooks
  const scoredHooks: HookWithScore[] = availableHooks.map((hook) => ({
    ...hook,
    score: calculateHookScore(hook),
  }));

  // Sort by score descending
  scoredHooks.sort((a, b) => b.score - a.score);

  // Select the best hook
  const selectedHook = scoredHooks[0];

  // Log the usage
  await markHookUsed(selectedHook.id);

  return selectedHook;
}

/**
 * Calculate a hook's selection score
 */
function calculateHookScore(hook: VideoHook): number {
  let score = 1.0;

  // Boost new hooks (< 5 uses)
  if (hook.usage_count < MIN_USES_FOR_PERFORMANCE) {
    score *= NEW_HOOK_BOOST;
  } else {
    // Weight by completion rate (0-100 scale, normalized to 0-2)
    const completionWeight = (hook.avg_completion_rate / 50) || 1;
    score *= completionWeight;
  }

  // Prefer less-recently-used
  if (hook.last_used_at) {
    const daysSinceUse = Math.floor(
      (Date.now() - new Date(hook.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += daysSinceUse * 0.01; // Small boost for older unused hooks
  } else {
    score += 0.5; // Boost for never-used hooks
  }

  return score;
}

/**
 * Get the pool of available hooks for given criteria
 */
export async function getHookPool(
  content_type: ContentType,
  collection?: Collection,
  platform?: Platform
): Promise<VideoHook[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .contains('content_types', [content_type])
    .order('avg_completion_rate', { ascending: false });

  if (collection && collection !== 'any') {
    query = query.or(`collections.cs.{${collection}},collections.cs.{any}`);
  }

  if (platform && platform !== 'both') {
    query = query.or(`platforms.cs.{${platform}},platforms.cs.{both}`);
  }

  const { data } = await query;

  return (data || []) as VideoHook[];
}

/**
 * Mark a hook as used
 */
export async function markHookUsed(
  hookId: string,
  postId?: string
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Insert usage record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: usageError } = await (supabase as any)
    .from('hook_usage')
    .insert({
      user_id: user.id,
      hook_id: hookId,
      post_id: postId,
    });

  if (usageError) {
    console.error('Failed to log hook usage:', usageError);
    return false;
  }

  // Update hook's last_used_at and increment usage count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentHook } = await (supabase as any)
    .from('video_hooks')
    .select('usage_count')
    .eq('id', hookId)
    .single();

  if (currentHook) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('video_hooks')
      .update({
        usage_count: (currentHook.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', hookId);

    if (updateError) {
      console.error('Failed to update hook stats:', updateError);
      return false;
    }
  }

  return true;
}

/**
 * Update hook performance based on analytics
 */
export async function updateHookPerformance(
  hookId: string,
  completionRate: number
): Promise<boolean> {
  const supabase = await createClient();

  // Get current stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hook } = await (supabase as any)
    .from('video_hooks')
    .select('avg_completion_rate, usage_count')
    .eq('id', hookId)
    .single();

  if (!hook) return false;

  // Calculate new average (weighted by usage count)
  const currentTotal = hook.avg_completion_rate * hook.usage_count;
  const newAvg = (currentTotal + completionRate) / (hook.usage_count + 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('video_hooks')
    .update({
      avg_completion_rate: newAvg,
      updated_at: new Date().toISOString(),
    })
    .eq('id', hookId);

  return !error;
}

/**
 * Get usage history for a hook
 */
export async function getHookUsageHistory(
  hookId: string,
  limit: number = 10
): Promise<
  {
    used_at: string;
    completion_rate: number | null;
    views: number | null;
  }[]
> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('hook_usage')
    .select('used_at, completion_rate, views')
    .eq('hook_id', hookId)
    .order('used_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get hooks by type
 */
export async function getHooksByType(hookType: HookType): Promise<VideoHook[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('hook_type', hookType)
    .eq('is_active', true)
    .order('avg_completion_rate', { ascending: false });

  return (data || []) as VideoHook[];
}

/**
 * Search hooks by text
 */
export async function searchHooks(query: string): Promise<VideoHook[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('video_hooks')
    .select('*')
    .ilike('hook_text', `%${query}%`)
    .eq('is_active', true)
    .limit(20);

  return (data || []) as VideoHook[];
}

/**
 * Get top performing hooks
 */
export async function getTopPerformingHooks(
  limit: number = 10
): Promise<VideoHook[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('video_hooks')
    .select('*')
    .eq('is_active', true)
    .gte('usage_count', MIN_USES_FOR_PERFORMANCE)
    .order('avg_completion_rate', { ascending: false })
    .limit(limit);

  return (data || []) as VideoHook[];
}
