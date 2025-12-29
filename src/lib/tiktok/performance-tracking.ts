/**
 * TikTok Performance Tracking
 * Prompt K.3: TikTok-specific metrics and analytics
 *
 * Key TikTok metrics:
 * 1. Views (primary)
 * 2. Completion Rate (watch time / duration)
 * 3. Shares (viral signal)
 * 4. Saves (intent signal)
 * 5. Profile visits (conversion signal)
 */

import { createClient } from '@/lib/supabase/server';
import { updateHookPerformance } from './hook-selector';

// ============================================================================
// Types
// ============================================================================

export interface PostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  completion_rate?: number;
  profile_visits?: number;
  link_clicks?: number;
}

export interface PerformanceSummary {
  period: string;
  total_views: number;
  total_posts: number;
  avg_views: number;
  avg_engagement_rate: number;
  avg_completion_rate: number | null;
  best_post: {
    id: string;
    title: string;
    views: number;
    content_pillar: string;
  } | null;
  worst_post: {
    id: string;
    title: string;
    views: number;
    content_pillar: string;
  } | null;
  pillar_performance: Record<string, {
    posts: number;
    avg_views: number;
    avg_engagement: number;
  }>;
  top_hooks: {
    hook_id: string;
    hook_text: string;
    avg_views: number;
    uses: number;
  }[];
}

