import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getAllCreativeHealth } from '@/lib/services/creative-health';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get all creative health records with history
    const { data: healthRecords } = await getAllCreativeHealth(userId, { limit: 1000 });

    // Build trend data from the last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Create a map for each day
    const trendMap = new Map<string, {
      date: string;
      healthy: number;
      declining: number;
      fatigued: number;
      critical: number;
      pending: number;
      fatigueScores: number[];
    }>();

    // Initialize map with empty days for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, {
        date: dateStr,
        healthy: 0,
        declining: 0,
        fatigued: 0,
        critical: 0,
        pending: 0,
        fatigueScores: [],
      });
    }

    // Aggregate current status counts (simplified - uses current status)
    // In a full implementation, you'd reconstruct historical status from metrics_history
    const currentDateStr = today.toISOString().split('T')[0];
    const currentDay = trendMap.get(currentDateStr);

    if (currentDay) {
      for (const record of healthRecords) {
        switch (record.status) {
          case 'healthy':
            currentDay.healthy++;
            break;
          case 'declining':
            currentDay.declining++;
            break;
          case 'fatigued':
            currentDay.fatigued++;
            break;
          case 'critical':
            currentDay.critical++;
            break;
          default:
            currentDay.pending++;
        }

        if (record.baseline_ctr !== null) {
          currentDay.fatigueScores.push(record.fatigue_score);
        }
      }
    }

    // Convert map to sorted array
    const trend = Array.from(trendMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(day => ({
        date: day.date,
        healthy: day.healthy,
        declining: day.declining,
        fatigued: day.fatigued,
        critical: day.critical,
        avg_fatigue_score:
          day.fatigueScores.length > 0
            ? day.fatigueScores.reduce((a, b) => a + b, 0) / day.fatigueScores.length
            : 0,
      }));

    // Calculate 7d and 30d change
    // For now, we compare current total fatigue count to simplified historical
    const currentFatigued = healthRecords.filter(
      r => r.fatigue_score >= 50
    ).length;

    const avgFatigueScore = healthRecords.length > 0
      ? healthRecords
          .filter(r => r.baseline_ctr !== null)
          .reduce((sum, r) => sum + r.fatigue_score, 0) /
        Math.max(healthRecords.filter(r => r.baseline_ctr !== null).length, 1)
      : 0;

    // Since we don't have historical snapshots, return 0 for changes
    // In a production system, you'd store daily snapshots
    const change7d = 0;
    const change30d = 0;

    return NextResponse.json({
      trend: trend.slice(-14), // Return last 14 days for chart
      change_7d: change7d,
      change_30d: change30d,
      current_fatigued: currentFatigued,
      avg_fatigue_score: avgFatigueScore,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching creative health trend:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
