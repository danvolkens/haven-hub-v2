import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/instagram/posts/approve - Approve draft posts
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    // Update posts status from draft to scheduled
    const { data, error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .update({
        status: 'scheduled',
        requires_review: false,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .select();

    if (error) {
      console.error('Error approving posts:', error);
      return NextResponse.json({ error: 'Failed to approve posts' }, { status: 500 });
    }

    // Log activity
    await (supabase as any)
      .from('user_activity')
      .insert({
        user_id: user.id,
        activity_type: 'posts_approved',
        metadata: {
          post_ids: ids,
          count: data?.length || 0,
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      approved: data?.length || 0,
    });
  } catch (error) {
    console.error('Error in approve API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
