import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import {
  scheduleBulkPins,
  getOptimalPostingTimes,
  type SchedulingStrategy,
} from '@/lib/pinterest/pin-service';

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    const { pinIds, strategy, spreadDays, pinsPerDay, startDate } = body;

    if (!pinIds || !Array.isArray(pinIds) || pinIds.length === 0) {
      return NextResponse.json(
        { error: 'pinIds array is required' },
        { status: 400 }
      );
    }

    if (!strategy || !['immediate', 'optimal', 'spread'].includes(strategy)) {
      return NextResponse.json(
        { error: 'Valid strategy is required: immediate, optimal, or spread' },
        { status: 400 }
      );
    }

    const result = await scheduleBulkPins(userId, pinIds, {
      strategy: strategy as SchedulingStrategy,
      spreadDays: spreadDays ? parseInt(spreadDays) : undefined,
      pinsPerDay: pinsPerDay ? parseInt(pinsPerDay) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
    });

    return NextResponse.json(result);
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

// GET endpoint to preview optimal posting times
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '4');

    const times = await getOptimalPostingTimes(userId, count);

    return NextResponse.json({
      optimalTimes: times.map((t) => ({
        hour: t.getHours(),
        formatted: t.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      })),
    });
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
