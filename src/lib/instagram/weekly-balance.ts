/**
 * Instagram Weekly Balance Tracker
 * Prompt C.2: Content pillar balance and weekly targets
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentPillar, PostType } from '@/types/instagram';

// ============================================================================
// Types
// ============================================================================

export type BalanceStatus = 'on_track' | 'behind' | 'critical' | 'ahead';

export interface ContentTypeBalance {
  current: number;
  target: number;
  min: number;
  max: number;
  status: BalanceStatus;
  percentage: number; // 0-100
}

export interface PillarBalance {
  current: number;
  target: number;
  percentage: number; // Target percentage (e.g., 40 for 40%)
  status: BalanceStatus;
}

export interface WeeklyBalance {
  weekStart: Date;
  weekEnd: Date;
  contentTypes: {
    feed: ContentTypeBalance;
    reel: ContentTypeBalance;
    carousel: ContentTypeBalance;
    story: ContentTypeBalance;
  };
  pillars: Record<ContentPillar, PillarBalance>;
  totalPosts: number;
  suggestions: string[];
  overallStatus: BalanceStatus;
}

// ============================================================================
// Constants - Weekly Targets from Instagram Guide
// ============================================================================

export const WEEKLY_TARGETS = {
  feed: { min: 5, max: 7, target: 6 },
  reel: { min: 3, max: 5, target: 4 },
  carousel: { min: 2, max: 3, target: 2 },
  story: { min: 21, max: 49, target: 35 }, // 3-7 per day
} as const;

export const PILLAR_PERCENTAGES: Record<ContentPillar, number> = {
  product_showcase: 40,
  brand_story: 20,
  educational: 20,
  community: 20,
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStatus(current: number, target: number, min: number): BalanceStatus {
  const ratio = current / target;

  if (ratio >= 1) return 'ahead';
  if (ratio >= 0.7) return 'on_track';
  if (ratio >= 0.4 || current >= min) return 'behind';
  return 'critical';
}

function calculatePillarStatus(current: number, target: number): BalanceStatus {
  if (current >= target) return 'ahead';
  if (current >= target * 0.7) return 'on_track';
  if (current >= target * 0.4) return 'behind';
  return 'critical';
}

function getWeekBounds(startDate: Date): { start: Date; end: Date } {
  const start = new Date(startDate);
  // Go to Sunday of the week
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Get the weekly content balance for a given week
 */
