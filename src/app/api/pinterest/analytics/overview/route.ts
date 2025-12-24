import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get Pinterest analytics overview
    const { data: pins, error } = await (supabase as any)
      .from('pins')
      .select('impressions, saves, clicks, status')
      .eq('user_id', userId)
      .eq('status', 'published');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const overview = {
      totalPins: pins?.length || 0,
      totalImpressions: pins?.reduce((sum: number, p: any) => sum + (p.impressions || 0), 0) || 0,
      totalSaves: pins?.reduce((sum: number, p: any) => sum + (p.saves || 0), 0) || 0,
      totalClicks: pins?.reduce((sum: number, p: any) => sum + (p.clicks || 0), 0) || 0,
      engagementRate: 0,
    };

    if (overview.totalImpressions > 0) {
      overview.engagementRate = ((overview.totalSaves + overview.totalClicks) / overview.totalImpressions) * 100;
    }

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
