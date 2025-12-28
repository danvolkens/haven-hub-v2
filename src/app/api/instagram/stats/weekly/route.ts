import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get posts from the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: posts } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .gte('published_at', weekAgo.toISOString());

    // Get metrics from the last 7 days
    const { data: metrics } = await (supabase as any)
      .from('instagram_post_metrics')
      .select('reach, impressions, engagement, saves, comments, likes')
      .eq('user_id', user.id)
      .gte('created_at', weekAgo.toISOString());

    // Calculate totals
    const totalReach = metrics?.reduce((sum: number, m: any) => sum + (m.reach || 0), 0) || 0;
    const totalEngagement = metrics?.reduce((sum: number, m: any) => sum + (m.engagement || 0), 0) || 0;
    const totalSaves = metrics?.reduce((sum: number, m: any) => sum + (m.saves || 0), 0) || 0;
    const totalImpressions = metrics?.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0) || 0;

    // Calculate engagement rate
    const engagementRate = totalImpressions > 0
      ? (totalEngagement / totalImpressions) * 100
      : 0;

    // Get previous week for trend comparison
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: prevMetrics } = await (supabase as any)
      .from('instagram_post_metrics')
      .select('engagement, impressions')
      .eq('user_id', user.id)
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', weekAgo.toISOString());

    const prevEngagement = prevMetrics?.reduce((sum: number, m: any) => sum + (m.engagement || 0), 0) || 0;
    const prevImpressions = prevMetrics?.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0) || 0;
    const prevEngagementRate = prevImpressions > 0
      ? (prevEngagement / prevImpressions) * 100
      : 0;

    const engagementTrend = engagementRate - prevEngagementRate;

    // Get profile visits from account metrics
    const { data: accountMetrics } = await (supabase as any)
      .from('instagram_account_metrics')
      .select('profile_views')
      .eq('user_id', user.id)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(1);

    return NextResponse.json({
      posts_published: posts?.length || 0,
      total_reach: totalReach,
      engagement_rate: Math.round(engagementRate * 10) / 10,
      engagement_trend: Math.round(engagementTrend * 10) / 10,
      saves: totalSaves,
      profile_visits: accountMetrics?.[0]?.profile_views || 0,
    });
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