export async function getWeeklyBalance(startDate: Date): Promise<WeeklyBalance> {
  const supabase = await createClient();
  const { start: weekStart, end: weekEnd } = getWeekBounds(startDate);

  // Fetch scheduled posts for the week
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts, error } = await (supabase as any)
    .from('instagram_scheduled_posts')
    .select('post_type, content_pillar, status')
    .gte('scheduled_at', weekStart.toISOString())
    .lte('scheduled_at', weekEnd.toISOString())
    .in('status', ['scheduled', 'published', 'draft']);

  if (error) {
    console.error('Failed to fetch weekly posts:', error);
  }

  const typedPosts = (posts || []) as Array<{
    post_type: PostType;
    content_pillar: ContentPillar;
    status: string;
  }>;

  // Count by content type
  const contentTypeCounts: Record<PostType, number> = {
    feed: 0,
    reel: 0,
    carousel: 0,
    story: 0,
  };

  // Count by pillar
  const pillarCounts: Record<ContentPillar, number> = {
    product_showcase: 0,
    brand_story: 0,
    educational: 0,
    community: 0,
  };

  for (const post of typedPosts) {
    contentTypeCounts[post.post_type]++;
    pillarCounts[post.content_pillar]++;
  }

  const totalPosts = typedPosts.filter((p) => p.post_type !== 'story').length;

  // Calculate content type balances
  const contentTypes: WeeklyBalance['contentTypes'] = {
    feed: {
      current: contentTypeCounts.feed,
      target: WEEKLY_TARGETS.feed.target,
      min: WEEKLY_TARGETS.feed.min,
      max: WEEKLY_TARGETS.feed.max,
      status: calculateStatus(
        contentTypeCounts.feed,
        WEEKLY_TARGETS.feed.target,
        WEEKLY_TARGETS.feed.min
      ),
      percentage: Math.round((contentTypeCounts.feed / WEEKLY_TARGETS.feed.target) * 100),
    },
    reel: {
      current: contentTypeCounts.reel,
      target: WEEKLY_TARGETS.reel.target,
      min: WEEKLY_TARGETS.reel.min,
      max: WEEKLY_TARGETS.reel.max,
      status: calculateStatus(
        contentTypeCounts.reel,
        WEEKLY_TARGETS.reel.target,
        WEEKLY_TARGETS.reel.min
      ),
      percentage: Math.round((contentTypeCounts.reel / WEEKLY_TARGETS.reel.target) * 100),
    },
    carousel: {
      current: contentTypeCounts.carousel,
      target: WEEKLY_TARGETS.carousel.target,
      min: WEEKLY_TARGETS.carousel.min,
      max: WEEKLY_TARGETS.carousel.max,
      status: calculateStatus(
        contentTypeCounts.carousel,
        WEEKLY_TARGETS.carousel.target,
        WEEKLY_TARGETS.carousel.min
      ),
      percentage: Math.round((contentTypeCounts.carousel / WEEKLY_TARGETS.carousel.target) * 100),
    },
    story: {
      current: contentTypeCounts.story,
      target: WEEKLY_TARGETS.story.target,
      min: WEEKLY_TARGETS.story.min,
      max: WEEKLY_TARGETS.story.max,
      status: calculateStatus(
        contentTypeCounts.story,
        WEEKLY_TARGETS.story.target,
        WEEKLY_TARGETS.story.min
      ),
      percentage: Math.round((contentTypeCounts.story / WEEKLY_TARGETS.story.target) * 100),
    },
  };

  // Calculate pillar balances
  const pillars: Record<ContentPillar, PillarBalance> = {} as Record<ContentPillar, PillarBalance>;

  for (const [pillar, percentage] of Object.entries(PILLAR_PERCENTAGES)) {
    const target = (totalPosts * percentage) / 100;
    const current = pillarCounts[pillar as ContentPillar];

    pillars[pillar as ContentPillar] = {
      current,
      target: Math.round(target * 10) / 10, // Round to 1 decimal
      percentage,
      status: calculatePillarStatus(current, target || 1),
    };
  }

  // Generate suggestions
  const suggestions: string[] = [];

  // Content type suggestions
  if (contentTypes.feed.status === 'critical' || contentTypes.feed.status === 'behind') {
    const needed = WEEKLY_TARGETS.feed.min - contentTypeCounts.feed;
    if (needed > 0) {
      suggestions.push(`Add ${needed} more feed post${needed > 1 ? 's' : ''} this week`);
    }
  }

  if (contentTypes.reel.status === 'critical' || contentTypes.reel.status === 'behind') {
    const needed = WEEKLY_TARGETS.reel.min - contentTypeCounts.reel;
    if (needed > 0) {
      suggestions.push(`Schedule ${needed} more Reel${needed > 1 ? 's' : ''}`);
    }
  }

  if (contentTypes.carousel.status === 'critical' || contentTypes.carousel.status === 'behind') {
    const needed = WEEKLY_TARGETS.carousel.min - contentTypeCounts.carousel;
    if (needed > 0) {
      suggestions.push(`Add ${needed} educational carousel${needed > 1 ? 's' : ''}`);
    }
  }

  // Pillar suggestions
  for (const [pillar, balance] of Object.entries(pillars)) {
    if (balance.status === 'critical' && balance.current === 0) {
      const pillarName = pillar.replace('_', ' ');
      suggestions.push(`Add 1 ${pillarName} post this week`);
    }
  }

  // Calculate overall status
  const statuses = [
    contentTypes.feed.status,
    contentTypes.reel.status,
    contentTypes.carousel.status,
  ];

  let overallStatus: BalanceStatus = 'on_track';
  if (statuses.some((s) => s === 'critical')) {
    overallStatus = 'critical';
  } else if (statuses.some((s) => s === 'behind')) {
    overallStatus = 'behind';
  } else if (statuses.every((s) => s === 'ahead')) {
    overallStatus = 'ahead';
  }

  return {
    weekStart,
    weekEnd,
    contentTypes,
    pillars,
    totalPosts,
    suggestions,
    overallStatus,
  };
}

/**
 * Get balance status color for UI
 */
export function getStatusColor(status: BalanceStatus): string {
  switch (status) {
    case 'ahead':
      return 'text-green-600 bg-green-100';
    case 'on_track':
      return 'text-green-600 bg-green-50';
    case 'behind':
      return 'text-yellow-600 bg-yellow-50';
    case 'critical':
      return 'text-red-600 bg-red-50';
  }
}

/**
 * Get balance status badge variant
 */
export function getStatusBadgeVariant(
  status: BalanceStatus
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'ahead':
    case 'on_track':
      return 'success';
    case 'behind':
      return 'warning';
    case 'critical':
      return 'destructive';
  }
}

/**
 * Get progress bar color
 */
export function getProgressColor(status: BalanceStatus): string {
  switch (status) {
    case 'ahead':
      return 'bg-green-500';
    case 'on_track':
      return 'bg-sage';
    case 'behind':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
  }
}
