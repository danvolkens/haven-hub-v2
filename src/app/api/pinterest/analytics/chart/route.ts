import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get pins with their published dates
    const { data: pins, error } = await (supabase as any)
      .from('pins')
      .select('published_at, impressions, saves, clicks')
      .eq('user_id', userId)
      .eq('status', 'published')
      .gte('published_at', startDate.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by date
    const chartData: Record<string, { date: string; impressions: number; saves: number; clicks: number }> = {};

    pins?.forEach((pin: any) => {
      if (pin.published_at) {
        const date = pin.published_at.split('T')[0];
        if (!chartData[date]) {
          chartData[date] = { date, impressions: 0, saves: 0, clicks: 0 };
        }
        chartData[date].impressions += pin.impressions || 0;
        chartData[date].saves += pin.saves || 0;
        chartData[date].clicks += pin.clicks || 0;
      }
    });

    return NextResponse.json(Object.values(chartData).sort((a, b) => a.date.localeCompare(b.date)));
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
