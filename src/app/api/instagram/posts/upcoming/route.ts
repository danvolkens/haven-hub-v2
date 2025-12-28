import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get posts scheduled for this week
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const { data: posts, error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .select(`
        id,
        scheduled_at,
        post_type,
        content_pillar,
        caption,
        media_urls
      `)
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', endOfWeek.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching upcoming posts:', error);
      return NextResponse.json([]);
    }

    // Transform to expected format
    const upcomingPosts = (posts || []).map((post: any) => ({
      id: post.id,
      scheduled_at: post.scheduled_at,
      post_type: post.post_type || 'feed',
      content_pillar: post.content_pillar || 'product_showcase',
      caption: post.caption || '',
      thumbnail_url: post.media_urls?.[0] || null,
    }));

    return NextResponse.json(upcomingPosts);
  } catch (error) {
    console.error('Error fetching upcoming posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
