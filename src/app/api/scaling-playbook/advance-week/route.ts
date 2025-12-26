import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const userId = await getApiUserId();
    const supabase = getAdminClient();

    // Get current progress
    const { data: progress } = await (supabase as any)
      .from('scaling_playbook_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!progress) {
      return NextResponse.json({ error: 'Playbook not started' }, { status: 400 });
    }

    if (progress.current_week >= 16) {
      return NextResponse.json({ error: 'Playbook already complete' }, { status: 400 });
    }

    // Calculate current week metrics for snapshot
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get pins published this week
    const { count: pinsPublished } = await (supabase as any)
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

    const impressions = analytics?.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0) || 0;
    const saves = analytics?.reduce((sum: number, a: any) => sum + (a.saves || 0), 0) || 0;
    const clicks = analytics?.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0) || 0;

    // Calculate score based on phase targets
    const currentPhaseTargets = progress.phase_targets[`phase_${progress.current_phase}`];
    let score = 0;
    let goalsMet: Record<string, boolean> = {};

    if (currentPhaseTargets.pins_per_week) {
      const pinsMet = (pinsPublished || 0) >= currentPhaseTargets.pins_per_week;
      goalsMet.pins = pinsMet;
      if (pinsMet) score += 25;
    }

    if (currentPhaseTargets.target_impressions) {
      const impressionsMet = impressions >= currentPhaseTargets.target_impressions;
      goalsMet.impressions = impressionsMet;
      if (impressionsMet) score += 25;
    }

    // Default minimum score
    score = Math.max(score, 25);

    // Create snapshot for current week
    await (supabase as any)
      .from('scaling_kpi_snapshots')
      .upsert({
        user_id: userId,
        week_number: progress.current_week,
        phase: progress.current_phase,
        snapshot_date: new Date().toISOString().split('T')[0],
        pins_published: pinsPublished || 0,
        impressions,
        saves,
        clicks,
        engagement_rate: impressions > 0 ? (saves + clicks) / impressions : 0,
        ad_spend: 0,
        ad_impressions: 0,
        ad_clicks: 0,
        ad_conversions: 0,
        ad_revenue: 0,
        ad_roas: 0,
        organic_traffic: clicks,
        total_conversions: 0,
        total_revenue: 0,
        goals_met: goalsMet,
        overall_score: score,
      }, {
        onConflict: 'user_id,week_number',
      });

    // Advance to next week
    const newWeek = progress.current_week + 1;
    const newPhase = Math.ceil(newWeek / 4);

    const updates: Record<string, any> = {
      current_week: newWeek,
    };

    // Check if moving to new phase
    if (newPhase > progress.current_phase && newPhase <= 4) {
      updates.current_phase = newPhase;
      updates.phase_started_at = new Date().toISOString();
    }

    // Update progress
    const { error } = await (supabase as any)
      .from('scaling_playbook_progress')
      .update(updates)
      .eq('id', progress.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      newWeek,
      newPhase: newPhase <= 4 ? newPhase : progress.current_phase,
      snapshotScore: score,
    });
  } catch (error) {
    console.error('Error advancing week:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to advance week' },
      { status: 500 }
    );
  }
}
