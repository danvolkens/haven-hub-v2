import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PATCH /api/tiktok/queue/[id]/metrics - Save performance metrics
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { views, likes, comments, shares } = body;

    // Validate metrics are numbers or null
    if (views !== undefined && views !== null && typeof views !== 'number') {
      return NextResponse.json({ error: 'Invalid views value' }, { status: 400 });
    }
    if (likes !== undefined && likes !== null && typeof likes !== 'number') {
      return NextResponse.json({ error: 'Invalid likes value' }, { status: 400 });
    }
    if (comments !== undefined && comments !== null && typeof comments !== 'number') {
      return NextResponse.json({ error: 'Invalid comments value' }, { status: 400 });
    }
    if (shares !== undefined && shares !== null && typeof shares !== 'number') {
      return NextResponse.json({ error: 'Invalid shares value' }, { status: 400 });
    }

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
