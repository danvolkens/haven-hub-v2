/**
 * Content Performance Audit Service
 * Prompt F.1: Automated content performance auditing
 *
 * Targets from Instagram Guide:
 * - Engagement rate: 3-6%
 * - Saves: 2%+ of reach
 * - Shares: 1%+ of reach
 * - Link clicks: 2%+ of profile visits
 * - Follower growth: 200-500/month
 * - Quiz clicks: 50-100/month
 * - IG sales: 5-10% of total revenue
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type PeriodType = 'weekly' | 'monthly';
export type AuditStatus = 'generated' | 'reviewed' | 'actioned';
export type ActionPriority = 'high' | 'medium' | 'low';
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface MetricValue {
  value: number;
  target?: number;
  trend?: number;
  status?: 'above' | 'below' | 'at';
}

export interface AuditMetrics {
  reach: MetricValue;
  engagement_rate: MetricValue;
  saves_rate: MetricValue;
  shares_rate: MetricValue;
  profile_visits: MetricValue;
  link_clicks_rate: MetricValue;
  follower_growth: MetricValue;
  quiz_clicks: MetricValue;
  ig_sales_percent: MetricValue;
}

export interface ContentAudit {
  id: string;
  user_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  metrics: AuditMetrics;
  top_posts: string[];
  top_saved: string[];
  top_reels: string[];
  top_shared: string[];
  insights: string[];
  actions: AuditAction[];
  status: AuditStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditAction {
  action: string;
  priority: ActionPriority;
  category: string;
}

export interface AuditActionItem {
  id: string;
  user_id: string;
  audit_id: string;
  action: string;
  category: string;
  priority: ActionPriority;
  status: ActionItemStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface PerformanceTargets {
  engagement_rate_target: number;
  engagement_rate_good: number;
  saves_rate_target: number;
  shares_rate_target: number;
  link_clicks_rate_target: number;
  monthly_follower_growth_min: number;
  monthly_follower_growth_good: number;
  monthly_quiz_clicks_target: number;
  ig_sales_percent_target: number;
}

// Default targets from Instagram Guide
export const DEFAULT_TARGETS: PerformanceTargets = {
  engagement_rate_target: 3.0,
  engagement_rate_good: 6.0,
  saves_rate_target: 2.0,
  shares_rate_target: 1.0,
  link_clicks_rate_target: 2.0,
  monthly_follower_growth_min: 200,
  monthly_follower_growth_good: 500,
  monthly_quiz_clicks_target: 50,
  ig_sales_percent_target: 5.0,
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate a weekly audit for the specified week
 */
export async function generateWeeklyAudit(
  weekStart?: Date
): Promise<ContentAudit | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  // Calculate week boundaries
  const start = weekStart || getLastWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const periodStart = start.toISOString().split('T')[0];
  const periodEnd = end.toISOString().split('T')[0];

  // Check if audit already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('content_audits')
    .select('id')
    .eq('user_id', user.id)
    .eq('period_type', 'weekly')
    .eq('period_start', periodStart)
    .single();

  if (existing) {
    console.log('Audit already exists for this week');
    return getAudit(existing.id);
  }

  // Get user's performance targets
  const targets = await getPerformanceTargets();

  // Gather metrics for the week
  const metrics = await gatherWeeklyMetrics(periodStart, periodEnd, targets);

  // Get top performing content
  const topContent = await getTopContent(periodStart, periodEnd);

  // Generate insights and actions
  const insights = generateInsights(metrics, targets);
  const actions = generateActions(metrics, targets);

  // Create audit record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('content_audits')
    .insert({
      user_id: user.id,
      period_type: 'weekly',
      period_start: periodStart,
      period_end: periodEnd,
      metrics,
      top_posts: topContent.topPosts,
      top_saved: topContent.topSaved,
      top_reels: topContent.topReels,
      top_shared: topContent.topShared,
      insights,
      actions,
      status: 'generated',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create audit:', error);
    return null;
  }

  // Create action items from actions
  await createActionItems(data.id, actions);

  return data as ContentAudit;
}

/**
 * Get an existing audit by ID
 */
export async function getAudit(auditId: string): Promise<ContentAudit | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('content_audits')
    .select('*')
    .eq('id', auditId)
    .single();

  if (error) {
    console.error('Failed to get audit:', error);
    return null;
  }

  return data as ContentAudit;
}

/**
 * Get recent audits
 */
export async function getRecentAudits(
  limit: number = 10
): Promise<ContentAudit[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('content_audits')
    .select('*')
    .order('period_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get audits:', error);
    return [];
  }

  return data as ContentAudit[];
}

/**
 * Get action items for an audit
 */
export async function getAuditActionItems(
  auditId: string
): Promise<AuditActionItem[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('audit_action_items')
    .select('*')
    .eq('audit_id', auditId)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Failed to get action items:', error);
    return [];
  }

  return data as AuditActionItem[];
}

