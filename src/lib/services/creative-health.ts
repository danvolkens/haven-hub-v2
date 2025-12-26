import { getAdminClient } from '@/lib/supabase/admin';

// Configuration constants
const BASELINE_THRESHOLD = {
  MIN_IMPRESSIONS: 1000,
  MIN_DAYS: 7,
};

const FATIGUE_WEIGHTS = {
  CTR_DECLINE: 0.5,
  ENGAGEMENT_DECLINE: 0.3,
  SAVE_RATE_DECLINE: 0.2,
};

const STATUS_THRESHOLDS = {
  HEALTHY: 25,
  DECLINING: 50,
  FATIGUED: 75,
  CRITICAL: 100,
};

export interface CreativeMetrics {
  ctr: number;
  engagement_rate: number;
  save_rate: number;
  impressions: number;
}

export interface CreativeHealthRecord {
  id: string;
  user_id: string;
  content_type: 'pin' | 'ad_creative' | 'asset';
  content_id: string;
  baseline_ctr: number | null;
  baseline_engagement_rate: number | null;
  baseline_save_rate: number | null;
  baseline_captured_at: string | null;
  baseline_impressions: number | null;
  current_ctr: number | null;
  current_engagement_rate: number | null;
  current_save_rate: number | null;
  current_impressions: number | null;
  last_metrics_update: string | null;
  fatigue_score: number;
  status: 'pending_baseline' | 'healthy' | 'declining' | 'fatigued' | 'critical';
  metrics_history: Array<{ date: string } & CreativeMetrics>;
  days_active: number;
  days_since_baseline: number;
  refresh_recommended: boolean;
  refresh_recommended_at: string | null;
  refresh_reason: string | null;
  last_refresh_at: string | null;
  refresh_count: number;
  created_at: string;
  updated_at: string;
}

export interface HealthSummary {
  total_tracked: number;
  pending_baseline: number;
  healthy: number;
  declining: number;
  fatigued: number;
  critical: number;
  refresh_recommended: number;
  avg_fatigue_score: number;
}

/**
 * Calculate the average of an array of numbers
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate fatigue score based on performance decline from baseline
 */
function calculateFatigueScore(
  baseline: { ctr: number; engagement_rate: number; save_rate: number },
  current: { ctr: number; engagement_rate: number; save_rate: number }
): number {
  // Calculate percentage decline for each metric (0 = no decline, 1 = 100% decline)
  const ctrDecline = baseline.ctr > 0
    ? Math.max(0, (baseline.ctr - current.ctr) / baseline.ctr)
    : 0;
  const engagementDecline = baseline.engagement_rate > 0
    ? Math.max(0, (baseline.engagement_rate - current.engagement_rate) / baseline.engagement_rate)
    : 0;
  const saveDecline = baseline.save_rate > 0
    ? Math.max(0, (baseline.save_rate - current.save_rate) / baseline.save_rate)
    : 0;

  // Weighted average of declines
  const rawScore =
    ctrDecline * FATIGUE_WEIGHTS.CTR_DECLINE +
    engagementDecline * FATIGUE_WEIGHTS.ENGAGEMENT_DECLINE +
    saveDecline * FATIGUE_WEIGHTS.SAVE_RATE_DECLINE;

  // Convert to 0-100 scale and cap at 100
  return Math.round(Math.min(rawScore * 100, 100));
}

/**
 * Update creative health metrics for a specific piece of content
 */
