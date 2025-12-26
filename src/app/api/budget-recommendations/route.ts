import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPendingRecommendations,
  getRecommendationHistory,
  generateRecommendations,
  saveRecommendations,
} from '@/lib/services/budget-recommendations';
import { getAdminClient } from '@/lib/supabase/admin';

// GET: Fetch pending and historical recommendations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeHistory = searchParams.get('history') === 'true';

    const { data: pending, error: pendingError } = await getPendingRecommendations(
      user.id
    );

    if (pendingError) {
      console.error('Error fetching pending recommendations:', pendingError);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations', details: pendingError.message },
        { status: 500 }
      );
    }

    let history: any[] = [];
    if (includeHistory) {
      const { data: historyData, error: historyError } = await getRecommendationHistory(user.id);
      if (historyError) {
        console.error('Error fetching history:', historyError);
      }
      history = historyData || [];
    }

    // Calculate summary stats
    const summary = {
      pending_count: (pending || []).length,
      potential_savings: (pending || [])
        .filter((r: any) => r.recommendation_type === 'pause' || r.recommendation_type === 'decrease')
        .reduce((sum: number, r: any) => sum + Math.abs(r.projected_additional_spend || 0), 0),
      growth_opportunity: (pending || [])
        .filter((r: any) => r.recommendation_type === 'increase')
        .reduce((sum: number, r: any) => sum + (r.projected_additional_conversions || 0), 0),
    };

    return NextResponse.json({
      recommendations: pending || [],
      history: includeHistory ? history : undefined,
      summary,
    });
  } catch (error) {
    console.error('Budget recommendations GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Manually trigger recommendation generation
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getAdminClient();

  // Get user settings for guardrails
  const { data: settings } = await (adminClient as any)
    .from('user_settings')
    .select('guardrails')
    .eq('user_id', user.id)
    .single();

  // Get active campaigns
  const { data: campaigns } = await (adminClient as any)
    .from('pinterest_campaigns')
    .select('id, pinterest_campaign_id, name, daily_budget, created_at')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE');

  if (!campaigns?.length) {
    return NextResponse.json({
      message: 'No active campaigns found',
      recommendations: [],
    });
  }

  // Get metrics for each campaign
  const campaignData = await Promise.all(
    campaigns.map(async (c: any) => {
      const { data: metrics } = await (adminClient as any)
        .from('pinterest_campaign_metrics')
        .select('spend, conversions, clicks, impressions')
        .eq('campaign_id', c.id)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const totals = (metrics || []).reduce(
        (acc: any, m: any) => ({
          spend: acc.spend + (m.spend || 0),
          conversions: acc.conversions + (m.conversions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          impressions: acc.impressions + (m.impressions || 0),
        }),
        { spend: 0, conversions: 0, clicks: 0, impressions: 0 }
      );

      return {
        id: c.id,
        pinterest_campaign_id: c.pinterest_campaign_id,
        name: c.name,
        daily_budget: c.daily_budget || 0,
        spend_7d: totals.spend,
        conversions_7d: totals.conversions,
        clicks_7d: totals.clicks,
        impressions_7d: totals.impressions,
        days_active: Math.floor(
          (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      };
    })
  );

  // Generate recommendations
  const recommendations = await generateRecommendations(
    user.id,
    campaignData,
    settings?.guardrails || {}
  );

  if (recommendations.length > 0) {
    await saveRecommendations(user.id, recommendations);
  }

  return NextResponse.json({
    message: `Generated ${recommendations.length} recommendations`,
    recommendations,
  });
}
