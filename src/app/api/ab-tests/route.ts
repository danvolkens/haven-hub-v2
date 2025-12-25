import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTest, getTests, type CreateTestInput } from '@/lib/services/ab-testing';

// GET /api/ab-tests - List A/B tests
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const { tests, count } = await getTests(user.id, {
    status: status as any,
    limit,
    offset,
  });

  return NextResponse.json({ tests, count });
}

// POST /api/ab-tests - Create A/B test
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as CreateTestInput;

  // Validate required fields
  if (!body.name || !body.test_type || !body.control || !body.variants) {
    return NextResponse.json(
      { error: 'Missing required fields: name, test_type, control, variants' },
      { status: 400 }
    );
  }

  if (body.variants.length === 0) {
    return NextResponse.json(
      { error: 'At least one test variant is required' },
      { status: 400 }
    );
  }

  try {
    const result = await createTest(user.id, body);
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create test' },
        { status: 500 }
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test' },
      { status: 500 }
    );
  }
}
