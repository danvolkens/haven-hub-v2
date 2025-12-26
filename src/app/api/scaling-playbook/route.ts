import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/supabase/admin';

const DEFAULT_PHASE_TARGETS = {
  phase_1: {
    name: 'Foundation',
    weeks: '1-4',
    pins_per_week: 15,
    boards_to_create: 5,
    products_to_mockup: 20,
    target_impressions: 10000,
  },
  phase_2: {
    name: 'Growth',
    weeks: '5-8',
    pins_per_week: 25,
    ad_budget_daily: 10,
    target_traffic: 500,
    conversion_rate: 0.02,
  },
  phase_3: {
    name: 'Optimization',
    weeks: '9-12',
    pins_per_week: 35,
    ad_budget_daily: 25,
    target_roas: 2.0,
    winner_refresh_count: 10,
  },
  phase_4: {
    name: 'Scale',
    weeks: '13-16',
    pins_per_week: 50,
    ad_budget_daily: 50,
    target_revenue: 5000,
    automation_level: 0.8,
  },
};

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = getAdminClient();

    // Get playbook progress
    const { data: progress } = await (supabase as any)
      .from('scaling_playbook_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get snapshots
    const { data: snapshots } = await (supabase as any)
      .from('scaling_kpi_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('week_number', { ascending: true });

    if (!progress) {
      return NextResponse.json({
        started: false,
        progress: null,
        snapshots: [],
        currentMetrics: {
          pinsThisWeek: 0,
          impressionsThisWeek: 0,
          savesThisWeek: 0,
          clicksThisWeek: 0,
          adSpendThisWeek: 0,
          revenueThisWeek: 0,
        },
      });
    }

    // Get current week metrics from analytics
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get pins published this week
    const { count: pinsThisWeek } = await (supabase as any)
      .from('pins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('published_at', weekStartStr);

    // Get analytics for this week
    const { data: analytics } = await (supabase as any)
      .from('pinterest_analytics')
      .select('impressions, saves, clicks')
      .eq('user_id', userId)
      .gte('date', weekStartStr);

    const impressionsThisWeek = analytics?.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0) || 0;
    const savesThisWeek = analytics?.reduce((sum: number, a: any) => sum + (a.saves || 0), 0) || 0;
    const clicksThisWeek = analytics?.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0) || 0;

    // Get ad spend this week (mock for now)
    const adSpendThisWeek = 0;
    const revenueThisWeek = 0;

    return NextResponse.json({
      started: true,
      progress,
      snapshots: snapshots || [],
      currentMetrics: {
        pinsThisWeek: pinsThisWeek || 0,
        impressionsThisWeek,
        savesThisWeek,
        clicksThisWeek,
        adSpendThisWeek,
        revenueThisWeek,
      },
    });
  } catch (error) {
    console.error('Error fetching scaling playbook:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch playbook' },
      { status: 500 }
    );
  }
}
