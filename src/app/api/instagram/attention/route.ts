import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attentionItems: Array<{
      type: string;
      message: string;
      action_url: string;
      count?: number;
    }> = [];

    // Check for posts pending review
    const { count: reviewCount } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .eq('requires_review', true);

    if (reviewCount && reviewCount > 0) {
      attentionItems.push({
        type: 'review_queue',
        message: `${reviewCount} post${reviewCount > 1 ? 's' : ''} awaiting review`,
        action_url: '/dashboard/instagram/review',
        count: reviewCount,
      });
    }

    // Check pillar balance warnings
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: posts } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .select('content_pillar')
      .eq('user_id', user.id)
      .in('status', ['scheduled', 'published'])
      .gte('scheduled_for', startOfWeek.toISOString());

    const counts: Record<string, number> = {};
    for (const post of posts || []) {
      const pillar = post.content_pillar || 'product_showcase';
      counts[pillar] = (counts[pillar] || 0) + 1;
    }

    const totalPosts = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalPosts > 0) {
      const educationalPct = ((counts['educational'] || 0) / totalPosts) * 100;
      if (educationalPct < 15) {
        attentionItems.push({
          type: 'pillar_warning',
          message: 'Educational content is below 15% this week',
          action_url: '/dashboard/instagram/calendar',
        });
      }
    }

    // Check for missing stories today
    const today = new Date().toISOString().split('T')[0];
    const { count: storyCount } = await (supabase as any)
      .from('instagram_stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('scheduled_for', `${today}T00:00:00`)
      .lte('scheduled_for', `${today}T23:59:59`);

    if (!storyCount || storyCount < 2) {
      attentionItems.push({
        type: 'missing_stories',
        message: `Only ${storyCount || 0}/2 stories scheduled for today`,
        action_url: '/dashboard/instagram/stories',
      });
    }

    // Check footage pool health
    const { count: footageCount } = await (supabase as any)
      .from('stock_footage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('usage_count', 0);

    if (footageCount !== null && footageCount < 5) {
      attentionItems.push({
        type: 'pool_warning',
        message: `Only ${footageCount} unused footage clips remaining`,
        action_url: '/dashboard/instagram/footage',
      });
    }

    return NextResponse.json({ items: attentionItems });
  } catch (error) {
    console.error('Error fetching attention items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
