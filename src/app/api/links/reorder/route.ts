import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { linkIds } = body;

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json({ error: 'No link IDs provided' }, { status: 400 });
    }

    // Update positions for each link
    const updates = linkIds.map((id: string, index: number) => ({
      id,
      position: index,
    }));

    // Update each link's position
    for (const update of updates) {
      const { error } = await (supabase as any)
        .from('link_in_bio_links')
        .update({ position: update.position })
        .eq('id', update.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating link position:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
