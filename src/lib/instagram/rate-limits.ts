/**
 * Instagram Rate Limit Management
 * Prompt 12.1: Track and enforce Instagram API rate limits
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Constants
// ============================================================================

const LIMITS = {
  posts: { max: 25, windowHours: 24 },
  api_calls: { max: 200, windowHours: 1 },
  comments: { max: 60, windowHours: 1 },
};

const WARNING_THRESHOLD = 0.8; // 80%

// ============================================================================
// Types
// ============================================================================

interface RateLimitStatus {
  type: string;
  count: number;
  max: number;
  remaining: number;
  percentage: number;
  isWarning: boolean;
  isExhausted: boolean;
  resetsAt: Date;
}

interface RateLimitsResult {
  canPost: boolean;
  canCallApi: boolean;
  canComment: boolean;
  limits: Record<string, RateLimitStatus>;
  warnings: string[];
}

// ============================================================================
// Functions
// ============================================================================

export async function checkRateLimits(
  supabase: SupabaseClient,
  userId: string
): Promise<RateLimitsResult> {
  const now = new Date();
  const warnings: string[] = [];

  // Fetch current rate limits
  const { data: limits, error } = await (supabase as any)
    .from('instagram_rate_limits')
    .select('*')
    .eq('user_id', userId);

  if (error || !limits) {
    // Initialize if not exists
    await initializeRateLimits(supabase, userId);
    return {
      canPost: true,
      canCallApi: true,
      canComment: true,
      limits: {},
      warnings: [],
    };
  }

  const result: Record<string, RateLimitStatus> = {};

  for (const limit of limits) {
    const windowStart = new Date(limit.window_start);
    const windowEnd = new Date(
      windowStart.getTime() + limit.window_duration_hours * 60 * 60 * 1000
    );

    // Check if window has expired
    if (now > windowEnd) {
      // Reset the counter
      await (supabase as any)
        .from('instagram_rate_limits')
        .update({
          count: 0,
          window_start: now.toISOString(),
        })
        .eq('id', limit.id);

      result[limit.limit_type] = {
        type: limit.limit_type,
        count: 0,
        max: limit.max_limit,
        remaining: limit.max_limit,
        percentage: 0,
        isWarning: false,
        isExhausted: false,
        resetsAt: new Date(now.getTime() + limit.window_duration_hours * 60 * 60 * 1000),
      };
    } else {
      const remaining = limit.max_limit - limit.count;
      const percentage = limit.count / limit.max_limit;

      result[limit.limit_type] = {
        type: limit.limit_type,
        count: limit.count,
        max: limit.max_limit,
        remaining,
        percentage,
        isWarning: percentage >= WARNING_THRESHOLD,
        isExhausted: remaining <= 0,
        resetsAt: windowEnd,
      };

      if (percentage >= WARNING_THRESHOLD && remaining > 0) {
        warnings.push(
          `${limit.limit_type}: ${remaining} remaining (${Math.round(percentage * 100)}% used)`
        );
      }
    }
  }

  return {
    canPost: !result.posts?.isExhausted,
    canCallApi: !result.api_calls?.isExhausted,
    canComment: !result.comments?.isExhausted,
    limits: result,
    warnings,
  };
}

export async function incrementRateLimit(
  supabase: SupabaseClient,
  userId: string,
  limitType: 'posts' | 'api_calls' | 'comments',
  amount: number = 1
): Promise<boolean> {
  const limits = await checkRateLimits(supabase, userId);

  if (limits.limits[limitType]?.isExhausted) {
    return false;
  }

  const { error } = await (supabase as any)
    .from('instagram_rate_limits')
    .update({
      count: (limits.limits[limitType]?.count || 0) + amount,
    })
    .eq('user_id', userId)
    .eq('limit_type', limitType);

  return !error;
}

export async function initializeRateLimits(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();

  for (const [type, config] of Object.entries(LIMITS)) {
    await (supabase as any)
      .from('instagram_rate_limits')
      .upsert({
        user_id: userId,
        limit_type: type,
        count: 0,
        window_start: now,
        window_duration_hours: config.windowHours,
        max_limit: config.max,
      }, { onConflict: 'user_id,limit_type' });
  }
}

export async function getRateLimitSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  status: 'ok' | 'warning' | 'critical';
  message: string;
  limits: RateLimitStatus[];
}> {
  const result = await checkRateLimits(supabase, userId);
  const limitArray = Object.values(result.limits);

  const hasExhausted = limitArray.some((l) => l.isExhausted);
  const hasWarning = limitArray.some((l) => l.isWarning);

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  let message = 'All systems normal';

  if (hasExhausted) {
    status = 'critical';
    const exhaustedTypes = limitArray.filter((l) => l.isExhausted).map((l) => l.type);
    message = `Rate limit exceeded for: ${exhaustedTypes.join(', ')}`;
  } else if (hasWarning) {
    status = 'warning';
    message = `Approaching rate limits: ${result.warnings.join(', ')}`;
  }

  return { status, message, limits: limitArray };
}
