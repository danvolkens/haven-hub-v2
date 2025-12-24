import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { getJourneyAnalytics } from '@/lib/customers/journey-service';

export async function GET() {
  try {
    const userId = await getUserId();
    const analytics = await getJourneyAnalytics(userId);

    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
