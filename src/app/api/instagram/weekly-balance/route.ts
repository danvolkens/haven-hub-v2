/**
 * API Route: Instagram Weekly Balance
 * Returns weekly content balance including content types and pillar distribution
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWeeklyBalance } from '@/lib/instagram/weekly-balance';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get start date from query params, default to today
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const startDate = startDateParam ? new Date(startDateParam) : new Date();

    const balance = await getWeeklyBalance(startDate);

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Weekly balance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly balance' },
      { status: 500 }
    );
  }
}
