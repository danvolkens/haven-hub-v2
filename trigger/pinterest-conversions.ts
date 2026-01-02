import { task, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ConversionEvent {
  id: string;
  user_id: string;
  event_name: string;
  event_id: string;
  event_time: string;
  email_hash: string | null;
  phone_hash: string | null;
  click_id: string | null;
  external_id: string | null;
  currency: string;
  value: number | null;
  content_ids: string[] | null;
  content_name: string | null;
  content_category: string | null;
  num_items: number | null;
  order_id: string | null;
  action_source: string;
  partner_name: string;
}

interface PinterestConversionEvent {
  event_name: string;
  event_id: string;
  event_time: number; // Unix timestamp in seconds
  action_source: string;
  partner_name?: string;
  user_data: {
    em?: string[]; // Hashed emails
    ph?: string[]; // Hashed phones
    click_id?: string; // Pinterest click ID (epik)
    external_id?: string[];
  };
  custom_data?: {
    currency?: string;
    value?: string;
    content_ids?: string[];
    content_name?: string;
    content_category?: string;
    num_items?: number;
    order_id?: string;
  };
}

async function sendEventsToPinterest(
  accessToken: string,
  adAccountId: string,
  events: PinterestConversionEvent[]
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    const response = await fetch(
      `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: events,
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || `HTTP ${response.status}`,
        response: responseData,
      };
    }

    return { success: true, response: responseData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function convertToApiFormat(event: ConversionEvent): PinterestConversionEvent {
  const userData: PinterestConversionEvent['user_data'] = {};

  if (event.email_hash) {
    userData.em = [event.email_hash];
  }
  if (event.phone_hash) {
    userData.ph = [event.phone_hash];
  }
  if (event.click_id) {
    userData.click_id = event.click_id;
  }
  if (event.external_id) {
    userData.external_id = [event.external_id];
  }

  const customData: PinterestConversionEvent['custom_data'] = {};

  if (event.currency) {
    customData.currency = event.currency;
  }
  if (event.value !== null) {
    customData.value = event.value.toString();
  }
  if (event.content_ids?.length) {
    customData.content_ids = event.content_ids;
  }
  if (event.content_name) {
    customData.content_name = event.content_name;
  }
  if (event.content_category) {
    customData.content_category = event.content_category;
  }
  if (event.num_items !== null) {
    customData.num_items = event.num_items;
  }
  if (event.order_id) {
    customData.order_id = event.order_id;
  }

  return {
    event_name: event.event_name,
    event_id: event.event_id,
    event_time: Math.floor(new Date(event.event_time).getTime() / 1000),
    action_source: event.action_source,
    partner_name: event.partner_name,
    user_data: userData,
    custom_data: Object.keys(customData).length > 0 ? customData : undefined,
  };
}

/**
 * Send pending conversion events to Pinterest.
 * Triggered via /api/cron/pinterest-conversions (Vercel cron) every 5 minutes.
 * Pinterest recommends sending events within 1 hour of occurrence.
 */
export const pinterestConversionsSenderTask = task({
  id: 'pinterest-conversions-sender',

  run: async () => {
    const supabase = getSupabaseClient();

    logger.info('Starting Pinterest conversions sender');

    // Get pending events (grouped by user)
    const { data: pendingEvents, error: fetchError } = await supabase
      .from('pinterest_conversion_events' as any)
      .select('*')
      .eq('sent_to_pinterest', false)
      .order('created_at', { ascending: true })
      .limit(1000); // Process up to 1000 events per run

    if (fetchError) {
      logger.error('Failed to fetch pending conversion events', { error: fetchError });
      return { sent: 0, failed: 0, errors: 1 };
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      logger.info('No pending conversion events');
      return { sent: 0, failed: 0, errors: 0 };
    }

    logger.info(`Found ${pendingEvents.length} pending conversion events`);

    // Group events by user
    const eventsByUser = new Map<string, ConversionEvent[]>();
    for (const event of pendingEvents) {
      const userId = event.user_id;
      if (!eventsByUser.has(userId)) {
        eventsByUser.set(userId, []);
      }
      eventsByUser.get(userId)!.push(event as ConversionEvent);
    }

    let totalSent = 0;
    let totalFailed = 0;
    let errorCount = 0;

    for (const [userId, events] of eventsByUser) {
      try {
        // Get user's Pinterest integration
        const { data: integration, error: integrationError } = await supabase
          .from('integrations' as any)
          .select('metadata')
          .eq('user_id', userId)
          .eq('provider', 'pinterest')
          .eq('status', 'connected')
          .single();

        if (integrationError || !integration) {
          logger.warn(`No Pinterest integration for user ${userId}`);
          continue;
        }

        // Get access token
        let accessToken: string | null = null;
        try {
          const { data: vaultToken } = await supabase.rpc('get_credential', {
            p_user_id: userId,
            p_provider: 'pinterest',
            p_credential_type: 'access_token',
          });
          accessToken = vaultToken;
        } catch {
          accessToken = (integration.metadata as any)?._access_token || null;
        }

        if (!accessToken) {
          logger.warn(`No access token for user ${userId}`);
          continue;
        }

        // Get user's ad account
        const { data: adAccounts, error: adAccountError } = await supabase
          .from('pinterest_ad_accounts' as any)
          .select('pinterest_ad_account_id')
          .eq('user_id', userId)
          .limit(1);

        if (adAccountError || !adAccounts || adAccounts.length === 0) {
          logger.warn(`No ad account for user ${userId} - skipping conversion events`);
          // Mark events as failed with explanation
          const eventIds = events.map(e => e.id);
          await supabase
            .from('pinterest_conversion_events' as any)
            .update({
              error: 'No ad account configured',
            })
            .in('id', eventIds);
          continue;
        }

        const adAccountId = adAccounts[0].pinterest_ad_account_id;

        // Convert events to Pinterest API format and send in batches of 100
        const BATCH_SIZE = 100;
        for (let i = 0; i < events.length; i += BATCH_SIZE) {
          const batch = events.slice(i, i + BATCH_SIZE);
          const apiEvents = batch.map(convertToApiFormat);

          const result = await sendEventsToPinterest(accessToken, adAccountId, apiEvents);

          // Update database for this batch
          const batchIds = batch.map(e => e.id);

          if (result.success) {
            await supabase
              .from('pinterest_conversion_events' as any)
              .update({
                sent_to_pinterest: true,
                sent_at: new Date().toISOString(),
                pinterest_response: result.response,
                error: null,
              })
              .in('id', batchIds);

            totalSent += batch.length;
            logger.info(`Sent ${batch.length} events for user ${userId}`);
          } else {
            await supabase
              .from('pinterest_conversion_events' as any)
              .update({
                error: result.error,
                pinterest_response: result.response,
              })
              .in('id', batchIds);

            totalFailed += batch.length;
            logger.error(`Failed to send events for user ${userId}`, {
              error: result.error,
              batchSize: batch.length,
            });
          }

          // Small delay between batches
          if (i + BATCH_SIZE < events.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      } catch (userError) {
        logger.error(`Error processing user ${userId}`, { error: userError });
        errorCount++;
      }
    }

    logger.info('Pinterest conversions sender complete', {
      sent: totalSent,
      failed: totalFailed,
      errors: errorCount,
    });

    return { sent: totalSent, failed: totalFailed, errors: errorCount };
  },
});
