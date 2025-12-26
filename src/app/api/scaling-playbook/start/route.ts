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

export async function POST() {
  try {
    const userId = await getApiUserId();
    const supabase = getAdminClient();

    // Check if already started
    const { data: existing } = await (supabase as any)
      .from('scaling_playbook_progress')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Playbook already started' }, { status: 400 });
    }

    // Create new progress
    const { data: progress, error } = await (supabase as any)
      .from('scaling_playbook_progress')
      .insert({
        user_id: userId,
        current_phase: 1,
        current_week: 1,
        phase_targets: DEFAULT_PHASE_TARGETS,
        phase_started_at: new Date().toISOString(),
        playbook_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error starting playbook:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start playbook' },
      { status: 500 }
    );
  }
}
