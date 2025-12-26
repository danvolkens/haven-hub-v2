import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getHealthSummary } from '@/lib/services/creative-health';

export async function GET() {
  try {
    const userId = await getApiUserId();

    const summary = await getHealthSummary(userId);

    if (!summary) {
      return NextResponse.json({
        total_tracked: 0,
        pending_baseline: 0,
        healthy: 0,
        declining: 0,
        fatigued: 0,
        critical: 0,
        refresh_recommended: 0,
        avg_fatigue_score: 0,
      });
    }

    return NextResponse.json(summary);
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
