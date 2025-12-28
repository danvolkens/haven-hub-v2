import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { subDays, format, parseISO } from 'date-fns';

// GET /api/instagram/analytics - Get analytics data
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    // Get account metrics over time
    const { data: accountMetrics } = await (supabase as any)
      .from('instagram_account_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('metrics_date', startDate)
      .order('metrics_date', { ascending: true });

    // Get aggregated post metrics
    const { data: postMetrics } = await (supabase as any)
      .from('instagram_post_metrics')
      .select(`
        *,
        instagram_scheduled_posts(
          id,
          post_type,
          caption,
          media_urls,
          scheduled_for,
          template_id
        )
      `)
      .eq('user_id', user.id)
      .gte('metrics_date', startDate)
      .order('engagement_rate', { ascending: false });

    // Get optimal times
    const { data: optimalTimes } = await (supabase as any)
      .from('instagram_optimal_times')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('rank', { ascending: true });

    // Get template performance
    const { data: templatePerformance } = await (supabase as any)
      .from('instagram_template_performance')
      .select(`
        *,
        instagram_templates(name, content_pillar)
      `)
      .eq('user_id', user.id)
      .order('avg_engagement_rate', { ascending: false });

    // Get hashtag performance
    const { data: hashtagPerformance } = await (supabase as any)
      .from('instagram_hashtag_performance')
      .select(`
        *,
        hashtag_rotation_sets(name)
      `)
      .eq('user_id', user.id)
      .order('avg_engagement_rate', { ascending: false });

    // Calculate summary stats
    const latestAccountMetric = accountMetrics?.[accountMetrics.length - 1];
    const prevAccountMetric = accountMetrics?.[0];

    const totalReach = postMetrics?.reduce((sum: number, m: any) => sum + (m.reach || 0), 0) || 0;
    const totalSaves = postMetrics?.reduce((sum: number, m: any) => sum + (m.saves || 0), 0) || 0;
    const avgEngagement = postMetrics?.length
      ? postMetrics.reduce((sum: number, m: any) => sum + parseFloat(m.engagement_rate || 0), 0) / postMetrics.length
      : 0;

    const followerGrowth = latestAccountMetric?.followers_count && prevAccountMetric?.followers_count
      ? latestAccountMetric.followers_count - prevAccountMetric.followers_count
      : 0;

    // Get top posts
    const topPosts = postMetrics?.slice(0, 5).map((m: any) => ({
      id: m.post_id,
      engagement_rate: m.engagement_rate,
      reach: m.reach,
      likes: m.likes,
      saves: m.saves,
      post_type: m.instagram_scheduled_posts?.post_type,
      caption: m.instagram_scheduled_posts?.caption?.substring(0, 100),
      thumbnail: m.instagram_scheduled_posts?.media_urls?.[0],
      scheduled_for: m.instagram_scheduled_posts?.scheduled_for,
    }));

    // Format engagement over time
    const engagementByDay: Record<string, { engagement: number; reach: number; count: number }> = {};
    postMetrics?.forEach((m: any) => {
      const date = m.metrics_date;
      if (!engagementByDay[date]) {
        engagementByDay[date] = { engagement: 0, reach: 0, count: 0 };
      }
      engagementByDay[date].engagement += parseFloat(m.engagement_rate || 0);
      engagementByDay[date].reach += m.reach || 0;
      engagementByDay[date].count++;
    });

    const engagementOverTime = Object.entries(engagementByDay)
      .map(([date, data]) => ({
        date,
        engagement_rate: data.count ? data.engagement / data.count : 0,
        reach: data.reach,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format optimal times as heatmap data
    const heatmapData: Record<number, Record<number, number>> = {};
    for (let day = 0; day <= 6; day++) {
      heatmapData[day] = {};
      for (let hour = 0; hour <= 23; hour++) {
        heatmapData[day][hour] = 0;
      }
    }
    optimalTimes?.forEach((t: any) => {
      heatmapData[t.day_of_week][t.hour] = parseFloat(t.avg_engagement_rate || 0);
    });

    return NextResponse.json({
      summary: {
        total_reach: totalReach,
        avg_engagement_rate: avgEngagement,
        total_saves: totalSaves,
        profile_views: latestAccountMetric?.profile_views || 0,
        follower_growth: followerGrowth,
        followers_count: latestAccountMetric?.followers_count || 0,
      },
      engagement_over_time: engagementOverTime,
      top_posts: topPosts,
      template_performance: templatePerformance?.map((t: any) => ({
        template_id: t.template_id,
        template_name: t.instagram_templates?.name || 'Unknown',
        content_pillar: t.instagram_templates?.content_pillar,
        times_used: t.times_used,
        avg_engagement_rate: t.avg_engagement_rate,
        avg_saves: t.avg_saves,
      })),
      hashtag_performance: hashtagPerformance?.map((h: any) => ({
        set_id: h.rotation_set_id,
        set_name: h.hashtag_rotation_sets?.name || 'Unknown',
        times_used: h.times_used,
        avg_engagement_rate: h.avg_engagement_rate,
        avg_reach: h.avg_reach,
      })),
      optimal_times_heatmap: heatmapData,
      account_history: accountMetrics,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
