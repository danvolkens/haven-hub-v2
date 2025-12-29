/**
 * Template Performance Tracking Service
 * Prompt F.2: Track and analyze template performance
 *
 * Features:
 * - Materialized view for aggregated stats
 * - Top performers by category
 * - Winners to repeat recommendations
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type WinCategory = 'engagement' | 'saves' | 'shares' | 'reach' | 'overall';
export type TemplateType = 'feed' | 'reel' | 'story' | 'carousel';

export interface TemplatePerformance {
  template_id: string;
  template_name: string;
  template_type: TemplateType;
  content_pillar: string;
  collection: string;
  times_used: number;
  avg_likes: number;
  avg_comments: number;
  avg_saves: number;
  avg_shares: number;
  avg_reach: number;
  avg_engagement_rate: number;
  avg_saves_rate: number;
  performance_score: number;
  last_used_at: string | null;
}

export interface TemplateWinner {
  id: string;
  template_id: string;
  period_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  win_category: WinCategory;
  metrics: Record<string, number>;
  performance_score: number;
  repeated: boolean;
  repeated_at: string | null;
  // Joined template data
  template_name?: string;
  template_type?: TemplateType;
}

export interface TopTemplatesResult {
  byEngagement: TemplatePerformance[];
  bySaves: TemplatePerformance[];
  byShares: TemplatePerformance[];
  byOverall: TemplatePerformance[];
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get top performing templates by category
 */
export async function getTopTemplates(
  period?: { start: Date; end: Date },
  limit: number = 5
): Promise<TopTemplatesResult> {
  const supabase = await createClient();

  // First refresh the materialized view
  await refreshTemplatePerformance();

  // Get all performance data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allTemplates } = await (supabase as any)
    .from('template_performance')
    .select('*')
    .gt('times_used', 0)
    .order('performance_score', { ascending: false });

  if (!allTemplates || allTemplates.length === 0) {
    return {
      byEngagement: [],
      bySaves: [],
      byShares: [],
      byOverall: [],
    };
  }

  // Sort by different metrics
  const byEngagement = [...allTemplates]
    .sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)
    .slice(0, limit);

  const bySaves = [...allTemplates]
    .sort((a, b) => b.avg_saves - a.avg_saves)
    .slice(0, limit);

  const byShares = [...allTemplates]
    .sort((a, b) => b.avg_shares - a.avg_shares)
    .slice(0, limit);

  const byOverall = allTemplates.slice(0, limit);

  return {
    byEngagement,
    bySaves,
    byShares,
    byOverall,
  };
}

/**
 * Get template performance by ID
 */
export async function getTemplatePerformance(
  templateId: string
): Promise<TemplatePerformance | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('template_performance')
    .select('*')
    .eq('template_id', templateId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as TemplatePerformance;
}

/**
 * Get templates sorted by a specific metric
 */
export async function getTemplatesByMetric(
  metric: 'engagement' | 'saves' | 'shares' | 'reach' | 'score',
  templateType?: TemplateType,
  limit: number = 10
): Promise<TemplatePerformance[]> {
  const supabase = await createClient();

  const orderColumn = {
    engagement: 'avg_engagement_rate',
    saves: 'avg_saves',
    shares: 'avg_shares',
    reach: 'avg_reach',
    score: 'performance_score',
  }[metric];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('template_performance')
    .select('*')
    .gt('times_used', 0)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (templateType) {
    query = query.eq('template_type', templateType);
  }

  const { data } = await query;

  return (data || []) as TemplatePerformance[];
}

/**
 * Refresh the materialized view
 */
export async function refreshTemplatePerformance(): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('refresh_template_performance');

  if (error) {
    console.error('Failed to refresh template performance:', error);
    return false;
  }

  return true;
}

/**
 * Log template usage when a post is created
 */
export async function logTemplateUsage(
  templateId: string,
  postId: string,
  postType: string
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Get template info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (supabase as any)
    .from('instagram_templates')
    .select('name, template_type')
    .eq('id', templateId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('template_usage_log')
    .insert({
      user_id: user.id,
      template_id: templateId,
      template_name: template?.name,
      template_type: template?.template_type,
      post_id: postId,
      post_type: postType,
    });

  return !error;
}

/**
 * Get template usage history
 */
export async function getTemplateUsageHistory(
  templateId?: string,
  limit: number = 20
): Promise<
  {
    template_name: string;
    post_type: string;
    used_at: string;
  }[]
> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('template_usage_log')
    .select('template_name, post_type, used_at')
    .order('used_at', { ascending: false })
    .limit(limit);

  if (templateId) {
    query = query.eq('template_id', templateId);
  }

  const { data } = await query;

  return data || [];
}

