/**
 * Content Pillar Balance Tracking
 * Prompt 3.2: Weekly mix validation with 40/20/20/20 targets
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentPillar } from '@/types/instagram';

// ============================================================================
// Types
// ============================================================================

export interface PillarStats {
  pillar: ContentPillar;
  label: string;
  count: number;
  actual: number; // Percentage
  target: number; // Percentage
  minimum: number; // Minimum percentage threshold
  status: 'ok' | 'warning';
  suggestion: string | null;
}

export interface PillarBalance {
  balance: PillarStats[];
  total: number;
  weekStartDate: Date;
  weekEndDate: Date;
  isHealthy: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

export const PILLAR_TARGETS: Record<
  ContentPillar,
  { target: number; minimum: number; label: string }
> = {
  product_showcase: { target: 40, minimum: 30, label: 'Product Showcase' },
  brand_story: { target: 20, minimum: 15, label: 'Brand Story' },
  educational: { target: 20, minimum: 15, label: 'Educational' },
  community: { target: 20, minimum: 15, label: 'Community' },
};

export const PILLAR_SUGGESTIONS: Record<ContentPillar, string> = {
  product_showcase: 'Schedule a quote reveal or product showcase',
  brand_story: "Add a 'behind the quote' or brand story post",
  educational: 'Schedule a how-to carousel or tips post',
  community: 'Feature a customer photo or ask a community question',
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get the content pillar balance for a specific week
 */
export async function getWeeklyPillarBalance(
  weekStartDate: Date,
  userId?: string
): Promise<PillarBalance> {
  const supabase = await createClient();

  // Calculate week boundaries
  const startDate = getWeekStart(weekStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  // Fetch posts for the week
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('instagram_scheduled_posts')
    .select('content_pillar')
    .gte('scheduled_at', startDate.toISOString())
    .lt('scheduled_at', endDate.toISOString())
    .in('status', ['scheduled', 'pending', 'posted']);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: posts } = await query;
  const typedPosts = (posts || []) as Array<{ content_pillar: ContentPillar }>;

  // Count posts by pillar
  const counts: Record<ContentPillar, number> = {
    product_showcase: 0,
    brand_story: 0,
    educational: 0,
    community: 0,
  };

  for (const post of typedPosts) {
    if (post.content_pillar && counts[post.content_pillar] !== undefined) {
      counts[post.content_pillar]++;
    }
  }

  const total = typedPosts.length;

  // Calculate balance for each pillar
  const balance: PillarStats[] = (Object.keys(PILLAR_TARGETS) as ContentPillar[]).map(
    (pillar) => {
      const config = PILLAR_TARGETS[pillar];
      const count = counts[pillar];
      const actual = total > 0 ? Math.round((count / total) * 100) : 0;
      const isBelow = actual < config.minimum;

      return {
        pillar,
        label: config.label,
        count,
        actual,
        target: config.target,
        minimum: config.minimum,
        status: isBelow ? 'warning' : 'ok',
        suggestion: isBelow ? PILLAR_SUGGESTIONS[pillar] : null,
      };
    }
  );

  // Check overall health
  const isHealthy = balance.every((b) => b.status === 'ok');

  return {
    balance,
    total,
    weekStartDate: startDate,
    weekEndDate: endDate,
    isHealthy,
  };
}

/**
 * Get the current week's pillar balance
 */
export async function getCurrentWeekBalance(userId?: string): Promise<PillarBalance> {
  return getWeeklyPillarBalance(new Date(), userId);
}

/**
 * Get suggestion for a specific pillar
 */
export function getSuggestionForPillar(pillar: ContentPillar): string {
  return PILLAR_SUGGESTIONS[pillar] || 'Add more content for this pillar';
}

/**
 * Check if adding a post would improve balance
 */
export function wouldImproveBalance(
  currentBalance: PillarBalance,
  newPillar: ContentPillar
): { improves: boolean; newStatus: 'ok' | 'warning'; message: string } {
  const currentStats = currentBalance.balance.find((b) => b.pillar === newPillar);

  if (!currentStats) {
    return {
      improves: true,
      newStatus: 'ok',
      message: 'Adding first post for this pillar',
    };
  }

  const newTotal = currentBalance.total + 1;
  const newCount = currentStats.count + 1;
  const newActual = Math.round((newCount / newTotal) * 100);
  const config = PILLAR_TARGETS[newPillar];

  const wasWarning = currentStats.status === 'warning';
  const willBeOk = newActual >= config.minimum;

  if (wasWarning && willBeOk) {
    return {
      improves: true,
      newStatus: 'ok',
      message: `This will bring ${config.label} to ${newActual}% (above ${config.minimum}% minimum)`,
    };
  }

  if (wasWarning && !willBeOk) {
    return {
      improves: true,
      newStatus: 'warning',
      message: `This will improve ${config.label} to ${newActual}% (still below ${config.minimum}% minimum)`,
    };
  }

  return {
    improves: newActual <= config.target + 10, // Don't over-represent
    newStatus: 'ok',
    message: `${config.label} will be at ${newActual}%`,
  };
}

/**
 * Get pillars that need more content
 */
export function getPillarsNeedingContent(balance: PillarBalance): ContentPillar[] {
  return balance.balance
    .filter((b) => b.status === 'warning')
    .sort((a, b) => a.actual - b.actual) // Most under-represented first
    .map((b) => b.pillar);
}

/**
 * Get recommended next pillar to schedule
 */
export function getRecommendedPillar(balance: PillarBalance): ContentPillar {
  const needingContent = getPillarsNeedingContent(balance);

  if (needingContent.length > 0) {
    return needingContent[0];
  }

  // If all pillars are OK, recommend the one furthest below target
  const sortedByDistance = [...balance.balance].sort(
    (a, b) => a.target - a.actual - (b.target - b.actual)
  );

  return sortedByDistance[sortedByDistance.length - 1].pillar;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the start of the week (Sunday) for a given date
 */
function getWeekStart(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

/**
 * Format balance for display
 */
export function formatBalanceForDisplay(balance: PillarBalance): string {
  const lines = balance.balance.map((b) => {
    const indicator = b.status === 'warning' ? '⚠️' : '✅';
    return `${indicator} ${b.label}: ${b.count} posts (${b.actual}% / ${b.target}% target)`;
  });

  const healthStatus = balance.isHealthy
    ? '✅ Content mix is healthy'
    : '⚠️ Some pillars need attention';

  return [...lines, '', healthStatus].join('\n');
}

/**
 * Calculate what percentage a count would be of total
 */
export function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Check if a percentage meets the minimum for a pillar
 */
export function meetsMinimum(pillar: ContentPillar, percentage: number): boolean {
  return percentage >= PILLAR_TARGETS[pillar].minimum;
}
