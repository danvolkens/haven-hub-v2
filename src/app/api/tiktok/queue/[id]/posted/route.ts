import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/tiktok/queue/[id]/posted - Mark item as posted
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update queue item status
    const { data, error } = await (supabase as any)
      .from('tiktok_queue')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error marking as posted:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    // Log to posting log for streak tracking
    await (supabase as any)
      .from('tiktok_posting_log')
      .insert({
        user_id: user.id,
        queue_item_id: id,
        posted_at: new Date().toISOString(),
      });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in posted API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
