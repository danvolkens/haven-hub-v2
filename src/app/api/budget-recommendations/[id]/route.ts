import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  applyRecommendation,
  rejectRecommendation,
} from '@/lib/services/budget-recommendations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST: Apply or reject a recommendation
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { action, reason } = body;

    if (action === 'apply') {
      await applyRecommendation(user.id, id);
      return NextResponse.json({
        success: true,
        message: 'Recommendation applied successfully',
      });
    } else if (action === 'reject') {
      await rejectRecommendation(user.id, id, reason);
      return NextResponse.json({
        success: true,
        message: 'Recommendation rejected',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "apply" or "reject"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing recommendation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process recommendation' },
      { status: 500 }
    );
  }
}

// GET: Get a single recommendation
export async function GET(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const { data, error } = await (supabase as any)
    .from('budget_recommendations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Recommendation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
