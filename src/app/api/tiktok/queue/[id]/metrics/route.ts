import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/tiktok/queue/[id]/metrics - Save performance metrics
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

    const body = await request.json();
    const { views, likes, comments, shares } = body;

    // Update queue item metrics
    const { data, error } = await (supabase as any)
      .from('tiktok_queue')
      .update({
        views: views ?? null,
        likes: likes ?? null,
        comments: comments ?? null,
        shares: shares ?? null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error saving metrics:', error);
      return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in metrics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
