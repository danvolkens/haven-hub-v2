import { getAdminClient } from '@/lib/supabase/admin';
import { TikTokClient, TikTokVideo } from '@/lib/integrations/tiktok/client';
import { InstagramClient, InstagramMedia } from '@/lib/integrations/instagram/client';

// Types
export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: 'tiktok' | 'instagram' | 'pinterest';
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  account_id: string | null;
  account_name: string | null;
  status: 'active' | 'expired' | 'disconnected' | 'error';
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface CrossPlatformContent {
  id: string;
  user_id: string;
  platform: string;
  platform_content_id: string;
  content_type: string;
  caption: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number | null;
  performance_score: number | null;
  is_winner: boolean;
  winner_detected_at: string | null;
  adapted_to_pinterest: boolean;
}

export interface SyncResult {
  success: boolean;
  platform: string;
  contentSynced: number;
  winnersDetected: number;
  errors: string[];
}

/**
 * Get all active platform connections for a user
 */
export async function getActiveConnections(userId: string): Promise<PlatformConnection[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching platform connections:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all active platform connections across all users (for cron)
 */
export async function getAllActiveConnections(): Promise<PlatformConnection[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('platform_connections')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching all platform connections:', error);
    return [];
  }

  return data || [];
}

/**
 * Sync TikTok content for a user
 */
