/**
 * TikTok Pillar Balance Tracking
 * Prompt K.1: Content pillar distribution for TikTok
 *
 * TikTok Pillars (different from Instagram):
 * - Quote Reveals: 30% (highest engagement)
 * - Transformations: 25% (high conversion)
 * - Educational: 20%
 * - BTS: 15% (more personal on TikTok)
 * - Trending: 10% (platform-specific)
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export type TikTokPillar = 'quote_reveal' | 'transformation' | 'educational' | 'bts' | 'trending';

export interface PillarStatus {
  current: number;
  target: number;
  percentage: number;
  status: 'ahead' | 'on_track' | 'behind' | 'critical';
}

export interface PillarBalance {
  quote_reveals: PillarStatus;
  transformations: PillarStatus;
  educational: PillarStatus;
  bts: PillarStatus;
  trending: PillarStatus;
  weekly_target: number;
  current_total: number;
  period_start: string;
  period_end: string;
  suggestions: string[];
}

export interface TimeSlotBalance {
  morning: number;
  afternoon: number;
  evening: number;
}

// ============================================================================
// Constants
// ============================================================================

const PILLAR_TARGETS: Record<TikTokPillar, number> = {
  quote_reveal: 30,
  transformation: 25,
  educational: 20,
  bts: 15,
  trending: 10,
};

const PILLAR_NAMES: Record<TikTokPillar, string> = {
  quote_reveal: 'Quote Reveals',
  transformation: 'Transformations',
  educational: 'Educational',
  bts: 'Behind-the-Scenes',
  trending: 'Trending',
};

const WEEKLY_TARGET = 14; // 2 posts per day
const MONTHLY_TARGET = 60; // ~2 per day for 30 days

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get TikTok pillar balance for a period
 */
export async function getTikTokPillarBalance(
  period: 'week' | 'month' = 'week'
): Promise<PillarBalance> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Calculate date range
  const now = new Date();
  const periodStart = new Date(now);
  const target = period === 'week' ? WEEKLY_TARGET : MONTHLY_TARGET;

  if (period === 'week') {
    periodStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  } else {
    periodStart.setDate(1); // Start of month
  }
  periodStart.setHours(0, 0, 0, 0);

  // Get posts in period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('tiktok_queue')
    .select('content_pillar, status')
    .eq('user_id', user.id)
    .gte('created_at', periodStart.toISOString())
    .in('status', ['published', 'scheduled', 'ready']);

  // Count by pillar
  const counts: Record<TikTokPillar, number> = {
    quote_reveal: 0,
    transformation: 0,
    educational: 0,
    bts: 0,
    trending: 0,
  };

  for (const post of posts || []) {
    const pillar = post.content_pillar as TikTokPillar;
    if (pillar in counts) {
      counts[pillar]++;
    }
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Calculate status for each pillar
  const calculatePillarStatus = (pillar: TikTokPillar): PillarStatus => {
    const current = counts[pillar];
    const targetPercentage = PILLAR_TARGETS[pillar];
    const targetCount = Math.round((target * targetPercentage) / 100);
    const currentPercentage = total > 0 ? (current / total) * 100 : 0;

    let status: PillarStatus['status'] = 'on_track';
    if (current >= targetCount * 1.1) {
      status = 'ahead';
    } else if (current < targetCount * 0.5) {
      status = 'critical';
    } else if (current < targetCount * 0.8) {
      status = 'behind';
    }

    return {
      current,
      target: targetCount,
      percentage: Math.round(currentPercentage),
      status,
    };
  };

  // Generate suggestions
  const suggestions: string[] = [];

  const quoteStatus = calculatePillarStatus('quote_reveal');
  const transformStatus = calculatePillarStatus('transformation');
  const educationalStatus = calculatePillarStatus('educational');
  const btsStatus = calculatePillarStatus('bts');
  const trendingStatus = calculatePillarStatus('trending');

  if (transformStatus.status === 'behind' || transformStatus.status === 'critical') {
    suggestions.push(
      `Add ${transformStatus.target - transformStatus.current} more transformation videos (high conversion)`
    );
  }

  if (trendingStatus.status === 'behind' || trendingStatus.status === 'critical') {
    suggestions.push('Check current trending sounds — your trending content is underweight');
  }

  if (quoteStatus.status === 'ahead') {
    suggestions.push('Great quote reveal coverage! Consider diversifying into transformations');
  }

  if (total < target * 0.7) {
    suggestions.push(`Posting frequency low — aim for ${period === 'week' ? '10-14' : '60'} posts per ${period}`);
  }

  if (btsStatus.current === 0 && period === 'week') {
    suggestions.push('Add a behind-the-scenes video this week — builds authenticity');
  }

  return {
    quote_reveals: quoteStatus,
    transformations: transformStatus,
    educational: educationalStatus,
    bts: btsStatus,
    trending: trendingStatus,
    weekly_target: target,
    current_total: total,
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    suggestions,
  };
}