export async function updateCreativeHealth(
  userId: string,
  contentType: 'pin' | 'ad_creative' | 'asset',
  contentId: string,
  currentMetrics: CreativeMetrics
): Promise<CreativeHealthRecord | null> {
  const supabase = getAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // Try to get existing health record
  const { data: health } = await (supabase as any)
    .from('creative_health')
    .select('*')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .single();

  if (!health) {
    // Create new record
    const { data: newHealth, error } = await (supabase as any)
      .from('creative_health')
      .insert({
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        current_ctr: currentMetrics.ctr,
        current_engagement_rate: currentMetrics.engagement_rate,
        current_save_rate: currentMetrics.save_rate,
        current_impressions: currentMetrics.impressions,
        last_metrics_update: new Date().toISOString(),
        days_active: 1,
        metrics_history: [{ date: today, ...currentMetrics }],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating creative health record:', error);
      return null;
    }
    return newHealth;
  }

  // Update metrics history
  const history = [...(health.metrics_history || [])];
  const existingTodayIndex = history.findIndex((h: any) => h.date === today);

  if (existingTodayIndex >= 0) {
    // Update today's entry
    history[existingTodayIndex] = { date: today, ...currentMetrics };
  } else {
    // Add new entry for today
    history.push({ date: today, ...currentMetrics });
    // Keep only last 90 days
    if (history.length > 90) {
      history.shift();
    }
  }

  const daysActive = history.length;
  const totalImpressions = history.reduce((sum: number, h: any) => sum + h.impressions, 0);

  // Build update object
  const updates: Record<string, any> = {
    current_ctr: currentMetrics.ctr,
    current_engagement_rate: currentMetrics.engagement_rate,
    current_save_rate: currentMetrics.save_rate,
    current_impressions: currentMetrics.impressions,
    last_metrics_update: new Date().toISOString(),
    days_active: daysActive,
    metrics_history: history,
  };

  // Check if we should capture baseline
  const shouldCaptureBaseline =
    !health.baseline_ctr &&
    daysActive >= BASELINE_THRESHOLD.MIN_DAYS &&
    totalImpressions >= BASELINE_THRESHOLD.MIN_IMPRESSIONS;

  if (shouldCaptureBaseline) {
    // Use first 7 days as baseline
    const baselineDays = history.slice(0, BASELINE_THRESHOLD.MIN_DAYS);
    updates.baseline_ctr = average(baselineDays.map((d: any) => d.ctr));
    updates.baseline_engagement_rate = average(baselineDays.map((d: any) => d.engagement_rate));
    updates.baseline_save_rate = average(baselineDays.map((d: any) => d.save_rate));
    updates.baseline_captured_at = new Date().toISOString();
    updates.baseline_impressions = baselineDays.reduce((sum: number, d: any) => sum + d.impressions, 0);
  }

  // Calculate fatigue score if we have a baseline
  const hasBaseline = health.baseline_ctr || updates.baseline_ctr;

  if (hasBaseline) {
    const baseline = {
      ctr: updates.baseline_ctr || health.baseline_ctr,
      engagement_rate: updates.baseline_engagement_rate || health.baseline_engagement_rate,
      save_rate: updates.baseline_save_rate || health.baseline_save_rate,
    };

    // Use last 7 days for current performance
    const recentDays = history.slice(-7);
    const recent = {
      ctr: average(recentDays.map((d: any) => d.ctr)),
      engagement_rate: average(recentDays.map((d: any) => d.engagement_rate)),
      save_rate: average(recentDays.map((d: any) => d.save_rate)),
    };

    updates.fatigue_score = calculateFatigueScore(baseline, recent);
    updates.days_since_baseline = daysActive - BASELINE_THRESHOLD.MIN_DAYS;
  }

  // Perform update
  const { data: updated, error } = await (supabase as any)
    .from('creative_health')
    .update(updates)
    .eq('id', health.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating creative health:', error);
    return null;
  }

  return updated;
}

/**
 * Get all fatigued content for a user (score >= 50)
 */
export async function getFatiguedContent(
  userId: string,
  minScore: number = 50
): Promise<CreativeHealthRecord[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('creative_health')
    .select('*')
    .eq('user_id', userId)
    .gte('fatigue_score', minScore)
    .order('fatigue_score', { ascending: false });

  if (error) {
    console.error('Error fetching fatigued content:', error);
    return [];
  }

  return data || [];
}

/**
 * Get content that needs refresh (recommended)
 */
export async function getRefreshRecommendations(
  userId: string
): Promise<CreativeHealthRecord[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('creative_health')
    .select('*')
    .eq('user_id', userId)
    .eq('refresh_recommended', true)
    .order('refresh_recommended_at', { ascending: true });

  if (error) {
    console.error('Error fetching refresh recommendations:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark content as refreshed (resets baseline tracking)
 */
export async function markRefreshed(
  userId: string,
  contentType: 'pin' | 'ad_creative' | 'asset',
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('creative_health')
    .update({
      refresh_recommended: false,
      last_refresh_at: new Date().toISOString(),
      // Reset baseline to start fresh tracking
      baseline_ctr: null,
      baseline_engagement_rate: null,
      baseline_save_rate: null,
      baseline_captured_at: null,
      baseline_impressions: null,
      // Reset fatigue tracking
      fatigue_score: 0,
      status: 'pending_baseline',
      days_since_baseline: 0,
      metrics_history: [],
      days_active: 0,
    })
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId);

  if (error) {
    console.error('Error marking content as refreshed:', error);
    return { success: false, error: error.message };
  }

  // Increment refresh count separately using raw SQL via RPC
  // If RPC doesn't exist, we just skip the increment (it was set to 0 above anyway)
  try {
    await (supabase as any).rpc('increment_refresh_count', {
      p_user_id: userId,
      p_content_type: contentType,
      p_content_id: contentId,
    });
  } catch {
    // RPC doesn't exist, ignore - refresh_count was reset to 0 in the main update
  }

  return { success: true };
}

/**
 * Get creative health summary for a user
 */
export async function getHealthSummary(userId: string): Promise<HealthSummary | null> {
  const supabase = getAdminClient();

  // Try to use the RPC function first
  const { data: rpcData, error: rpcError } = await (supabase as any)
    .rpc('get_creative_health_summary', { p_user_id: userId });

  if (!rpcError && rpcData && rpcData.length > 0) {
    return rpcData[0];
  }

  // Fallback to manual query
  const { data, error } = await (supabase as any)
    .from('creative_health')
    .select('status, fatigue_score, refresh_recommended, baseline_ctr')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching health summary:', error);
    return null;
  }

  const records = data || [];

  return {
    total_tracked: records.length,
    pending_baseline: records.filter((r: any) => r.status === 'pending_baseline').length,
    healthy: records.filter((r: any) => r.status === 'healthy').length,
    declining: records.filter((r: any) => r.status === 'declining').length,
    fatigued: records.filter((r: any) => r.status === 'fatigued').length,
    critical: records.filter((r: any) => r.status === 'critical').length,
    refresh_recommended: records.filter((r: any) => r.refresh_recommended).length,
    avg_fatigue_score:
      records.filter((r: any) => r.baseline_ctr !== null).length > 0
        ? average(
            records
              .filter((r: any) => r.baseline_ctr !== null)
              .map((r: any) => r.fatigue_score)
          )
        : 0,
  };
}

/**
 * Get all creative health records for a user
 */
export async function getAllCreativeHealth(
  userId: string,
  options: {
    contentType?: 'pin' | 'ad_creative' | 'asset';
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: CreativeHealthRecord[]; count: number }> {
  const supabase = getAdminClient();
  const { contentType, status, limit = 50, offset = 0 } = options;

  let query = (supabase as any)
    .from('creative_health')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('fatigue_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (contentType) {
    query = query.eq('content_type', contentType);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching creative health:', error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get trend data for a specific content item
 */
export async function getContentTrend(
  userId: string,
  contentType: 'pin' | 'ad_creative' | 'asset',
  contentId: string
): Promise<{
  health: CreativeHealthRecord | null;
  trend: Array<{ date: string; ctr: number; baseline_ctr: number | null }>;
}> {
  const supabase = getAdminClient();

  const { data: health, error } = await (supabase as any)
    .from('creative_health')
    .select('*')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .single();

  if (error || !health) {
    return { health: null, trend: [] };
  }

  const history = health.metrics_history || [];
  const baselineCtr = health.baseline_ctr;

  const trend = history.map((h: any) => ({
    date: h.date,
    ctr: h.ctr,
    baseline_ctr: baselineCtr,
  }));

  return { health, trend };
}

export { STATUS_THRESHOLDS, BASELINE_THRESHOLD, FATIGUE_WEIGHTS };
