/**
 * Instagram Metrics Sync Job
 * Prompt 10.1: Fetch and sync Instagram metrics daily
 */

import { schedules, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import { subDays, format, parseISO, getDay, getHours } from 'date-fns';

// ============================================================================
// Configuration
// ============================================================================

const GRAPH_API_VERSION = 'v18.0';
const METRICS_LOOKBACK_DAYS = 30;

// ============================================================================
// Supabase Client Factory
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// Instagram API Helper
// ============================================================================

async function fetchInstagramApi(
  accessToken: string,
  endpoint: string,
  params: Record<string, string> = {}
) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${endpoint}`);
  url.searchParams.set('access_token', accessToken);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Instagram API error: ${JSON.stringify(error)}`);
  }
  return response.json();
}

// ============================================================================
// Metrics Sync Job
// ============================================================================

export const syncInstagramMetricsTask = schedules.task({
  id: 'sync-instagram-metrics',
  cron: '0 6 * * *', // Every day at 6 AM

  run: async () => {
    const supabase = getSupabaseClient();
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const lookbackDate = subDays(today, METRICS_LOOKBACK_DAYS);

    logger.info('Starting Instagram metrics sync', { today: todayStr });

    // Get all connected Instagram accounts
    const { data: connections, error: connError } = await (supabase as any)
      .from('integrations')
      .select('user_id, metadata')
      .eq('provider', 'instagram')
      .eq('status', 'connected');

    if (connError || !connections?.length) {
      logger.info('No Instagram connections found');
      return { success: true, synced: 0 };
    }

    let syncedAccounts = 0;
    let syncedPosts = 0;
    let errors = 0;

    for (const connection of connections) {
      try {
        const accessToken = connection.metadata?._access_token;
        const igUserId = connection.metadata?.ig_user_id;

        if (!accessToken || !igUserId) {
          logger.warn('Missing credentials for user', { userId: connection.user_id });
          continue;
        }

        // 1. Fetch account metrics
        try {
          const accountData = await fetchInstagramApi(accessToken, igUserId, {
            fields: 'followers_count,following_count,media_count',
          });

          // Get previous day's follower count for growth calculation
          const { data: prevMetrics } = await (supabase as any)
            .from('instagram_account_metrics')
            .select('followers_count')
            .eq('user_id', connection.user_id)
            .order('metrics_date', { ascending: false })
            .limit(1)
            .single();

          const prevFollowers = prevMetrics?.followers_count || accountData.followers_count;
          const followerChange = accountData.followers_count - prevFollowers;

          await (supabase as any)
            .from('instagram_account_metrics')
            .upsert({
              user_id: connection.user_id,
              followers_count: accountData.followers_count,
              following_count: accountData.following_count,
              media_count: accountData.media_count,
              followers_gained: followerChange > 0 ? followerChange : 0,
              followers_lost: followerChange < 0 ? Math.abs(followerChange) : 0,
              metrics_date: todayStr,
            }, { onConflict: 'user_id,metrics_date' });

          syncedAccounts++;
        } catch (err) {
          logger.error('Failed to sync account metrics', {
            userId: connection.user_id,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }

        // 2. Get published posts from last 30 days
        const { data: posts } = await (supabase as any)
          .from('instagram_scheduled_posts')
          .select('id, instagram_media_id, post_type, scheduled_for')
          .eq('user_id', connection.user_id)
          .eq('status', 'published')
          .gte('published_at', lookbackDate.toISOString())
          .not('instagram_media_id', 'is', null);

        if (!posts?.length) {
          logger.info('No recent posts to sync for user', { userId: connection.user_id });
          continue;
        }

        // 3. Fetch metrics for each post
        for (const post of posts) {
          try {
            const metricsFields = post.post_type === 'reel'
              ? 'impressions,reach,likes,comments,saved,shares,plays'
              : 'impressions,reach,likes,comments,saved,shares';

            const insightsData = await fetchInstagramApi(
              accessToken,
              `${post.instagram_media_id}/insights`,
              { metric: metricsFields }
            );

            // Parse insights response
            const metrics: Record<string, number> = {};
            insightsData.data?.forEach((item: { name: string; values: { value: number }[] }) => {
              metrics[item.name] = item.values?.[0]?.value || 0;
            });

            const reach = metrics.reach || 1; // Avoid division by zero
            const engagementRate = (metrics.likes + metrics.comments + metrics.saved) / reach;

            await (supabase as any)
              .from('instagram_post_metrics')
              .upsert({
                user_id: connection.user_id,
                post_id: post.id,
                instagram_media_id: post.instagram_media_id,
                impressions: metrics.impressions || 0,
                reach: metrics.reach || 0,
                likes: metrics.likes || 0,
                comments: metrics.comments || 0,
                saves: metrics.saved || 0,
                shares: metrics.shares || 0,
                plays: metrics.plays || 0,
                engagement_rate: Math.min(engagementRate, 1),
                metrics_date: todayStr,
              }, { onConflict: 'post_id,metrics_date' });

            syncedPosts++;
          } catch (err) {
            logger.warn('Failed to sync post metrics', {
              postId: post.id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
            errors++;
          }
        }

        // 4. Recalculate optimal times
        await recalculateOptimalTimes(supabase, connection.user_id);

        // 5. Recalculate template performance
        await recalculateTemplatePerformance(supabase, connection.user_id);

        // 6. Recalculate hashtag performance
        await recalculateHashtagPerformance(supabase, connection.user_id);

      } catch (err) {
        logger.error('Error syncing metrics for user', {
          userId: connection.user_id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        errors++;
      }
    }

    logger.info('Metrics sync complete', { syncedAccounts, syncedPosts, errors });

    return {
      success: true,
      accounts: syncedAccounts,
      posts: syncedPosts,
      errors,
    };
  },
});

// ============================================================================
// Recalculation Functions
// ============================================================================

async function recalculateOptimalTimes(supabase: any, userId: string) {
  // Get metrics grouped by day of week and hour
  const { data: posts } = await supabase
    .from('instagram_scheduled_posts')
    .select(`
      id,
      scheduled_for,
      instagram_post_metrics(engagement_rate)
    `)
    .eq('user_id', userId)
    .eq('status', 'published');

  if (!posts?.length) return;

  // Aggregate by day/hour
  const timeSlots: Record<string, { total: number; count: number }> = {};

  posts.forEach((post: any) => {
    if (!post.scheduled_for || !post.instagram_post_metrics?.length) return;

    const date = parseISO(post.scheduled_for);
    const dayOfWeek = getDay(date);
    const hour = getHours(date);
    const key = `${dayOfWeek}-${hour}`;

    if (!timeSlots[key]) {
      timeSlots[key] = { total: 0, count: 0 };
    }

    const latestMetric = post.instagram_post_metrics[0];
    timeSlots[key].total += parseFloat(latestMetric.engagement_rate) || 0;
    timeSlots[key].count++;
  });

  // Upsert optimal times
  for (const [key, data] of Object.entries(timeSlots)) {
    const [dayOfWeek, hour] = key.split('-').map(Number);
    const avgEngagement = data.total / data.count;

    await supabase
      .from('instagram_optimal_times')
      .upsert({
        user_id: userId,
        day_of_week: dayOfWeek,
        hour,
        avg_engagement_rate: avgEngagement,
        post_count: data.count,
      }, { onConflict: 'user_id,day_of_week,hour' });
  }

  // Calculate ranks within each day
  for (let day = 0; day <= 6; day++) {
    const { data: times } = await supabase
      .from('instagram_optimal_times')
      .select('id, avg_engagement_rate')
      .eq('user_id', userId)
      .eq('day_of_week', day)
      .order('avg_engagement_rate', { ascending: false });

    if (times?.length) {
      for (let i = 0; i < times.length; i++) {
        await supabase
          .from('instagram_optimal_times')
          .update({ rank: i + 1 })
          .eq('id', times[i].id);
      }
    }
  }
}

async function recalculateTemplatePerformance(supabase: any, userId: string) {
  // Get posts with their templates and metrics
  const { data: posts } = await supabase
    .from('instagram_scheduled_posts')
    .select(`
      template_id,
      instagram_post_metrics(
        engagement_rate,
        reach,
        saves,
        impressions
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('template_id', 'is', null);

  if (!posts?.length) return;

  // Aggregate by template
  const templateStats: Record<string, {
    count: number;
    totalEngagement: number;
    totalReach: number;
    totalSaves: number;
    totalImpressions: number;
    bestEngagement: number;
    worstEngagement: number;
  }> = {};

  posts.forEach((post: any) => {
    if (!post.template_id || !post.instagram_post_metrics?.length) return;

    const templateId = post.template_id;
    if (!templateStats[templateId]) {
      templateStats[templateId] = {
        count: 0,
        totalEngagement: 0,
        totalReach: 0,
        totalSaves: 0,
        totalImpressions: 0,
        bestEngagement: 0,
        worstEngagement: 1,
      };
    }

    const metric = post.instagram_post_metrics[0];
    const engagement = parseFloat(metric.engagement_rate) || 0;

    templateStats[templateId].count++;
    templateStats[templateId].totalEngagement += engagement;
    templateStats[templateId].totalReach += metric.reach || 0;
    templateStats[templateId].totalSaves += metric.saves || 0;
    templateStats[templateId].totalImpressions += metric.impressions || 0;
    templateStats[templateId].bestEngagement = Math.max(
      templateStats[templateId].bestEngagement,
      engagement
    );
    templateStats[templateId].worstEngagement = Math.min(
      templateStats[templateId].worstEngagement,
      engagement
    );
  });

  // Upsert template performance
  for (const [templateId, stats] of Object.entries(templateStats)) {
    await supabase
      .from('instagram_template_performance')
      .upsert({
        user_id: userId,
        template_id: templateId,
        times_used: stats.count,
        avg_engagement_rate: stats.totalEngagement / stats.count,
        avg_reach: Math.round(stats.totalReach / stats.count),
        avg_saves: Math.round(stats.totalSaves / stats.count),
        total_impressions: stats.totalImpressions,
        best_engagement_rate: stats.bestEngagement,
        worst_engagement_rate: stats.worstEngagement,
      }, { onConflict: 'user_id,template_id' });
  }
}

async function recalculateHashtagPerformance(supabase: any, userId: string) {
  // Get posts with their hashtag sets and metrics
  const { data: posts } = await supabase
    .from('instagram_scheduled_posts')
    .select(`
      rotation_set_id,
      instagram_post_metrics(
        engagement_rate,
        reach
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('rotation_set_id', 'is', null);

  if (!posts?.length) return;

  // Aggregate by hashtag set
  const hashtagStats: Record<string, {
    count: number;
    totalEngagement: number;
    totalReach: number;
  }> = {};

  posts.forEach((post: any) => {
    if (!post.rotation_set_id || !post.instagram_post_metrics?.length) return;

    const setId = post.rotation_set_id;
    if (!hashtagStats[setId]) {
      hashtagStats[setId] = { count: 0, totalEngagement: 0, totalReach: 0 };
    }

    const metric = post.instagram_post_metrics[0];
    hashtagStats[setId].count++;
    hashtagStats[setId].totalEngagement += parseFloat(metric.engagement_rate) || 0;
    hashtagStats[setId].totalReach += metric.reach || 0;
  });

  // Upsert hashtag performance
  for (const [setId, stats] of Object.entries(hashtagStats)) {
    await supabase
      .from('instagram_hashtag_performance')
      .upsert({
        user_id: userId,
        rotation_set_id: setId,
        times_used: stats.count,
        avg_engagement_rate: stats.totalEngagement / stats.count,
        avg_reach: Math.round(stats.totalReach / stats.count),
      }, { onConflict: 'user_id,rotation_set_id' });
  }
}
