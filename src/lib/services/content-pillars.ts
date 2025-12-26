import { getAdminClient } from '@/lib/supabase/admin';
import { startOfWeek, startOfMonth, startOfQuarter, format } from 'date-fns';

// Types
export interface ContentPillar {
  id: string;
  name: string;
  description: string | null;
  recommended_percentage: number;
  display_order: number;
}

export interface PillarPerformance {
  id: string;
  user_id: string;
  pillar_id: string;
  platform: string;
  period_type: 'week' | 'month' | 'quarter';
  period_start: string;
  content_count: number;
  impressions: number;
  clicks: number;
  saves: number;
  avg_ctr: number | null;
  avg_save_rate: number | null;
  winner_count: number;
  winner_percentage: number | null;
  current_percentage: number | null;
  created_at: string;
  updated_at: string;
  // Joined pillar data
  pillar?: ContentPillar;
}

export interface MixRecommendation {
  id: string;
  user_id: string;
  pillar_id: string;
  platform: string;
  recommended_percentage: number;
  current_percentage: number | null;
  reasoning: RecommendationReasoning | null;
  confidence_score: number | null;
  generated_at: string;
  valid_until: string | null;
  // Joined pillar data
  pillar?: ContentPillar;
}

interface RecommendationReasoning {
  primary: string;
  factors: string[];
  action?: string;
}

// Constants
const PERFORMANCE_WEIGHTS = {
  CTR: 0.3,
  SAVE_RATE: 0.4,
  WINNER_RATE: 0.3,
};

const MIN_CONTENT_FOR_CONFIDENCE = 5;
const RECOMMENDATION_VALIDITY_DAYS = 7;

/**
 * Get all content pillar definitions
 */
export async function getContentPillars(): Promise<ContentPillar[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('content_pillars')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching content pillars:', error);
    return [];
  }

  return data || [];
}

/**
 * Get pillar performance data for a user
 */
export async function getPillarPerformance(
  userId: string,
  periodType: 'week' | 'month' | 'quarter' = 'week',
  limit = 4
): Promise<PillarPerformance[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('content_pillar_performance')
    .select(`
      *,
      pillar:content_pillars(*)
    `)
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .order('period_start', { ascending: false })
    .limit(limit * 6); // 6 pillars per period

  if (error) {
    console.error('Error fetching pillar performance:', error);
    return [];
  }

  return data || [];
}

/**
 * Get the latest pillar performance summary for a user
 */
export async function getLatestPillarSummary(
  userId: string
): Promise<{
  performance: PillarPerformance[];
  period: { type: string; start: string } | null;
}> {
  const supabase = getAdminClient();

  // Get the most recent period
  const { data: latestPeriod } = await (supabase as any)
    .from('content_pillar_performance')
    .select('period_type, period_start')
    .eq('user_id', userId)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();

  if (!latestPeriod) {
    return { performance: [], period: null };
  }

  // Get all pillar performance for that period
  const { data, error } = await (supabase as any)
    .from('content_pillar_performance')
    .select(`
      *,
      pillar:content_pillars(*)
    `)
    .eq('user_id', userId)
    .eq('period_type', latestPeriod.period_type)
    .eq('period_start', latestPeriod.period_start)
    .order('content_count', { ascending: false });

  if (error) {
    console.error('Error fetching latest pillar summary:', error);
    return { performance: [], period: null };
  }

  return {
    performance: data || [],
    period: {
      type: latestPeriod.period_type,
      start: latestPeriod.period_start,
    },
  };
}

/**
 * Aggregate pillar performance data for a user
 */