// ============================================================================
// Winners Functions
// ============================================================================

/**
 * Get template winners (top performers to repeat)
 */
export async function getTemplateWinners(
  periodType: 'weekly' | 'monthly' = 'weekly',
  limit: number = 10
): Promise<TemplateWinner[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('template_winners')
    .select(`
      *,
      instagram_templates (
        name,
        template_type
      )
    `)
    .eq('period_type', periodType)
    .eq('repeated', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get template winners:', error);
    return [];
  }

  // Flatten joined data
  return (data || []).map((winner: {
    instagram_templates?: { name: string; template_type: TemplateType };
    [key: string]: unknown;
  }) => ({
    ...winner,
    template_name: winner.instagram_templates?.name,
    template_type: winner.instagram_templates?.template_type,
  })) as TemplateWinner[];
}

/**
 * Identify and save winners for a period
 */
export async function identifyWinners(
  periodType: 'weekly' | 'monthly' = 'weekly',
  periodStart?: Date
): Promise<TemplateWinner[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // First refresh the performance view
  await refreshTemplatePerformance();

  // Call the database function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('identify_template_winners', {
    p_user_id: user.id,
    p_period_type: periodType,
    p_period_start: periodStart?.toISOString().split('T')[0] || null,
    p_period_end: null,
  });

  if (error) {
    console.error('Failed to identify winners:', error);
    return [];
  }

  return (data || []) as TemplateWinner[];
}

/**
 * Mark a winner as repeated
 */
export async function markWinnerRepeated(winnerId: string): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('template_winners')
    .update({
      repeated: true,
      repeated_at: new Date().toISOString(),
    })
    .eq('id', winnerId);

  return !error;
}

/**
 * Get winners to repeat (not yet repeated)
 */
export async function getWinnersToRepeat(): Promise<TemplateWinner[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('template_winners')
    .select(`
      *,
      instagram_templates (
        name,
        template_type,
        caption_template
      )
    `)
    .eq('repeated', false)
    .order('performance_score', { ascending: false })
    .limit(5);

  return (data || []).map((winner: {
    instagram_templates?: { name: string; template_type: TemplateType };
    [key: string]: unknown;
  }) => ({
    ...winner,
    template_name: winner.instagram_templates?.name,
    template_type: winner.instagram_templates?.template_type,
  })) as TemplateWinner[];
}

// ============================================================================
// Dashboard Widget Data
// ============================================================================

/**
 * Get summary data for dashboard widgets
 */
export async function getPerformanceSummary(): Promise<{
  totalTemplates: number;
  templatesUsed: number;
  topPerformer: TemplatePerformance | null;
  winnersToRepeat: number;
  avgEngagementRate: number;
}> {
  const supabase = await createClient();

  // Get template counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allPerformance } = await (supabase as any)
    .from('template_performance')
    .select('*');

  const templates = allPerformance || [];
  const usedTemplates = templates.filter((t: { times_used: number }) => t.times_used > 0);

  // Get winners count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: winnersCount } = await (supabase as any)
    .from('template_winners')
    .select('*', { count: 'exact', head: true })
    .eq('repeated', false);

  // Calculate average engagement rate
  const avgEngagement = usedTemplates.length > 0
    ? usedTemplates.reduce((sum: number, t: { avg_engagement_rate: number }) => sum + (t.avg_engagement_rate || 0), 0) / usedTemplates.length
    : 0;

  // Get top performer
  const topPerformer = usedTemplates.length > 0
    ? usedTemplates.sort((a: { performance_score: number }, b: { performance_score: number }) => b.performance_score - a.performance_score)[0]
    : null;

  return {
    totalTemplates: templates.length,
    templatesUsed: usedTemplates.length,
    topPerformer: topPerformer as TemplatePerformance | null,
    winnersToRepeat: winnersCount || 0,
    avgEngagementRate: Number(avgEngagement.toFixed(2)),
  };
}
