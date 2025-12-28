/**
 * Instagram Stories Automation Jobs
 * Prompt 6.2: Auto-schedule and publish daily stories
 */

import { schedules, task, logger, wait } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const MORNING_STORY_HOUR = 9; // 9 AM
const AFTERNOON_STORY_HOUR = 14; // 2 PM

// ============================================================================
// Types
// ============================================================================

interface Quote {
  id: string;
  text: string;
  author: string;
  collection: string;
}

interface Product {
  id: string;
  title: string;
  image_url?: string;
}

interface ScheduledStory {
  id: string;
  type: string;
  status: string;
  scheduled_at: string;
  asset_url?: string;
}

// ============================================================================
// Supabase Client Factory
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// Schedule Auto Stories Job
// Runs at 8 PM daily to schedule tomorrow's auto-stories
// ============================================================================

export const scheduleAutoStoriesTask = schedules.task({
  id: 'instagram-schedule-auto-stories',
  cron: '0 20 * * *', // Every day at 8 PM

  run: async () => {
    const supabase = getSupabaseClient();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    logger.info('Scheduling auto-stories for tomorrow', {
      date: tomorrow.toISOString().split('T')[0],
    });

    // Get all users with Instagram connected
    const { data: connections, error: connError } = await supabase
      .from('instagram_connections')
      .select('user_id')
      .eq('is_active', true);

    if (connError) {
      logger.error('Failed to fetch Instagram connections', { error: connError });
      return { success: false, error: 'Failed to fetch connections' };
    }

    if (!connections || connections.length === 0) {
      logger.info('No active Instagram connections found');
      return { success: true, message: 'No active connections' };
    }

    let totalCreated = 0;

    for (const connection of connections) {
      const userId = connection.user_id;

      try {
        // 1. Schedule morning quote story
        const morningStory = await scheduleMorningQuoteStory(supabase, userId, tomorrow);
        if (morningStory) totalCreated++;

        // 2. Schedule afternoon product story
        const afternoonStory = await scheduleAfternoonProductStory(supabase, userId, tomorrow);
        if (afternoonStory) totalCreated++;

        // Log activity
        await supabase.from('user_activity').insert({
          user_id: userId,
          activity_type: 'auto_stories_scheduled',
          metadata: {
            date: tomorrow.toISOString().split('T')[0],
            stories_created: (morningStory ? 1 : 0) + (afternoonStory ? 1 : 0),
          },
        });
      } catch (error) {
        logger.error('Failed to schedule stories for user', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Auto-stories scheduling complete', {
      totalCreated,
      date: tomorrow.toISOString().split('T')[0],
    });

    return {
      success: true,
      storiesCreated: totalCreated,
      date: tomorrow.toISOString().split('T')[0],
    };
  },
});

// ============================================================================
// Helper: Schedule Morning Quote Story
// ============================================================================

async function scheduleMorningQuoteStory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  date: Date
): Promise<string | null> {
  // Get a random approved quote
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, text, author, collection')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .limit(20);

  if (!quotes || quotes.length === 0) {
    logger.warn('No approved quotes found for morning story', { userId });
    return null;
  }

  // Select random quote
  const quote = quotes[Math.floor(Math.random() * quotes.length)] as Quote;

  // Set scheduled time for morning
  const scheduledAt = new Date(date);
  scheduledAt.setHours(MORNING_STORY_HOUR, 0, 0, 0);

  // Create story record
  const { data: story, error } = await supabase
    .from('instagram_stories')
    .insert({
      user_id: userId,
      story_type: 'quote_daily',
      schedule_type: 'auto',
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      quote_id: quote.id,
      caption: quote.text,
      metadata: {
        author: quote.author,
        collection: quote.collection,
      },
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create morning story', { userId, error });
    return null;
  }

  logger.info('Morning quote story scheduled', {
    userId,
    storyId: story.id,
    quoteId: quote.id,
    scheduledAt: scheduledAt.toISOString(),
  });

  return story.id;
}

// ============================================================================
// Helper: Schedule Afternoon Product Story
// ============================================================================

async function scheduleAfternoonProductStory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  date: Date
): Promise<string | null> {
  // Get a featured product
  const { data: products } = await supabase
    .from('products')
    .select('id, title, image_url')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(10);

  if (!products || products.length === 0) {
    logger.warn('No active products found for afternoon story', { userId });
    return null;
  }

  // Select random product
  const product = products[Math.floor(Math.random() * products.length)] as Product;

  // Set scheduled time for afternoon
  const scheduledAt = new Date(date);
  scheduledAt.setHours(AFTERNOON_STORY_HOUR, 0, 0, 0);

  // Create story record
  const { data: story, error } = await supabase
    .from('instagram_stories')
    .insert({
      user_id: userId,
      story_type: 'product_highlight',
      schedule_type: 'auto',
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      product_id: product.id,
      caption: `Check out: ${product.title}`,
      asset_url: product.image_url,
      metadata: {
        product_title: product.title,
      },
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create afternoon story', { userId, error });
    return null;
  }

  logger.info('Afternoon product story scheduled', {
    userId,
    storyId: story.id,
    productId: product.id,
    scheduledAt: scheduledAt.toISOString(),
  });

  return story.id;
}

// ============================================================================
// Publish Stories Job
// Runs every 5 minutes to publish due stories
// ============================================================================

export const publishStoriesTask = schedules.task({
  id: 'instagram-publish-stories',
  cron: '*/5 * * * *', // Every 5 minutes

  run: async () => {
    const supabase = getSupabaseClient();
    const now = new Date();

    logger.info('Checking for stories to publish', { time: now.toISOString() });

    // Get due auto-scheduled stories
    const { data: dueStories, error } = await supabase
      .from('instagram_stories')
      .select('*, instagram_connections!inner(access_token, ig_user_id)')
      .eq('status', 'scheduled')
      .eq('schedule_type', 'auto')
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('Failed to fetch due stories', { error });
      return { success: false, error: 'Failed to fetch stories' };
    }

    if (!dueStories || dueStories.length === 0) {
      logger.info('No stories due for publishing');
      return { success: true, published: 0 };
    }

    let publishedCount = 0;
    let failedCount = 0;

    for (const story of dueStories) {
      try {
        await publishStory(supabase, story);
        publishedCount++;
      } catch (error) {
        failedCount++;
        logger.error('Failed to publish story', {
          storyId: story.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Mark as failed
        await supabase
          .from('instagram_stories')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', story.id);
      }

      // Rate limiting - wait between stories
      if (dueStories.indexOf(story) < dueStories.length - 1) {
        await wait.for({ seconds: 5 });
      }
    }

    logger.info('Stories publishing complete', { publishedCount, failedCount });

    return {
      success: true,
      published: publishedCount,
      failed: failedCount,
    };
  },
});

// ============================================================================
// Helper: Publish Story to Instagram
// ============================================================================

async function publishStory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  story: ScheduledStory & {
    instagram_connections: { access_token: string; ig_user_id: string };
    asset_url?: string;
    user_id: string;
  }
): Promise<void> {
  const { access_token, ig_user_id } = story.instagram_connections;

  // Check if we have an asset URL
  if (!story.asset_url) {
    throw new Error('No asset URL for story');
  }

  // Mock mode for development
  if (!access_token || process.env.INSTAGRAM_MOCK_MODE === 'true') {
    logger.info('Mock mode: Simulating story publish', { storyId: story.id });

    // Update status to published
    await supabase
      .from('instagram_stories')
      .update({
        status: 'posted',
        published_at: new Date().toISOString(),
        ig_media_id: `mock_story_${Date.now()}`,
      })
      .eq('id', story.id);

    return;
  }

  // Step 1: Create media container
  const createUrl = `https://graph.facebook.com/v18.0/${ig_user_id}/media`;
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: story.asset_url,
      media_type: 'STORIES',
      access_token,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(`Failed to create story container: ${error.error?.message || 'Unknown'}`);
  }

  const { id: containerId } = await createResponse.json();

  // Step 2: Publish the container
  const publishUrl = `https://graph.facebook.com/v18.0/${ig_user_id}/media_publish`;
  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token,
    }),
  });

  if (!publishResponse.ok) {
    const error = await publishResponse.json();
    throw new Error(`Failed to publish story: ${error.error?.message || 'Unknown'}`);
  }

  const { id: mediaId } = await publishResponse.json();

  // Update status to published
  await supabase
    .from('instagram_stories')
    .update({
      status: 'posted',
      published_at: new Date().toISOString(),
      ig_media_id: mediaId,
    })
    .eq('id', story.id);

  // Log activity
  await supabase.from('user_activity').insert({
    user_id: story.user_id,
    activity_type: 'story_published',
    metadata: {
      story_id: story.id,
      story_type: story.type,
      ig_media_id: mediaId,
    },
  });

  logger.info('Story published successfully', {
    storyId: story.id,
    igMediaId: mediaId,
  });
}

// ============================================================================
// Manual Trigger Task (for testing)
// ============================================================================

export const scheduleStoriesNowTask = task({
  id: 'instagram-schedule-stories-now',

  run: async () => {
    // Trigger the scheduled task manually
    logger.info('Manually triggering auto-stories scheduling');

    // Re-use the same logic
    const supabase = getSupabaseClient();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: connections } = await supabase
      .from('instagram_connections')
      .select('user_id')
      .eq('is_active', true);

    if (!connections || connections.length === 0) {
      return { success: true, message: 'No active connections' };
    }

    let totalCreated = 0;

    for (const connection of connections) {
      const morning = await scheduleMorningQuoteStory(supabase, connection.user_id, tomorrow);
      const afternoon = await scheduleAfternoonProductStory(supabase, connection.user_id, tomorrow);
      totalCreated += (morning ? 1 : 0) + (afternoon ? 1 : 0);
    }

    return {
      success: true,
      storiesCreated: totalCreated,
    };
  },
});
