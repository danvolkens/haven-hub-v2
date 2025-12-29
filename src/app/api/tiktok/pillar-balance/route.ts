import { NextRequest, NextResponse } from 'next/server';
import {
  getTikTokPillarBalance,
  getTimeSlotBalance,
  getPostingStreak,
  getRecommendedNextPillar,
} from '@/lib/tiktok/pillar-balance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'balance';
    const period = (searchParams.get('period') as 'week' | 'month') || 'week';

    switch (action) {
      case 'balance': {
        const balance = await getTikTokPillarBalance(period);
        return NextResponse.json(balance);
      }

      case 'time-slots': {
        const slots = await getTimeSlotBalance(period);
        return NextResponse.json(slots);
      }

      case 'streak': {
        const streak = await getPostingStreak();
        return NextResponse.json(streak);
      }

      case 'next-pillar': {
        const recommendation = await getRecommendedNextPillar();
        return NextResponse.json(recommendation);
      }

      case 'full-dashboard': {
        // Get all data at once for dashboard
        const [balance, timeSlots, streak, nextPillar] = await Promise.all([
          getTikTokPillarBalance(period),
          getTimeSlotBalance(period),
          getPostingStreak(),
          getRecommendedNextPillar(),
        ]);

        return NextResponse.json({
          balance,
          timeSlots,
          streak,
          nextPillar,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in pillar balance API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
