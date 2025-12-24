import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
    const { id } = await params;

    // Reset item for immediate retry
    const { data, error } = await (supabase as any)
      .from('retry_queue')
      .update({
        status: 'pending',
        next_retry_at: new Date().toISOString(),
        worker_id: null,
        claimed_at: null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .in('status', ['failed', 'pending'])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