export async function aggregatePillarPerformance(
  userId: string,
  periodType: 'week' | 'month' | 'quarter',
  periodStart: Date
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const formattedDate = format(periodStart, 'yyyy-MM-dd');

  // Call the database function to aggregate
  const { error } = await (supabase as any).rpc('aggregate_pillar_performance', {
    p_user_id: userId,
    p_period_type: periodType,
    p_period_start: formattedDate,
  });

  if (error) {
    console.error('Error aggregating pillar performance:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Generate content mix recommendations based on performance
 */
export async function generateMixRecommendations(
  userId: string
): Promise<MixRecommendation[]> {
  const supabase = getAdminClient();

  // Get pillars and recent performance
  const pillars = await getContentPillars();
  const { performance } = await getLatestPillarSummary(userId);

  if (performance.length === 0) {
    // No performance data - return default recommendations
    return pillars.map((pillar) => ({
      id: '',
      user_id: userId,
      pillar_id: pillar.id,
      platform: 'pinterest',
      recommended_percentage: pillar.recommended_percentage,
      current_percentage: null,
      reasoning: {
        primary: 'Default recommendation based on industry best practices',
        factors: ['No historical data available yet'],
      },
      confidence_score: 50,
      generated_at: new Date().toISOString(),
      valid_until: null,
      pillar,
    }));
  }

  // Calculate performance scores for each pillar
  const pillarScores = new Map<string, {
    score: number;
    performance: PillarPerformance;
    pillar: ContentPillar;
  }>();

  for (const perf of performance) {
    if (!perf.pillar) continue;

    // Calculate composite score
    const ctr = perf.avg_ctr || 0;
    const saveRate = perf.avg_save_rate || 0;
    const winnerRate = perf.winner_percentage || 0;

    const score =
      (ctr * 100) * PERFORMANCE_WEIGHTS.CTR +
      (saveRate * 100) * PERFORMANCE_WEIGHTS.SAVE_RATE +
      winnerRate * PERFORMANCE_WEIGHTS.WINNER_RATE;

    pillarScores.set(perf.pillar_id, {
      score,
      performance: perf,
      pillar: perf.pillar,
    });
  }

  // Calculate recommendations based on performance
  const recommendations: MixRecommendation[] = [];
  const totalScore = Array.from(pillarScores.values())
    .reduce((sum, p) => sum + p.score, 0);

  // Calculate average performance for comparison
  const avgScore = totalScore / (pillarScores.size || 1);

  for (const pillar of pillars) {
    const pillarData = pillarScores.get(pillar.id);
    const currentPercentage = pillarData?.performance.current_percentage || 0;
    const score = pillarData?.score || 0;
    const contentCount = pillarData?.performance.content_count || 0;

    // Calculate recommended percentage
    let recommendedPercentage: number;
    let reasoning: RecommendationReasoning;
    let confidenceScore: number;

    if (contentCount < MIN_CONTENT_FOR_CONFIDENCE) {
      // Not enough data - suggest testing more
      recommendedPercentage = Math.max(pillar.recommended_percentage, 15);
      reasoning = {
        primary: 'Insufficient data for optimization',
        factors: [
          `Only ${contentCount} pieces of content in this pillar`,
          `Need at least ${MIN_CONTENT_FOR_CONFIDENCE} for confident recommendations`,
        ],
        action: 'Increase testing of this content type',
      };
      confidenceScore = 40;
    } else if (score > avgScore * 1.5) {
      // High performer - increase allocation
      recommendedPercentage = Math.min(
        Math.round(currentPercentage * 1.25),
        40 // Cap at 40%
      );
      reasoning = {
        primary: `High performer - ${Math.round((score / avgScore - 1) * 100)}% above average`,
        factors: [
          pillarData?.performance.avg_ctr
            ? `CTR: ${(pillarData.performance.avg_ctr * 100).toFixed(2)}%`
            : '',
          pillarData?.performance.avg_save_rate
            ? `Save rate: ${(pillarData.performance.avg_save_rate * 100).toFixed(2)}%`
            : '',
          pillarData?.performance.winner_count
            ? `${pillarData.performance.winner_count} winners`
            : '',
        ].filter(Boolean),
        action: 'Increase content production in this pillar',
      };
      confidenceScore = Math.min(70 + contentCount * 2, 95);
    } else if (score < avgScore * 0.5) {
      // Low performer - decrease allocation
      recommendedPercentage = Math.max(
        Math.round(currentPercentage * 0.75),
        5 // Keep at least 5%
      );
      reasoning = {
        primary: `Underperforming - ${Math.round((1 - score / avgScore) * 100)}% below average`,
        factors: [
          'Consider refreshing creative approach',
          'Review timing and targeting',
        ],
        action: 'Reduce allocation, focus on quality over quantity',
      };
      confidenceScore = Math.min(60 + contentCount * 2, 85);
    } else {
      // Average performer - maintain or slight adjust
      recommendedPercentage = pillar.recommended_percentage;
      reasoning = {
        primary: 'Performing at expected levels',
        factors: ['Maintain current allocation'],
      };
      confidenceScore = Math.min(65 + contentCount * 2, 90);
    }

    // Ensure percentages are reasonable
    recommendedPercentage = Math.max(5, Math.min(40, recommendedPercentage));

    recommendations.push({
      id: '',
      user_id: userId,
      pillar_id: pillar.id,
      platform: 'pinterest',
      recommended_percentage: recommendedPercentage,
      current_percentage: Math.round(currentPercentage),
      reasoning,
      confidence_score: confidenceScore,
      generated_at: new Date().toISOString(),
      valid_until: new Date(
        Date.now() + RECOMMENDATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
      pillar,
    });
  }

  // Normalize recommendations to sum to 100%
  const totalRecommended = recommendations.reduce(
    (sum, r) => sum + r.recommended_percentage,
    0
  );
  if (totalRecommended > 0) {
    for (const rec of recommendations) {
      rec.recommended_percentage = Math.round(
        (rec.recommended_percentage / totalRecommended) * 100
      );
    }
  }

  return recommendations;
}

/**
 * Save generated recommendations to the database
 */
export async function saveMixRecommendations(
  userId: string,
  recommendations: MixRecommendation[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // Delete existing recommendations for this user/platform
  await (supabase as any)
    .from('content_mix_recommendations')
    .delete()
    .eq('user_id', userId)
    .eq('platform', 'pinterest');

  // Insert new recommendations
  const { error } = await (supabase as any)
    .from('content_mix_recommendations')
    .insert(
      recommendations.map((r) => ({
        user_id: userId,
        pillar_id: r.pillar_id,
        platform: r.platform,
        recommended_percentage: r.recommended_percentage,
        current_percentage: r.current_percentage,
        reasoning: r.reasoning,
        confidence_score: r.confidence_score,
        generated_at: r.generated_at,
        valid_until: r.valid_until,
      }))
    );

  if (error) {
    console.error('Error saving mix recommendations:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get current mix recommendations for a user
 */
export async function getMixRecommendations(
  userId: string
): Promise<MixRecommendation[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('content_mix_recommendations')
    .select(`
      *,
      pillar:content_pillars(*)
    `)
    .eq('user_id', userId)
    .eq('platform', 'pinterest')
    .order('recommended_percentage', { ascending: false });

  if (error) {
    console.error('Error fetching mix recommendations:', error);
    return [];
  }

  return data || [];
}

/**
 * Run aggregation for all users (called by cron job)
 */
export async function runAggregationForAllUsers(): Promise<{
  success: boolean;
  usersProcessed: number;
  errors: string[];
}> {
  const supabase = getAdminClient();

  // Get all users with Pinterest integration
  const { data: users } = await (supabase as any)
    .from('user_settings')
    .select('user_id')
    .not('integrations->pinterest', 'is', null);

  if (!users?.length) {
    return { success: true, usersProcessed: 0, errors: [] };
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const monthStart = startOfMonth(now);

  const errors: string[] = [];
  let usersProcessed = 0;

  for (const user of users) {
    try {
      // Aggregate weekly
      await aggregatePillarPerformance(user.user_id, 'week', weekStart);

      // Aggregate monthly (on first week of month)
      if (now.getDate() <= 7) {
        await aggregatePillarPerformance(user.user_id, 'month', monthStart);
      }

      // Generate new recommendations
      const recommendations = await generateMixRecommendations(user.user_id);
      await saveMixRecommendations(user.user_id, recommendations);

      usersProcessed++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`User ${user.user_id}: ${errorMsg}`);
    }
  }

  return {
    success: errors.length === 0,
    usersProcessed,
    errors,
  };
}

/**
 * Calculate action recommendations based on gaps
 */
export function calculateActionRecommendations(
  recommendations: MixRecommendation[]
): Array<{
  pillar: ContentPillar;
  action: 'increase' | 'decrease' | 'maintain';
  gap: number;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
}> {
  return recommendations
    .filter((r) => r.pillar)
    .map((r) => {
      const gap = r.recommended_percentage - (r.current_percentage || 0);
      let action: 'increase' | 'decrease' | 'maintain';
      let priority: 'high' | 'medium' | 'low';
      let suggestion: string;

      if (gap > 10) {
        action = 'increase';
        priority = 'high';
        suggestion = `Create ${Math.ceil(gap / 5)} more ${r.pillar!.name} posts this week`;
      } else if (gap > 5) {
        action = 'increase';
        priority = 'medium';
        suggestion = `Slightly increase ${r.pillar!.name} content`;
      } else if (gap < -10) {
        action = 'decrease';
        priority = 'high';
        suggestion = `Reduce ${r.pillar!.name} content and reallocate to higher performers`;
      } else if (gap < -5) {
        action = 'decrease';
        priority = 'medium';
        suggestion = `Consider reducing ${r.pillar!.name} frequency`;
      } else {
        action = 'maintain';
        priority = 'low';
        suggestion = `${r.pillar!.name} mix is on target`;
      }

      return {
        pillar: r.pillar!,
        action,
        gap,
        priority,
        suggestion,
      };
    })
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}
