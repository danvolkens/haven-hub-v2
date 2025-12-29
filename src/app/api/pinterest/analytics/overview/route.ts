import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get all published pins with analytics
    const { data: pins, error } = await (supabase as any)
      .from('pins')
      .select('impressions, saves, clicks, performance_tier, analytics_updated_at, last_metrics_sync')
      .eq('user_id', userId)
      .eq('status', 'published');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const impressions = pins?.reduce((sum: number, p: any) => sum + (p.impressions || 0), 0) || 0;
    const saves = pins?.reduce((sum: number, p: any) => sum + (p.saves || 0), 0) || 0;
    const clicks = pins?.reduce((sum: number, p: any) => sum + (p.clicks || 0), 0) || 0;

    // Count performance tiers
    const topPerformers = pins?.filter((p: any) =>
      p.performance_tier === 'top' || p.performance_tier === 'good'
    ).length || 0;

    const underperformers = pins?.filter((p: any) =>
      p.performance_tier === 'underperformer'
    ).length || 0;

    // Find most recent sync time
    const lastSynced = pins?.reduce((latest: string | null, p: any) => {
      const syncTime = p.analytics_updated_at || p.last_metrics_sync;
      if (!syncTime) return latest;
      if (!latest) return syncTime;
      return new Date(syncTime) > new Date(latest) ? syncTime : latest;
    }, null);

    const overview = {
      impressions,
      saves,
      clicks,
      engagementRate: impressions > 0 ? ((saves + clicks) / impressions) * 100 : 0,
      publishedPins: pins?.length || 0,
      topPerformers,
      underperformers,
      lastSynced,
    };

    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
