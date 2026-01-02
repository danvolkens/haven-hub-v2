/**
 * Instagram Publisher Job
 * Prompt 3.4: Scheduled job that publishes due posts
 *
 * Runs every 5 minutes to check for and publish scheduled posts
 */

import { schedules, task, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import { publishScheduledPost } from '@/lib/instagram/api';
import type { ScheduledPost } from '@/lib/instagram/api';

// ============================================================================
// Types
// ============================================================================

interface DuePost {
  id: string;
  user_id: string;
  primary_asset_id: string | null;
  post_type: 'feed' | 'reel' | 'carousel' | 'story';
  caption: string;
  hashtags: string[];
  scheduled_at: string;
  retry_count: number;
  status: string;
  primary_asset?: {
    file_url: string;
  };
  carousel_items?: Array<{
    asset_url: string;
    media_type: 'IMAGE' | 'VIDEO';
    position: number;
  }>;
}

// ============================================================================
// Configuration
// ============================================================================

const RETRY_DELAYS = [5, 15, 45]; // Minutes for exponential backoff
const MAX_RETRIES = 3;

const RETRYABLE_ERRORS = [
  'RATE_LIMITED',
  'TEMPORARY_ERROR',
  'NETWORK_ERROR',
  'TIMEOUT',
  '2', // Facebook temporary issue
  '4', // Rate limit
];

// ============================================================================
// Main Publisher Task
// ============================================================================

export const instagramPublisherTask = schedules.task({
  id: 'instagram-publisher',
  // Run every 5 minutes
  cron: '*/5 * * * *',
  run: async () => {
    logger.info('Starting Instagram publisher job');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Query posts that are due for publishing
    const now = new Date().toISOString();

    const { data: duePosts, error: queryError } = await supabase
      .from('instagram_scheduled_posts')
      .select(
        `
        id,
        user_id,
        primary_asset_id,
        post_type,
        caption,
        hashtags,
        scheduled_at,
        retry_count,
        status,
        primary_asset:primary_asset_id (file_url),
        carousel_items (asset_url, media_type, position)
      `
      )
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(10); // Process max 10 posts per run to avoid timeout

    if (queryError) {
      logger.error('Failed to query due posts', { error: queryError.message });
      throw queryError;
    }

    if (!duePosts || duePosts.length === 0) {
      logger.info('No posts due for publishing');
      return { processed: 0 };
    }

    logger.info(`Found ${duePosts.length} posts to publish`);

    let successCount = 0;
    let failCount = 0;

    for (const post of duePosts as unknown as DuePost[]) {
      try {
        // Update status to publishing
        await supabase
          .from('instagram_scheduled_posts')
          .update({ status: 'publishing' })
          .eq('id', post.id);

        // Build scheduled post object
        const scheduledPost: ScheduledPost = {
          id: post.id,
          user_id: post.user_id,
          asset_id: post.primary_asset_id,
          asset_url: post.primary_asset?.file_url || '',
          post_type: post.post_type,
          caption: post.caption,
          hashtags: post.hashtags || [],
        };

        // Add carousel assets if applicable
        if (post.post_type === 'carousel' && post.carousel_items) {
          scheduledPost.carousel_assets = post.carousel_items
            .sort((a, b) => a.position - b.position)
            .map((item) => ({
              url: item.asset_url,
              media_type: item.media_type,
            }));
        }

        // Publish the post
        const result = await publishScheduledPost(scheduledPost);

        if (result.success) {
          // Update post status to published
          await supabase
            .from('instagram_scheduled_posts')
            .update({
              status: 'published',
              instagram_media_id: result.instagram_media_id,
              published_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', post.id);

          // Log activity
          await logActivity(supabase, post.user_id, 'instagram_post_published', {
            post_id: post.id,
            post_type: post.post_type,
            instagram_media_id: result.instagram_media_id,
          });

          successCount++;
          logger.info(`Published post ${post.id}`);
        } else {
          // Handle error
          await handlePublishError(supabase, post, result.error || 'Unknown error');
          failCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error publishing post ${post.id}`, { error: errorMessage });
        await handlePublishError(supabase, post, errorMessage);
        failCount++;
      }
    }

    logger.info('Instagram publisher job complete', {
      processed: duePosts.length,
      success: successCount,
      failed: failCount,
    });

    return {
      processed: duePosts.length,
      success: successCount,
      failed: failCount,
    };
  },
});

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle publishing errors with retry logic
 */
async function handlePublishError(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  post: DuePost,
  errorMessage: string
): Promise<void> {
  const isRetryable = RETRYABLE_ERRORS.some(
    (code) => errorMessage.includes(code) || errorMessage.toUpperCase().includes(code)
  );

  const currentRetryCount = post.retry_count || 0;

  if (isRetryable && currentRetryCount < MAX_RETRIES) {
    // Calculate next retry time with exponential backoff
    const delayMinutes = RETRY_DELAYS[currentRetryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await supabase
      .from('instagram_scheduled_posts')
      .update({
        status: 'scheduled', // Put back in queue
        scheduled_at: nextRetryAt.toISOString(),
        retry_count: currentRetryCount + 1,
        error_message: `Retry ${currentRetryCount + 1}/${MAX_RETRIES}: ${errorMessage}`,
      })
      .eq('id', post.id);

    logger.info(`Scheduled retry ${currentRetryCount + 1} for post ${post.id}`, {
      nextRetryAt: nextRetryAt.toISOString(),
    });
  } else {
    // Mark as failed
    await supabase
      .from('instagram_scheduled_posts')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', post.id);

    // Notify user
    await createNotification(supabase, post.user_id, 'instagram_post_failed', {
      post_id: post.id,
      error: errorMessage,
    });

    // Log activity
    await logActivity(supabase, post.user_id, 'instagram_post_failed', {
      post_id: post.id,
      error: errorMessage,
      retries: currentRetryCount,
    });

    logger.error(`Post ${post.id} permanently failed`, { error: errorMessage });
  }
}

// ============================================================================
// Activity & Notification Helpers
// ============================================================================

/**
 * Log activity to the activity feed
 */
async function logActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('user_activity').insert({
      user_id: userId,
      activity_type: eventType,
      metadata,
    });
  } catch (error) {
    logger.warn('Failed to log activity', { error });
  }
}

/**
 * Create a notification for the user
 */
async function createNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // Check if notifications table exists
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title: getNotificationTitle(type),
      message: getNotificationMessage(type, data),
      metadata: data,
      read: false,
    });

    if (error) {
      // Notifications table may not exist yet, just log
      logger.warn('Could not create notification', { error: error.message });
    }
  } catch (error) {
    logger.warn('Failed to create notification', { error });
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'instagram_post_failed':
      return 'Instagram Post Failed';
    case 'instagram_post_published':
      return 'Post Published';
    default:
      return 'Notification';
  }
}

function getNotificationMessage(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'instagram_post_failed':
      return `Failed to publish your Instagram post. Error: ${data.error}`;
    case 'instagram_post_published':
      return 'Your Instagram post has been published successfully!';
    default:
      return 'You have a new notification.';
  }
}

// ============================================================================
// Manual Trigger Task (for testing)
// ============================================================================

export const instagramPublishNowTask = task({
  id: 'instagram-publish-now',
  run: async (payload: { postId: string }) => {
    logger.info('Manual publish triggered', { postId: payload.postId });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the specific post
    const { data: post, error } = await supabase
      .from('instagram_scheduled_posts')
      .select(
        `
        id,
        user_id,
        primary_asset_id,
        post_type,
        caption,
        hashtags,
        scheduled_at,
        retry_count,
        status,
        primary_asset:primary_asset_id (file_url)
      `
      )
      .eq('id', payload.postId)
      .single();

    if (error || !post) {
      logger.error('Post not found', { postId: payload.postId });
      throw new Error(`Post ${payload.postId} not found`);
    }

    // Build and publish
    const scheduledPost: ScheduledPost = {
      id: post.id,
      user_id: post.user_id,
      asset_id: post.primary_asset_id,
      asset_url: (post as unknown as DuePost).primary_asset?.file_url || '',
      post_type: post.post_type as 'feed' | 'reel' | 'carousel' | 'story',
      caption: post.caption,
      hashtags: post.hashtags || [],
    };

    const result = await publishScheduledPost(scheduledPost);

    if (result.success) {
      await supabase
        .from('instagram_scheduled_posts')
        .update({
          status: 'published',
          instagram_media_id: result.instagram_media_id,
          published_at: new Date().toISOString(),
        })
        .eq('id', post.id);
    }

    return result;
  },
});
