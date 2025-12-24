import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/popups/active - Get active popups for public display
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // This endpoint requires a user_id query param for public access
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: popups, error } = await (supabase as any)
    .from('popups')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ popups });
}