/**
 * Get time slot balance (AM/PM distribution)
 */
export async function getTimeSlotBalance(
  period: 'week' | 'month' = 'week'
): Promise<TimeSlotBalance> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { morning: 0, afternoon: 0, evening: 0 };
  }

  const now = new Date();
  const periodStart = new Date(now);

  if (period === 'week') {
    periodStart.setDate(now.getDate() - now.getDay());
  } else {
    periodStart.setDate(1);
  }
  periodStart.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('tiktok_queue')
    .select('time_slot')
    .eq('user_id', user.id)
    .gte('created_at', periodStart.toISOString())
    .in('status', ['published', 'scheduled', 'ready']);

  const counts: TimeSlotBalance = { morning: 0, afternoon: 0, evening: 0 };

  for (const post of posts || []) {
    const slot = post.time_slot as keyof TimeSlotBalance;
    if (slot in counts) {
      counts[slot]++;
    }
  }

  return counts;
}

/**
 * Get posting streak (consecutive days with posts)
 */
export async function getPostingStreak(): Promise<{
  current: number;
  longest: number;
  lastPostedAt: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { current: 0, longest: 0, lastPostedAt: null };
  }

  // Get posts from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('tiktok_queue')
    .select('published_at')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .gte('published_at', thirtyDaysAgo.toISOString())
    .order('published_at', { ascending: false });

  if (!posts || posts.length === 0) {
    return { current: 0, longest: 0, lastPostedAt: null };
  }

  // Get unique dates
  const postDates = new Set<string>();
  for (const post of posts) {
    if (post.published_at) {
      const date = new Date(post.published_at).toISOString().split('T')[0];
      postDates.add(date);
    }
  }

  const sortedDates = Array.from(postDates).sort().reverse();
  const today = new Date().toISOString().split('T')[0];

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date();

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (postDates.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr === today) {
      // Today doesn't break streak yet
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i]);
    const next = new Date(sortedDates[i + 1]);
    const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastPostedAt: posts[0]?.published_at || null,
  };
}

/**
 * Get recommended next content type
 */
export async function getRecommendedNextPillar(): Promise<{
  pillar: TikTokPillar;
  reason: string;
}> {
  const balance = await getTikTokPillarBalance('week');

  // Find the most underweight pillar
  const pillars: TikTokPillar[] = ['quote_reveal', 'transformation', 'educational', 'bts', 'trending'];

  let mostBehind: TikTokPillar = 'quote_reveal';
  let lowestRatio = Infinity;

  const pillarData = {
    quote_reveal: balance.quote_reveals,
    transformation: balance.transformations,
    educational: balance.educational,
    bts: balance.bts,
    trending: balance.trending,
  };

  for (const pillar of pillars) {
    const status = pillarData[pillar];
    const ratio = status.target > 0 ? status.current / status.target : 0;

    if (ratio < lowestRatio) {
      lowestRatio = ratio;
      mostBehind = pillar;
    }
  }

  const reasons: Record<TikTokPillar, string> = {
    quote_reveal: 'Quote reveals drive highest engagement on TikTok',
    transformation: 'Transformations have the highest conversion rate',
    educational: 'Educational content builds trust and authority',
    bts: 'Behind-the-scenes builds authentic connection',
    trending: 'Trending content helps algorithm visibility',
  };

  return {
    pillar: mostBehind,
    reason: `${PILLAR_NAMES[mostBehind]} is underweight this week. ${reasons[mostBehind]}`,
  };
}
