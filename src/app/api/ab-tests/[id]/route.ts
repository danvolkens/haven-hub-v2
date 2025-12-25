import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getTestWithVariants,
  getTestResults,
  calculateSignificance,
  startTest,
  pauseTest,
  resumeTest,
  cancelTest,
  declareWinner,
  deleteTest,
} from '@/lib/services/ab-testing';

// GET /api/ab-tests/[id] - Get test details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const includeResults = searchParams.get('results') === 'true';
  const includeSignificance = searchParams.get('significance') === 'true';

  const testData = await getTestWithVariants(user.id, id);
  if (!testData) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  const response: Record<string, unknown> = {
    test: testData.test,
    variants: testData.variants,
  };

  if (includeResults) {
    response.results = await getTestResults(id);
  }

  if (includeSignificance) {
    const significanceResult = await calculateSignificance(id);
    response.significance = significanceResult.result || null;
  }

  return NextResponse.json(response);
}

// PATCH /api/ab-tests/[id] - Update test status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, winner_variant_id, confidence } = body;

  let result: { success: boolean; error?: string };

  switch (action) {
    case 'start':
      result = await startTest(user.id, id);
      break;
    case 'pause':
      result = await pauseTest(user.id, id);
      break;
    case 'resume':
      result = await resumeTest(user.id, id);
      break;
    case 'cancel':
      result = await cancelTest(user.id, id);
      break;
    case 'declare_winner':
      if (!winner_variant_id) {
        return NextResponse.json(
          { error: 'winner_variant_id is required' },
          { status: 400 }
        );
      }
      result = await declareWinner(user.id, id, winner_variant_id, confidence || 0);
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Return updated test
  const testData = await getTestWithVariants(user.id, id);
  return NextResponse.json(testData);
}

// DELETE /api/ab-tests/[id] - Delete test (drafts only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await deleteTest(user.id, id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
