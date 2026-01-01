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

    // Get all published pins with metrics
    const { data: pins, error } = await (supabase as any)
      .from('pins')
      .select('published_at, last_metrics_sync, created_at, impressions, saves, clicks')
      .eq('user_id', userId)
      .eq('status', 'published');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by date - use published_at, falling back to last_metrics_sync or created_at
    const chartData: Record<string, { date: string; impressions: number; saves: number; clicks: number }> = {};

    pins?.forEach((pin: any) => {
      // Use first available date field
      const dateField = pin.published_at || pin.last_metrics_sync || pin.created_at;
      if (dateField) {
        const date = dateField.split('T')[0];
        // Only include data from within the date range
        if (new Date(date) >= startDate) {
          if (!chartData[date]) {
            chartData[date] = { date, impressions: 0, saves: 0, clicks: 0 };
          }
          chartData[date].impressions += pin.impressions || 0;
          chartData[date].saves += pin.saves || 0;
          chartData[date].clicks += pin.clicks || 0;
        }
      }
    });

    // If no data by date, create a single "today" entry with totals
    if (Object.keys(chartData).length === 0 && pins?.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      chartData[today] = {
        date: today,
        impressions: pins.reduce((sum: number, p: any) => sum + (p.impressions || 0), 0),
        saves: pins.reduce((sum: number, p: any) => sum + (p.saves || 0), 0),
        clicks: pins.reduce((sum: number, p: any) => sum + (p.clicks || 0), 0),
      };
    }

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