export async function syncTikTokContent(
  userId: string,
  accessToken: string
): Promise<SyncResult> {
  const supabase = getAdminClient();
  const result: SyncResult = {
    success: true,
    platform: 'tiktok',
    contentSynced: 0,
    winnersDetected: 0,
    errors: [],
  };

  try {
    const client = new TikTokClient({ accessToken });
    const videosResponse = await client.getVideos({ max_count: 50 });

    if (!videosResponse.data?.videos) {
      result.errors.push('No videos returned from TikTok');
      return result;
    }

    for (const video of videosResponse.data.videos) {
      const engagement = calculateEngagement(video);

      // Upsert content
      const { error } = await (supabase as any)
        .from('cross_platform_content')
        .upsert(
          {
            user_id: userId,
            platform: 'tiktok',
            platform_content_id: video.id,
            original_url: video.share_url,
            content_type: 'video',
            title: video.title || null,
            description: video.video_description || null,
            image_url: video.cover_image_url,
            views: video.view_count,
            likes: video.like_count,
            comments: video.comment_count,
            shares: video.share_count,
            saves: 0, // TikTok doesn't expose saves
            engagement_rate: engagement.rate,
            performance_score: engagement.score,
            posted_at: new Date(video.create_time * 1000).toISOString(),
            metrics_updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,platform_content_id' }
        );

      if (error) {
        result.errors.push(`Failed to upsert video ${video.id}: ${error.message}`);
      } else {
        result.contentSynced++;
      }
    }

    // Detect winners
    const winnersDetected = await detectWinners(userId);
    result.winnersDetected = winnersDetected;

    // Update last sync time
    await (supabase as any)
      .from('platform_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', 'tiktok');

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Sync Instagram content for a user
 */
export async function syncInstagramContent(
  userId: string,
  accessToken: string,
  accountId: string
): Promise<SyncResult> {
  const supabase = getAdminClient();
  const result: SyncResult = {
    success: true,
    platform: 'instagram',
    contentSynced: 0,
    winnersDetected: 0,
    errors: [],
  };

  try {
    const client = new InstagramClient({ accessToken, instagramAccountId: accountId });
    const mediaResponse = await client.getMedia({ limit: 50 });

    if (!mediaResponse.data) {
      result.errors.push('No media returned from Instagram');
      return result;
    }

    for (const media of mediaResponse.data) {
      // Get insights for each media item
      let views = 0;
      let saves = 0;
      let shares = 0;

      try {
        const insights = await client.getMediaInsights(media.id, media.media_type);
        for (const insight of insights.data || []) {
          if (insight.name === 'impressions') {
            views = insight.values[0]?.value || 0;
          } else if (insight.name === 'saved') {
            saves = insight.values[0]?.value || 0;
          } else if (insight.name === 'shares') {
            shares = insight.values[0]?.value || 0;
          }
        }
      } catch (insightError) {
        // Some posts may not have insights available
        console.log(`Could not get insights for media ${media.id}`);
      }

      const engagement = calculateEngagement({
        view_count: views || media.like_count * 10, // Estimate if no views available
        like_count: media.like_count,
        comment_count: media.comments_count,
        share_count: shares,
        saves: saves,
      });

      // Map media type
      const contentType = media.media_type === 'VIDEO' || media.media_type === 'REELS'
        ? 'reel'
        : media.media_type === 'CAROUSEL_ALBUM'
          ? 'post'
          : 'post';

      // Upsert content
      const { error } = await (supabase as any)
        .from('cross_platform_content')
        .upsert(
          {
            user_id: userId,
            platform: 'instagram',
            platform_content_id: media.id,
            original_url: media.permalink,
            content_type: contentType,
            title: null,
            description: media.caption || null,
            image_url: media.media_url,
            views: views,
            likes: media.like_count,
            comments: media.comments_count,
            shares: shares,
            saves: saves,
            engagement_rate: engagement.rate,
            performance_score: engagement.score,
            posted_at: media.timestamp,
            metrics_updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,platform_content_id' }
        );

      if (error) {
        result.errors.push(`Failed to upsert media ${media.id}: ${error.message}`);
      } else {
        result.contentSynced++;
      }
    }

    // Detect winners
    const winnersDetected = await detectWinners(userId);
    result.winnersDetected = winnersDetected;

    // Update last sync time
    await (supabase as any)
      .from('platform_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', 'instagram');

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

/**
 * Calculate engagement metrics
 */
function calculateEngagement(metrics: {
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  saves?: number;
}): { rate: number; score: number } {
  const views = metrics.view_count || 1;
  const totalEngagement =
    metrics.like_count +
    (metrics.comment_count * 2) +
    (metrics.share_count * 2.5) +
    ((metrics.saves || 0) * 3);

  const rate = totalEngagement / views;

  // Score calculation (0-100)
  // Based on weighted engagement per view
  const score = Math.min(100, Math.max(0, Math.round(rate * 1000)));

  return { rate: Math.round(rate * 10000) / 10000, score };
}

/**
 * Detect winners based on engagement thresholds
 */
export async function detectWinners(userId: string): Promise<number> {
  const supabase = getAdminClient();
  let winnersDetected = 0;

  try {
    // Call the DB function to detect winners
    const { data: winners, error } = await (supabase as any).rpc(
      'detect_cross_platform_winners',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error detecting winners:', error);
      // Fallback to manual detection
      return await detectWinnersManual(userId);
    }

    // Update newly detected winners
    for (const winner of winners || []) {
      if (winner.is_new_winner) {
        await (supabase as any)
          .from('cross_platform_content')
          .update({
            is_winner: true,
            winner_detected_at: new Date().toISOString(),
          })
          .eq('id', winner.content_id);

        winnersDetected++;

        // Log activity
        await (supabase as any).from('activity_log').insert({
          user_id: userId,
          action: 'cross_platform_winner_detected',
          entity_type: 'cross_platform_content',
          entity_id: winner.content_id,
          details: {
            platform: winner.platform,
            engagement_rate: winner.engagement_rate,
            performance_score: winner.performance_score,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error in detectWinners:', error);
    return await detectWinnersManual(userId);
  }

  return winnersDetected;
}

/**
 * Manual winner detection fallback
 */
async function detectWinnersManual(userId: string): Promise<number> {
  const supabase = getAdminClient();
  let winnersDetected = 0;

  // Find content that should be winners
  const { data: candidates } = await (supabase as any)
    .from('cross_platform_content')
    .select('id, engagement_rate, performance_score, is_winner')
    .eq('user_id', userId)
    .gte('views', 1000)
    .or('engagement_rate.gte.0.05,performance_score.gte.70');

  for (const candidate of candidates || []) {
    if (!candidate.is_winner) {
      await (supabase as any)
        .from('cross_platform_content')
        .update({
          is_winner: true,
          winner_detected_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);

      winnersDetected++;
    }
  }

  return winnersDetected;
}

/**
 * Get cross-platform winners for a user
 */
export async function getWinners(
  userId: string,
  options: {
    platform?: string;
    adaptedOnly?: boolean;
    limit?: number;
  } = {}
): Promise<CrossPlatformContent[]> {
  const supabase = getAdminClient();
  const { platform, adaptedOnly, limit = 20 } = options;

  let query = (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', userId)
    .eq('is_winner', true)
    .order('winner_detected_at', { ascending: false })
    .limit(limit);

  if (platform) {
    query = query.eq('platform', platform);
  }

  if (adaptedOnly !== undefined) {
    query = query.eq('adapted_to_pinterest', adaptedOnly);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching winners:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark content as adapted to Pinterest
 */
export async function markAsAdapted(
  userId: string,
  contentId: string,
  pinterestPinId: string
): Promise<boolean> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('cross_platform_content')
    .update({
      adapted_to_pinterest: true,
      pinterest_pin_id: pinterestPinId,
      adapted_at: new Date().toISOString(),
    })
    .eq('id', contentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error marking content as adapted:', error);
    return false;
  }

  return true;
}

/**
 * Get cross-platform analytics summary
 */
export async function getAnalyticsSummary(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PlatformSummary[]> {
  const supabase = getAdminClient();

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, error } = await (supabase as any).rpc(
    'get_cross_platform_summary',
    {
      p_user_id: userId,
      p_start_date: start.toISOString().split('T')[0],
      p_end_date: end.toISOString().split('T')[0],
    }
  );

  if (error) {
    console.error('Error fetching analytics summary:', error);
    // Fallback to manual aggregation
    return await getAnalyticsSummaryManual(userId, start, end);
  }

  return data || [];
}

interface PlatformSummary {
  platform: string;
  total_content: number;
  total_views: number;
  total_engagement: number;
  avg_engagement_rate: number;
  winners_count: number;
  adapted_to_pinterest: number;
}

async function getAnalyticsSummaryManual(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PlatformSummary[]> {
  const supabase = getAdminClient();

  const { data } = await (supabase as any)
    .from('cross_platform_content')
    .select('platform, views, likes, comments, shares, saves, engagement_rate, is_winner, adapted_to_pinterest')
    .eq('user_id', userId)
    .gte('posted_at', startDate.toISOString())
    .lte('posted_at', endDate.toISOString());

  if (!data) return [];

  // Group by platform
  const platforms: Record<string, PlatformSummary> = {};

  for (const item of data) {
    if (!platforms[item.platform]) {
      platforms[item.platform] = {
        platform: item.platform,
        total_content: 0,
        total_views: 0,
        total_engagement: 0,
        avg_engagement_rate: 0,
        winners_count: 0,
        adapted_to_pinterest: 0,
      };
    }

    const p = platforms[item.platform];
    p.total_content++;
    p.total_views += item.views || 0;
    p.total_engagement += (item.likes || 0) + (item.comments || 0) + (item.shares || 0) + (item.saves || 0);
    p.avg_engagement_rate += item.engagement_rate || 0;
    if (item.is_winner) p.winners_count++;
    if (item.adapted_to_pinterest) p.adapted_to_pinterest++;
  }

  // Calculate averages
  return Object.values(platforms).map(p => ({
    ...p,
    avg_engagement_rate: p.total_content > 0 ? p.avg_engagement_rate / p.total_content : 0,
  }));
}

/**
 * Sync all platforms for a user
 */
export async function syncAllPlatforms(userId: string): Promise<SyncResult[]> {
  const connections = await getActiveConnections(userId);
  const results: SyncResult[] = [];

  for (const connection of connections) {
    if (!connection.access_token_encrypted) continue;

    // In production, decrypt the token here
    // For now, assume metadata fallback pattern like Pinterest
    const supabase = getAdminClient();
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', connection.platform)
      .single();

    const accessToken = integration?.metadata?._access_token || connection.access_token_encrypted;
    if (!accessToken) continue;

    if (connection.platform === 'tiktok') {
      const result = await syncTikTokContent(userId, accessToken);
      results.push(result);
    } else if (connection.platform === 'instagram') {
      const accountId = connection.account_id;
      if (accountId) {
        const result = await syncInstagramContent(userId, accessToken, accountId);
        results.push(result);
      }
    }
  }

  return results;
}
