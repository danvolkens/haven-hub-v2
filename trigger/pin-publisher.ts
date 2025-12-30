import { schedules, task, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';

// Note: We can't use @/lib imports in trigger tasks that use schedules
// because they run in a different context. Use direct Supabase client instead.

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Pin {
  id: string;
  user_id: string;
  board_id: string;
  image_url: string;
  title: string;
  description: string | null;
  link: string | null;
  alt_text: string | null;
  scheduled_for: string;
  retry_count?: number;
}

async function publishPinToPinterest(
  accessToken: string,
  pin: Pin,
  pinterestBoardId: string
): Promise<{ id: string }> {
  const body: Record<string, unknown> = {
    board_id: pinterestBoardId,
    media_source: {
      source_type: 'image_url',
      url: pin.image_url,
    },
    title: pin.title,
  };

  if (pin.description) {
    body.description = pin.description;
  }
  if (pin.link) {
    body.link = pin.link;
  }
  if (pin.alt_text) {
    body.alt_text = pin.alt_text;
  }

  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinterest API error: ${error}`);
  }

  return response.json();
}

async function publishPin(
  supabase: ReturnType<typeof getSupabaseClient>,
  pin: Pin
): Promise<boolean> {
  try {
    logger.info(`Publishing pin ${pin.id}`, { pinId: pin.id, title: pin.title });

    // Update status to publishing
    await supabase
      .from('pins' as any)
      .update({ status: 'publishing' })
      .eq('id', pin.id);

    // Get Pinterest access token from vault
    const { data: accessToken, error: tokenError } = await supabase.rpc('get_credential', {
      p_user_id: pin.user_id,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (tokenError || !accessToken) {
      throw new Error('Pinterest integration not found or inactive');
    }

    // Get the Pinterest board ID
    const { data: board, error: boardError } = await supabase
      .from('pinterest_boards' as any)
      .select('pinterest_board_id')
      .eq('id', pin.board_id)
      .single();

    if (boardError || !board) {
      throw new Error('Pinterest board not found');
    }

    // Publish to Pinterest
    const pinterestPin = await publishPinToPinterest(
      accessToken,
      pin,
      board.pinterest_board_id as string
    );

    // Update pin with Pinterest ID and status
    await supabase
      .from('pins' as any)
      .update({
        pinterest_pin_id: pinterestPin.id,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', pin.id);

    // Create schedule history entry
    await supabase.from('pin_schedule_history' as any).insert({
      pin_id: pin.id,
      action: 'published',
      result: 'success',
    });

    logger.info(`Successfully published pin ${pin.id}`, {
      pinId: pin.id,
      pinterestPinId: pinterestPin.id
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to publish pin ${pin.id}`, { pinId: pin.id, error: errorMessage });

    // Update pin status to failed
    await supabase
      .from('pins' as any)
      .update({
        status: 'failed',
        last_error: errorMessage,
        retry_count: ((pin as any).retry_count || 0) + 1,
      })
      .eq('id', pin.id);

    // Create schedule history entry
    await supabase.from('pin_schedule_history' as any).insert({
      pin_id: pin.id,
      action: 'publish_attempt',
      result: 'failed',
      error_message: errorMessage,
    });

    return false;
  }
}

export const pinPublisherTask = schedules.task({
  id: 'pin-publisher',
  cron: '*/15 * * * *', // Run every 15 minutes

  run: async () => {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    logger.info('Starting pin publisher task', { now });

    // Get all scheduled pins that are due to be published
    const { data: pins, error } = await supabase
      .from('pins' as any)
      .select('id, user_id, board_id, image_url, title, description, link, alt_text, scheduled_for')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(20); // Process 20 pins at a time to avoid timeouts

    if (error) {
      logger.error('Failed to fetch scheduled pins', { error });
      return { published: 0, failed: 0, total: 0 };
    }

    if (!pins || pins.length === 0) {
      logger.info('No pins scheduled for publishing');
      return { published: 0, failed: 0, total: 0 };
    }

    logger.info(`Found ${pins.length} pins to publish`);

    let published = 0;
    let failed = 0;

    for (const pin of pins) {
      const success = await publishPin(supabase, pin as Pin);
      if (success) {
        published++;
      } else {
        failed++;
      }
    }

    logger.info('Pin publisher task complete', { published, failed, total: pins.length });

    return { published, failed, total: pins.length };
  },
});

// Optional: A task to retry failed pins (max 3 retries)
export const pinRetryTask = schedules.task({
  id: 'pin-retry',
  cron: '0 */6 * * *', // Run every 6 hours

  run: async () => {
    const supabase = getSupabaseClient();
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    logger.info('Starting pin retry task');

    // Get failed pins that haven't been retried recently AND haven't exceeded max retries
    const { data: failedPins, error } = await supabase
      .from('pins' as any)
      .select('id, user_id, board_id, image_url, title, description, link, alt_text, scheduled_for, retry_count')
      .eq('status', 'failed')
      .lt('retry_count', 3) // Max 3 retries
      .lt('updated_at', sixHoursAgo.toISOString())
      .limit(10);

    if (error) {
      logger.error('Failed to fetch failed pins for retry', { error });
      return { retried: 0, succeeded: 0, skippedMaxRetries: 0 };
    }

    if (!failedPins || failedPins.length === 0) {
      logger.info('No failed pins to retry');
      return { retried: 0, succeeded: 0, skippedMaxRetries: 0 };
    }

    let succeeded = 0;

    for (const pin of failedPins) {
      // Reset status to scheduled before retry (keep retry_count for tracking)
      await supabase
        .from('pins' as any)
        .update({
          status: 'scheduled',
          last_error: null,
        })
        .eq('id', pin.id);

      const success = await publishPin(supabase, pin as Pin);
      if (success) {
        succeeded++;
      }
    }

    logger.info('Pin retry task complete', { retried: failedPins.length, succeeded });

    return { retried: failedPins.length, succeeded };
  },
});

// ==========================================
// Exact-Time Scheduled Pin Publishing
// ==========================================

/**
 * Task to publish a single pin at its exact scheduled time.
 * This is triggered when a pin is scheduled, with a delay until the scheduled time.
 */
export const scheduledPinPublishTask = task({
  id: 'scheduled-pin-publish',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },

  run: async (payload: { pinId: string }) => {
    const supabase = getSupabaseClient();
    const { pinId } = payload;

    logger.info(`Publishing scheduled pin ${pinId}`, { pinId });

    // Fetch the pin
    const { data: pin, error } = await supabase
      .from('pins' as any)
      .select('id, user_id, board_id, image_url, title, description, link, alt_text, scheduled_for, retry_count, status')
      .eq('id', pinId)
      .single();

    if (error || !pin) {
      logger.error(`Pin ${pinId} not found`, { pinId, error });
      return { success: false, error: 'Pin not found' };
    }

    // Only publish if still in scheduled status (not already published/cancelled)
    if (pin.status !== 'scheduled') {
      logger.info(`Pin ${pinId} is no longer scheduled (status: ${pin.status})`, { pinId, status: pin.status });
      return { success: false, error: `Pin status is ${pin.status}, not scheduled` };
    }

    // Publish the pin
    const success = await publishPin(supabase, pin as Pin);

    return { success, pinId };
  },
});