/**
 * Update action item status
 */
export async function updateActionItemStatus(
  itemId: string,
  status: ActionItemStatus,
  notes?: string
): Promise<boolean> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }
  if (notes) {
    updates.notes = notes;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('audit_action_items')
    .update(updates)
    .eq('id', itemId);

  return !error;
}

/**
 * Mark audit as reviewed
 */
export async function markAuditReviewed(auditId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('content_audits')
    .update({
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    })
    .eq('id', auditId);

  return !error;
}

/**
 * Get user's performance targets
 */
export async function getPerformanceTargets(): Promise<PerformanceTargets> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('performance_targets')
    .select('*')
    .single();

  if (!data) {
    return DEFAULT_TARGETS;
  }

  return {
    engagement_rate_target: data.engagement_rate_target || DEFAULT_TARGETS.engagement_rate_target,
    engagement_rate_good: data.engagement_rate_good || DEFAULT_TARGETS.engagement_rate_good,
    saves_rate_target: data.saves_rate_target || DEFAULT_TARGETS.saves_rate_target,
    shares_rate_target: data.shares_rate_target || DEFAULT_TARGETS.shares_rate_target,
    link_clicks_rate_target: data.link_clicks_rate_target || DEFAULT_TARGETS.link_clicks_rate_target,
    monthly_follower_growth_min: data.monthly_follower_growth_min || DEFAULT_TARGETS.monthly_follower_growth_min,
    monthly_follower_growth_good: data.monthly_follower_growth_good || DEFAULT_TARGETS.monthly_follower_growth_good,
    monthly_quiz_clicks_target: data.monthly_quiz_clicks_target || DEFAULT_TARGETS.monthly_quiz_clicks_target,
    ig_sales_percent_target: data.ig_sales_percent_target || DEFAULT_TARGETS.ig_sales_percent_target,
  };
}

/**
 * Update user's performance targets
 */
export async function updatePerformanceTargets(
  targets: Partial<PerformanceTargets>
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('performance_targets')
    .upsert({
      user_id: user.id,
      ...targets,
      updated_at: new Date().toISOString(),
    });

  return !error;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLastWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 7 : dayOfWeek;
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - diff - 6);
  lastSunday.setHours(0, 0, 0, 0);
  return lastSunday;
}

async function gatherWeeklyMetrics(
  periodStart: string,
  periodEnd: string,
  targets: PerformanceTargets
): Promise<AuditMetrics> {
  const supabase = await createClient();

  // Get scheduled posts for the period (with metrics)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('*')
    .gte('scheduled_at', periodStart)
    .lte('scheduled_at', periodEnd)
    .eq('status', 'published');

  // Calculate aggregate metrics
  let totalReach = 0;
  let totalEngagement = 0;
  let totalSaves = 0;
  let totalShares = 0;

  if (posts) {
    for (const post of posts) {
      const metrics = post.metrics || {};
      totalReach += metrics.reach || 0;
      totalEngagement += (metrics.likes || 0) + (metrics.comments || 0);
      totalSaves += metrics.saves || 0;
      totalShares += metrics.shares || 0;
    }
  }

  // Calculate rates
  const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
  const savesRate = totalReach > 0 ? (totalSaves / totalReach) * 100 : 0;
  const sharesRate = totalReach > 0 ? (totalShares / totalReach) * 100 : 0;

  // Build metrics object
  return {
    reach: {
      value: totalReach,
      trend: 0, // Would need previous period to calculate
    },
    engagement_rate: {
      value: Number(engagementRate.toFixed(2)),
      target: targets.engagement_rate_target,
      status: engagementRate >= targets.engagement_rate_target ? 'above' : 'below',
    },
    saves_rate: {
      value: Number(savesRate.toFixed(2)),
      target: targets.saves_rate_target,
      status: savesRate >= targets.saves_rate_target ? 'above' : 'below',
    },
    shares_rate: {
      value: Number(sharesRate.toFixed(2)),
      target: targets.shares_rate_target,
      status: sharesRate >= targets.shares_rate_target ? 'above' : 'below',
    },
    profile_visits: {
      value: 0, // Would come from Instagram API
      trend: 0,
    },
    link_clicks_rate: {
      value: 0, // Would come from Instagram API
      target: targets.link_clicks_rate_target,
      status: 'below',
    },
    follower_growth: {
      value: 0, // Would come from Instagram API
      target: targets.monthly_follower_growth_min,
      status: 'below',
    },
    quiz_clicks: {
      value: 0, // Would come from analytics
      target: targets.monthly_quiz_clicks_target,
      status: 'below',
    },
    ig_sales_percent: {
      value: 0, // Would come from Shopify attribution
      target: targets.ig_sales_percent_target,
      status: 'below',
    },
  };
}

