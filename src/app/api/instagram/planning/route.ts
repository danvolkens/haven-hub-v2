/**
 * API Route: Monthly Planning
 * Get and manage monthly content themes
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getMonthlyPlan,
  getAllMonthlyPlans,
  initializeMonthlyThemes,
  updateMonthlyPlan,
  generateMonthCalendars,
  getMonthProgress,
} from '@/lib/instagram/monthly-planning';

// GET - Get monthly plans
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const monthNumber = searchParams.get('monthNumber');
    const startDate = searchParams.get('startDate');

    switch (action) {
      case 'all':
        const allPlans = await getAllMonthlyPlans();
        return NextResponse.json(allPlans);

      case 'single':
        if (!monthNumber) {
          return NextResponse.json(
            { error: 'Month number required' },
            { status: 400 }
          );
        }
        const plan = await getMonthlyPlan(parseInt(monthNumber));
        if (!plan) {
          return NextResponse.json(
            { error: 'Plan not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(plan);

      case 'progress':
        if (!monthNumber || !startDate) {
          return NextResponse.json(
            { error: 'Month number and start date required' },
            { status: 400 }
          );
        }
        const progress = await getMonthProgress(
          parseInt(monthNumber),
          new Date(startDate)
        );
        return NextResponse.json(progress);

      case 'calendars':
        if (!monthNumber || !startDate) {
          return NextResponse.json(
            { error: 'Month number and start date required' },
            { status: 400 }
          );
        }
        const calendars = await generateMonthCalendars(
          parseInt(monthNumber),
          new Date(startDate)
        );
        return NextResponse.json(calendars);

      default:
        // Return all plans by default
        const defaultPlans = await getAllMonthlyPlans();
        return NextResponse.json(defaultPlans);
    }
  } catch (error) {
    console.error('Planning GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning data' },
      { status: 500 }
    );
  }
}

// POST - Initialize or update monthly plans
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'initialize':
        const initialized = await initializeMonthlyThemes();
        return NextResponse.json({ success: initialized });

      case 'update':
        const { monthNumber, updates } = body as {
          monthNumber: number;
          updates: Parameters<typeof updateMonthlyPlan>[1];
        };
        if (!monthNumber) {
          return NextResponse.json(
            { error: 'Month number required' },
            { status: 400 }
          );
        }
        const updated = await updateMonthlyPlan(monthNumber, updates);
        return NextResponse.json({ success: updated });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Planning POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
