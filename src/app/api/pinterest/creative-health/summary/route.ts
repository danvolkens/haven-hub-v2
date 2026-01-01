import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getHealthSummary } from '@/lib/services/creative-health';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const summary = await getHealthSummary(userId);

    // If creative_health has data, return it
    if (summary && summary.total_tracked > 0) {
      return NextResponse.json(summary);
    }

    // Fallback: compute summary directly from pins if creative_health is empty
    // This shows meaningful data before the cron job runs
    const { data: pins, error: pinsError } = await (supabase as any)
      .from('pins')
      .select('id, impressions, saves, clicks, engagement_rate, performance_tier')
      .eq('user_id', userId)
      .eq('status', 'published');

    if (pinsError) {
      return NextResponse.json({ error: pinsError.message }, { status: 500 });
    }

    const publishedPins = pins || [];
    const pinsWithImpressions = publishedPins.filter((p: any) => (p.impressions || 0) > 0);

    // Categorize pins by performance tier as a proxy for health
    const tierCounts = {
      top: 0,
      good: 0,
      average: 0,
      underperformer: 0,
      pending: 0,
    };

    for (const pin of publishedPins) {
      const tier = pin.performance_tier || 'pending';
      if (tier in tierCounts) {
        tierCounts[tier as keyof typeof tierCounts]++;
      }
    }

    // Map tiers to health statuses:
    // top/good = healthy, average = declining, underperformer = fatigued, pending = pending_baseline
    return NextResponse.json({
      total_tracked: publishedPins.length,
      pending_baseline: tierCounts.pending,
      healthy: tierCounts.top + tierCounts.good,
      declining: tierCounts.average,
      fatigued: tierCounts.underperformer,
      critical: 0, // Can't determine without historical data
      refresh_recommended: tierCounts.underperformer,
      avg_fatigue_score: pinsWithImpressions.length > 0
        ? Math.round(
            (tierCounts.underperformer * 75 + tierCounts.average * 40 + tierCounts.good * 15 + tierCounts.top * 5) /
            (pinsWithImpressions.length || 1)
          )
        : 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching creative health summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
