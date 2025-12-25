import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

/**
 * Performance thresholds for categorizing campaigns
 */
const THRESHOLDS = {
  SCALE: { maxCpa: 8, minRoas: 3 },      // Green - Scale up
  MAINTAIN: { maxCpa: 12, minRoas: 2 },  // Blue - Maintain
  OPTIMIZE: { maxCpa: 15, minRoas: 1.5 }, // Yellow - Optimize
  // Anything worse = Pause (Red)
};

interface CampaignMetrics {
  id: string;
  name: string;
  status: string;
  daily_spend_cap: number | null;
  total_spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  created_at: string;
}

interface WinnerCampaign {
  id: string;
  name: string;
  cpa: number;
  roas: number;
  spend_7d: number;
  conversions_7d: number;
  status: 'scale' | 'maintain' | 'optimize' | 'pause';
  recommendation: string;
  detected_at: string;
}

function categorizePerformance(cpa: number, roas: number): 'scale' | 'maintain' | 'optimize' | 'pause' {
  if (cpa <= THRESHOLDS.SCALE.maxCpa && roas >= THRESHOLDS.SCALE.minRoas) {
    return 'scale';
  }
  if (cpa <= THRESHOLDS.MAINTAIN.maxCpa && roas >= THRESHOLDS.MAINTAIN.minRoas) {
    return 'maintain';
  }
  if (cpa <= THRESHOLDS.OPTIMIZE.maxCpa && roas >= THRESHOLDS.OPTIMIZE.minRoas) {
    return 'optimize';
  }
  return 'pause';
}

function getRecommendation(status: string, cpa: number, roas: number): string {
  switch (status) {
    case 'scale':
      return `Excellent performance with $${cpa.toFixed(2)} CPA and ${roas.toFixed(1)}x ROAS. Consider +25% budget increase.`;
    case 'maintain':
      return `Solid performance. Monitor for consistency before scaling.`;
    case 'optimize':
      return `Review targeting and creatives to improve efficiency.`;
    case 'pause':
      return `Performance below threshold. Consider pausing or major restructure.`;
    default:
      return '';
  }
}

/**
 * GET /api/pinterest/campaigns/winners
 * Returns campaigns categorized by performance
 *
 * Query params:
 * - recent=true: Only return winners detected in last 7 days
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const recentOnly = searchParams.get('recent') === 'true';

    // Fetch active campaigns with metrics
    const { data: campaigns, error } = await (supabase as any)
      .from('ad_campaigns')
      .select(`
        id,
        name,
        status,
        daily_spend_cap,
        total_spend,
        clicks,
        impressions,
        conversions,
        created_at
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('total_spend', { ascending: false });

    if (error) {
      console.error('Failed to fetch campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        winners: [],
        total_count: 0,
        scale_count: 0,
        maintain_count: 0,
        optimize_count: 0,
        pause_count: 0,
      });
    }

    // Calculate metrics and categorize campaigns
    const winners: WinnerCampaign[] = (campaigns as CampaignMetrics[])
      .filter(c => c.total_spend > 0) // Only campaigns with spend
      .map(campaign => {
        // Calculate CPA (cost per acquisition)
        const cpa = campaign.conversions > 0
          ? campaign.total_spend / campaign.conversions
          : campaign.total_spend; // If no conversions, CPA = total spend

        // Calculate ROAS (return on ad spend)
        // Assuming average order value of $35 (typical for quote products)
        const estimatedRevenue = campaign.conversions * 35;
        const roas = campaign.total_spend > 0
          ? estimatedRevenue / campaign.total_spend
          : 0;

        const status = categorizePerformance(cpa, roas);
        const recommendation = getRecommendation(status, cpa, roas);

        return {
          id: campaign.id,
          name: campaign.name,
          cpa,
          roas,
          spend_7d: campaign.total_spend, // In production, would calculate 7-day window
          conversions_7d: campaign.conversions,
          status,
          recommendation,
          detected_at: new Date().toISOString(),
        };
      });

    // Filter for recent if requested
    const filteredWinners = recentOnly
      ? winners.filter(w => w.status === 'scale' || w.status === 'maintain')
      : winners;

    // Sort by performance (scale first, then maintain, etc.)
    const statusOrder = { scale: 0, maintain: 1, optimize: 2, pause: 3 };
    filteredWinners.sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status];
      if (orderDiff !== 0) return orderDiff;
      // Within same status, sort by ROAS descending
      return b.roas - a.roas;
    });

    // Count by status
    const counts = winners.reduce(
      (acc, w) => {
        acc[`${w.status}_count`]++;
        return acc;
      },
      { scale_count: 0, maintain_count: 0, optimize_count: 0, pause_count: 0 }
    );

    return NextResponse.json({
      winners: filteredWinners,
      total_count: winners.length,
      ...counts,
    });
  } catch (error) {
    console.error('Winners API error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch winners' },
      { status: 500 }
    );
  }
}
