import { NextRequest, NextResponse } from 'next/server';
import {
  recordPostMetrics,
  getWeeklyPerformance,
  getBestPostingTimes,
  getGrowthBenchmarks,
  updateTimeSlotPerformance,
} from '@/lib/tiktok/performance-tracking';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'weekly';
    const weekStart = searchParams.get('week_start');

    switch (action) {
      case 'weekly': {
        const startDate = weekStart ? new Date(weekStart) : undefined;
        const summary = await getWeeklyPerformance(startDate);
        return NextResponse.json(summary);
      }

      case 'best-times': {
        const times = await getBestPostingTimes();
        return NextResponse.json(times);
      }

      case 'benchmarks': {
        const benchmarks = await getGrowthBenchmarks();
        return NextResponse.json(benchmarks);
      }

      case 'full-analytics': {
        // Get all data for analytics page
        const startDate = weekStart ? new Date(weekStart) : undefined;
        const [weekly, bestTimes, benchmarks] = await Promise.all([
          getWeeklyPerformance(startDate),
          getBestPostingTimes(),
          getGrowthBenchmarks(),
        ]);

        return NextResponse.json({
          weekly,
          bestTimes,
          benchmarks,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in metrics API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, post_id, metrics, is_final } = body;

    switch (action) {
      case 'record': {
        if (!post_id || !metrics) {
          return NextResponse.json(
            { error: 'post_id and metrics are required' },
            { status: 400 }
          );
        }

        const success = await recordPostMetrics(
          post_id,
          metrics,
          is_final || false
        );

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to record metrics' },
            { status: 500 }
          );
        }

        // Update time slot performance
        await updateTimeSlotPerformance(post_id);

        return NextResponse.json({ success: true });
      }

      case 'update-time-slot': {
        if (!post_id) {
          return NextResponse.json(
            { error: 'post_id is required' },
            { status: 400 }
          );
        }

        await updateTimeSlotPerformance(post_id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in metrics API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
