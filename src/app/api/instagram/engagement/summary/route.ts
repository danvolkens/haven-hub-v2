/**
 * API Route: Engagement Summary
 * Returns daily engagement task summary
 */

import { NextResponse } from 'next/server';
import { getDailySummary } from '@/lib/instagram/engagement-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    const summary = await getDailySummary(date);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Engagement summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement summary' },
      { status: 500 }
    );
  }
}
