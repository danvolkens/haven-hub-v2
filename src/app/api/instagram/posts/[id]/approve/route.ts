import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/instagram/posts/[id]/approve - Approve a draft post
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

    // Update post status from draft to scheduled
    const { data: post, error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .update({
        status: 'scheduled',
        requires_review: false,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) {
      console.error('Error approving post:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: 'Post not found or already approved' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error approving post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