export interface TimeSlotPerformance {
  day: number;
  hour: number;
  avg_views: number;
  avg_engagement: number;
  post_count: number;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Record metrics for a post
 */
export async function recordPostMetrics(
  postId: string,
  metrics: PostMetrics,
  isFinal: boolean = false
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check for existing record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('tiktok_post_metrics')
    .select('id')
    .eq('post_id', postId)
    .eq('is_final', isFinal)
    .single();

  if (existing) {
    // Update existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('tiktok_post_metrics')
      .update({
        ...metrics,
        recorded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return !error;
  }

  // Insert new
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tiktok_post_metrics')
    .insert({
      user_id: user.id,
      post_id: postId,
      ...metrics,
      is_final: isFinal,
    });

  if (!error && metrics.completion_rate) {
    // Update hook performance if we have completion rate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post } = await (supabase as any)
      .from('tiktok_queue')
      .select('hook_id')
      .eq('id', postId)
      .single();

    if (post?.hook_id) {
      await updateHookPerformance(post.hook_id, metrics.completion_rate);
    }
  }

  return !error;
}

/**
 * Get weekly performance summary
 */
export async function getWeeklyPerformance(
  weekStart?: Date
): Promise<PerformanceSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const start = weekStart || new Date();
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  // Get posts with metrics for the week
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('tiktok_queue')
    .select(`
      id, title, content_pillar, hook_id,
      tiktok_post_metrics(views, likes, comments, shares, saves, completion_rate, engagement_rate, is_final)
    `)
    .eq('user_id', user.id)
    .eq('status', 'published')
    .gte('published_at', start.toISOString())
    .lt('published_at', end.toISOString());

  if (!posts || posts.length === 0) {
    return createEmptySummary(start.toISOString().split('T')[0]);
  }

  // Get hook texts for top hooks
  const hookIds = [...new Set(posts.filter((p: { hook_id: string }) => p.hook_id).map((p: { hook_id: string }) => p.hook_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hooks } = await (supabase as any)
    .from('video_hooks')
    .select('id, hook_text')
    .in('id', hookIds.length > 0 ? hookIds : ['00000000-0000-0000-0000-000000000000']);

  const hookMap = new Map<string, string>(hooks?.map((h: { id: string; hook_text: string }) => [h.id, h.hook_text]) || []);

  // Calculate summary
  let totalViews = 0;
  let totalEngagement = 0;
  let totalCompletion = 0;
  let completionCount = 0;

  const pillarStats: Record<string, { views: number; engagement: number; count: number }> = {};
  const hookStats: Map<string, { views: number; count: number }> = new Map();

  let bestPost: PerformanceSummary['best_post'] = null;
  let worstPost: PerformanceSummary['worst_post'] = null;

  for (const post of posts) {
    const metrics = post.tiktok_post_metrics?.find((m: { is_final: boolean }) => m.is_final) ||
      post.tiktok_post_metrics?.[0];

    if (!metrics) continue;

    const views = metrics.views || 0;
    totalViews += views;
    totalEngagement += metrics.engagement_rate || 0;

    if (metrics.completion_rate) {
      totalCompletion += metrics.completion_rate;
      completionCount++;
    }

    // Pillar stats
    if (!pillarStats[post.content_pillar]) {
      pillarStats[post.content_pillar] = { views: 0, engagement: 0, count: 0 };
    }
    pillarStats[post.content_pillar].views += views;
    pillarStats[post.content_pillar].engagement += metrics.engagement_rate || 0;
    pillarStats[post.content_pillar].count++;

    // Hook stats
    if (post.hook_id) {
      const existing = hookStats.get(post.hook_id) || { views: 0, count: 0 };
      hookStats.set(post.hook_id, {
        views: existing.views + views,
        count: existing.count + 1,
      });
    }

    // Best/worst tracking
    if (!bestPost || views > bestPost.views) {
      bestPost = {
        id: post.id,
        title: post.title || 'Untitled',
        views,
        content_pillar: post.content_pillar,
      };
    }
    if (!worstPost || views < worstPost.views) {
      worstPost = {
        id: post.id,
        title: post.title || 'Untitled',
        views,
        content_pillar: post.content_pillar,
      };
    }
  }

  // Format pillar performance
  const pillarPerformance: Record<string, { posts: number; avg_views: number; avg_engagement: number }> = {};
  for (const [pillar, stats] of Object.entries(pillarStats)) {
    pillarPerformance[pillar] = {
      posts: stats.count,
      avg_views: Math.round(stats.views / stats.count),
      avg_engagement: Math.round((stats.engagement / stats.count) * 100) / 100,
    };
  }

  // Format top hooks
  const topHooks = Array.from(hookStats.entries())
    .map(([hookId, stats]) => ({
      hook_id: hookId,
      hook_text: hookMap.get(hookId) || 'Unknown',
      avg_views: Math.round(stats.views / stats.count),
      uses: stats.count,
    }))
    .sort((a, b) => b.avg_views - a.avg_views)
    .slice(0, 5);

  return {
    period: start.toISOString().split('T')[0],
    total_views: totalViews,
    total_posts: posts.length,
    avg_views: Math.round(totalViews / posts.length),
    avg_engagement_rate: Math.round((totalEngagement / posts.length) * 100) / 100,
    avg_completion_rate: completionCount > 0 ? Math.round((totalCompletion / completionCount) * 100) / 100 : null,
    best_post: bestPost,
    worst_post: worstPost,
    pillar_performance: pillarPerformance,
    top_hooks: topHooks,
  };
}

/**
 * Get best posting times based on historical performance
 */
export async function getBestPostingTimes(): Promise<TimeSlotPerformance[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('tiktok_time_performance')
    .select('*')
    .eq('user_id', user.id)
    .order('avg_views', { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map((slot: {
    day_of_week: number;
    hour_of_day: number;
    avg_views: number;
    avg_engagement_rate: number;
    total_posts: number;
  }) => ({
    day: slot.day_of_week,
    hour: slot.hour_of_day,
    avg_views: slot.avg_views,
    avg_engagement: slot.avg_engagement_rate,
    post_count: slot.total_posts,
  }));
}

/**
 * Get growth benchmarks
 */
export async function getGrowthBenchmarks(): Promise<
  { month: number; min_views: number; max_views: number; notes: string }[]
> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('tiktok_growth_benchmarks')
    .select('month_number, min_avg_views, max_avg_views, notes')
    .order('month_number');

  return (data || []).map((b: {
    month_number: number;
    min_avg_views: number;
    max_avg_views: number;
    notes: string;
  }) => ({
    month: b.month_number,
    min_views: b.min_avg_views,
    max_views: b.max_avg_views,
    notes: b.notes,
  }));
}

/**
 * Update time slot performance (call after new metrics)
 */
export async function updateTimeSlotPerformance(postId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Get post details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post } = await (supabase as any)
    .from('tiktok_queue')
    .select('published_at')
    .eq('id', postId)
    .single();

  if (!post?.published_at) return;

  const publishDate = new Date(post.published_at);
  const dayOfWeek = publishDate.getDay();
  const hourOfDay = publishDate.getHours();

  // Get all metrics for this time slot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: metrics } = await (supabase as any)
    .from('tiktok_post_metrics')
    .select(`
      views, engagement_rate, completion_rate,
      tiktok_queue!inner(published_at)
    `)
    .eq('user_id', user.id)
    .eq('is_final', true);

  const slotMetrics = (metrics || []).filter((m: { tiktok_queue: { published_at: string } }) => {
    const d = new Date(m.tiktok_queue.published_at);
    return d.getDay() === dayOfWeek && d.getHours() === hourOfDay;
  });

  if (slotMetrics.length === 0) return;

  const totalViews = slotMetrics.reduce((sum: number, m: { views: number }) => sum + (m.views || 0), 0);
  const totalEngagement = slotMetrics.reduce((sum: number, m: { engagement_rate: number }) => sum + (m.engagement_rate || 0), 0);
  const completionRates = slotMetrics.filter((m: { completion_rate: number | null }) => m.completion_rate !== null);
  const totalCompletion = completionRates.reduce((sum: number, m: { completion_rate: number }) => sum + m.completion_rate, 0);

  // Upsert time slot performance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('tiktok_time_performance')
    .upsert({
      user_id: user.id,
      day_of_week: dayOfWeek,
      hour_of_day: hourOfDay,
      total_posts: slotMetrics.length,
      total_views: totalViews,
      avg_views: totalViews / slotMetrics.length,
      avg_engagement_rate: totalEngagement / slotMetrics.length,
      avg_completion_rate: completionRates.length > 0 ? totalCompletion / completionRates.length : null,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'user_id,day_of_week,hour_of_day',
    });
}

// ============================================================================
// Helpers
// ============================================================================

function createEmptySummary(period: string): PerformanceSummary {
  return {
    period,
    total_views: 0,
    total_posts: 0,
    avg_views: 0,
    avg_engagement_rate: 0,
    avg_completion_rate: null,
    best_post: null,
    worst_post: null,
    pillar_performance: {},
    top_hooks: [],
  };
}
