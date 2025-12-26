import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPillarPerformance,
  getLatestPillarSummary,
} from '@/lib/services/content-pillars';

/**
 * GET /api/content-pillars/performance
 * Get pillar performance data for the authenticated user
 *
 * Query params:
 *   - period_type: 'week' | 'month' | 'quarter' (default: 'week')
 *   - limit: number of periods to return (default: 4)
 *   - latest: if 'true', only return the most recent period
 */
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
    const periodType = (searchParams.get('period_type') || 'week') as
      | 'week'
      | 'month'
      | 'quarter';
    const limit = parseInt(searchParams.get('limit') || '4', 10);
    const latest = searchParams.get('latest') === 'true';

    if (latest) {
      // Get only the most recent period summary
      const { performance, period } = await getLatestPillarSummary(user.id);

      return NextResponse.json({
        performance,
        period,
        total_content: performance.reduce(
          (sum, p) => sum + (p.content_count || 0),
          0
        ),
        total_impressions: performance.reduce(
          (sum, p) => sum + (p.impressions || 0),
          0
        ),
      });
    }

    // Get historical performance data
    const performance = await getPillarPerformance(user.id, periodType, limit);

    // Group by period
    const groupedByPeriod = performance.reduce(
      (acc, p) => {
        const key = p.period_start;
        if (!acc[key]) {
          acc[key] = {
            period_start: p.period_start,
            period_type: p.period_type,
            pillars: [],
          };
        }
        acc[key].pillars.push(p);
        return acc;
      },
      {} as Record<
        string,
        {
          period_start: string;
          period_type: string;
          pillars: typeof performance;
        }
      >
    );

    return NextResponse.json({
      periods: Object.values(groupedByPeriod),
      period_type: periodType,
    });
  } catch (error) {
    console.error('Error fetching pillar performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pillar performance' },
      { status: 500 }
    );
  }
}
