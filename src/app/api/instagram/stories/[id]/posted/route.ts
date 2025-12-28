import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Update story status to posted
    const { data: story, error } = await (supabase as any)
      .from('instagram_stories')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error marking story as posted:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error marking story as posted:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
