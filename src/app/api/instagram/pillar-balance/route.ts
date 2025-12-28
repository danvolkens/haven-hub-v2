import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PILLAR_CONFIG = {
  product_showcase: { label: 'Product Showcase', target: 40, minimum: 30 },
  brand_story: { label: 'Brand Story', target: 20, minimum: 15 },
  educational: { label: 'Educational', target: 20, minimum: 15 },
  community: { label: 'Community', target: 20, minimum: 15 },
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get posts from this week (Sunday to Saturday)
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
      .gte('scheduled_at', startOfWeek.toISOString());

    // Count posts by pillar
    const counts: Record<string, number> = {
      product_showcase: 0,
      brand_story: 0,
      educational: 0,
      community: 0,
    };

    for (const post of posts || []) {
      const pillar = post.content_pillar || 'product_showcase';
      if (counts.hasOwnProperty(pillar)) {
        counts[pillar]++;
      }
    }

    const totalPosts = Object.values(counts).reduce((a, b) => a + b, 0);

    // Calculate percentages and status
    const balance = Object.entries(PILLAR_CONFIG).map(([pillar, config]) => {
      const count = counts[pillar] || 0;
      const actual = totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0;
      const status = actual < config.minimum ? 'warning' : 'ok';

      let suggestion: string | null = null;
      if (status === 'warning') {
        if (pillar === 'educational') {
          suggestion = 'Schedule a how-to carousel or tips post';
        } else if (pillar === 'community') {
          suggestion = 'Add a user spotlight or Q&A post';
        } else if (pillar === 'brand_story') {
          suggestion = 'Share your brand story or behind-the-scenes';
        }
      }

      return {
        pillar,
        label: config.label,
        actual,
        target: config.target,
        minimum: config.minimum,
        count,
        status,
        suggestion,
      };
    });

    const isHealthy = balance.every(p => p.status === 'ok');
    return NextResponse.json({ balance, isHealthy, total_posts: totalPosts });
  } catch (error) {
    console.error('Error fetching pillar balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