async function getTopContent(
  periodStart: string,
  periodEnd: string
): Promise<{
  topPosts: string[];
  topSaved: string[];
  topReels: string[];
  topShared: string[];
}> {
  const supabase = await createClient();

  // Get posts with metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('id, post_type, metrics')
    .gte('scheduled_at', periodStart)
    .lte('scheduled_at', periodEnd)
    .eq('status', 'published');

  if (!posts || posts.length === 0) {
    return { topPosts: [], topSaved: [], topReels: [], topShared: [] };
  }

  // Sort by different metrics
  const byEngagement = [...posts].sort((a, b) => {
    const aEng = (a.metrics?.likes || 0) + (a.metrics?.comments || 0);
    const bEng = (b.metrics?.likes || 0) + (b.metrics?.comments || 0);
    return bEng - aEng;
  });

  const bySaves = [...posts].sort((a, b) => {
    return (b.metrics?.saves || 0) - (a.metrics?.saves || 0);
  });

  const byShares = [...posts].sort((a, b) => {
    return (b.metrics?.shares || 0) - (a.metrics?.shares || 0);
  });

  const reels = posts.filter((p: { post_type: string }) => p.post_type === 'reel');
  const reelsByEngagement = [...reels].sort((a, b) => {
    const aEng = (a.metrics?.likes || 0) + (a.metrics?.comments || 0);
    const bEng = (b.metrics?.likes || 0) + (b.metrics?.comments || 0);
    return bEng - aEng;
  });

  return {
    topPosts: byEngagement.slice(0, 3).map((p: { id: string }) => p.id),
    topSaved: bySaves.slice(0, 3).map((p: { id: string }) => p.id),
    topReels: reelsByEngagement.slice(0, 3).map((p: { id: string }) => p.id),
    topShared: byShares.slice(0, 3).map((p: { id: string }) => p.id),
  };
}

function generateInsights(
  metrics: AuditMetrics,
  targets: PerformanceTargets
): string[] {
  const insights: string[] = [];

  // Engagement rate insight
  if (metrics.engagement_rate.status === 'above') {
    insights.push(
      `Engagement rate ${metrics.engagement_rate.value}% (above target ${targets.engagement_rate_target}% ✓)`
    );
  } else {
    insights.push(
      `Engagement rate ${metrics.engagement_rate.value}% (below target ${targets.engagement_rate_target}%)`
    );
  }

  // Saves insight
  if (metrics.saves_rate.status === 'above') {
    insights.push(
      `Save rate ${metrics.saves_rate.value}% (above target ${targets.saves_rate_target}% ✓)`
    );
  } else {
    insights.push(
      `Save rate ${metrics.saves_rate.value}% (below target ${targets.saves_rate_target}%)`
    );
  }

  // Shares insight
  if (metrics.shares_rate.status === 'above') {
    insights.push(
      `Share rate ${metrics.shares_rate.value}% (above target ${targets.shares_rate_target}% ✓)`
    );
  } else {
    insights.push(
      `Share rate ${metrics.shares_rate.value}% (below target ${targets.shares_rate_target}%)`
    );
  }

  // Reach insight
  if (metrics.reach.value > 0) {
    insights.push(`Total reach: ${metrics.reach.value.toLocaleString()}`);
  }

  return insights;
}

function generateActions(
  metrics: AuditMetrics,
  targets: PerformanceTargets
): AuditAction[] {
  const actions: AuditAction[] = [];

  // Engagement rate actions
  if (metrics.engagement_rate.status === 'below') {
    actions.push({
      action: 'Improve hooks and ask more questions in captions',
      priority: 'high',
      category: 'engagement',
    });
    actions.push({
      action: 'Create more Reels to boost engagement',
      priority: 'high',
      category: 'engagement',
    });
  }

  // Saves actions
  if (metrics.saves_rate.status === 'below') {
    actions.push({
      action: 'Add more valuable/educational content that people want to save',
      priority: 'medium',
      category: 'saves',
    });
    actions.push({
      action: 'Create quote carousels and how-to content',
      priority: 'medium',
      category: 'saves',
    });
  }

  // Shares actions
  if (metrics.shares_rate.status === 'below') {
    actions.push({
      action: 'Create more emotional/relatable content for shares',
      priority: 'medium',
      category: 'shares',
    });
  }

  // If everything is good, suggest optimization
  if (actions.length === 0) {
    actions.push({
      action: 'Continue current strategy - metrics are on target',
      priority: 'low',
      category: 'general',
    });
    actions.push({
      action: 'Experiment with new content formats to push above targets',
      priority: 'low',
      category: 'growth',
    });
  }

  return actions;
}

async function createActionItems(
  auditId: string,
  actions: AuditAction[]
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const items = actions.map((action) => ({
    user_id: user.id,
    audit_id: auditId,
    action: action.action,
    category: action.category,
    priority: action.priority,
    status: 'pending',
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('audit_action_items').insert(items);
}
