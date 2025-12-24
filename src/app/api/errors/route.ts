import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data, error, count } = await (supabase as any)
      .from('retry_queue')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get counts by status
    const { data: statusCounts } = await (supabase as any)
      .from('retry_queue')
      .select('status')
      .eq('user_id', userId);

    const counts = {
      pending: 0,
      processing: 0,
      resolved: 0,
      failed: 0,
    };

    statusCounts?.forEach((item: { status: string }) => {
      counts[item.status as keyof typeof counts]++;
    });

    return NextResponse.json({
      items: data,
      total: count,
      counts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
