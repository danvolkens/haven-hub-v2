import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRateLimitSummary } from '@/lib/instagram/rate-limits';

// GET /api/instagram/rate-limits - Get rate limit status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await getRateLimitSummary(supabase, user.id);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching rate limits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
