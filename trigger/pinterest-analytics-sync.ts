import { task, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PinAnalytics {
  all?: {
    summary_metrics?: {
      IMPRESSION?: number;
      SAVE?: number;
      PIN_CLICK?: number;
      OUTBOUND_CLICK?: number;
    };
    lifetime_metrics?: Record<string, number>;
  };
  lifetime_metrics?: Record<string, number>;
  all_time?: {
    impressions?: number;
    saves?: number;
    clicks?: number;
  };
  daily_metrics?: Array<{
    metrics?: Record<string, number>;
  }>;
}

async function getPinAnalytics(
  accessToken: string,
  pinId: string,
  startDate: string,
  endDate: string
): Promise<PinAnalytics> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    metric_types: 'IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK',
  });

  const response = await fetch(
    `https://api.pinterest.com/v5/pins/${pinId}/analytics?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinterest API error: ${error}`);
  }

  return response.json();
}

/**
 * Task to sync Pinterest analytics for all users with connected accounts.
 * Triggered via /api/cron/pinterest-analytics-sync (Vercel cron) daily at 6 AM UTC.
 */
export const pinterestAnalyticsSyncTask = task({
  id: 'pinterest-analytics-sync',

  run: async () => {
    const supabase = getSupabaseClient();

    logger.info('Starting Pinterest analytics sync');

    // Get all users with connected Pinterest accounts
    const { data: integrations, error: integrationError } = await supabase
      .from('integrations' as any)
      .select('user_id, metadata')
      .eq('provider', 'pinterest')
      .eq('status', 'connected');

    if (integrationError) {
      logger.error('Failed to fetch Pinterest integrations', { error: integrationError });
      return { users: 0, pins: 0, errors: 1 };
    }

    if (!integrations || integrations.length === 0) {
      logger.info('No users with connected Pinterest accounts');
      return { users: 0, pins: 0, errors: 0 };
    }

    logger.info(`Found ${integrations.length} users with Pinterest connected`);

    let totalSynced = 0;
    let totalUpdated = 0;
    let errorCount = 0;

    // Calculate date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const integration of integrations) {
      const userId = integration.user_id;

      try {
        // Get access token (try vault first, then metadata)
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

        // Get all published pins with Pinterest IDs
        const { data: pins, error: pinsError } = await supabase
          .from('pins' as any)
          .select('id, pinterest_pin_id')
          .eq('user_id', userId)
          .eq('status', 'published')
          .not('pinterest_pin_id', 'is', null);

        if (pinsError) {
          logger.error(`Failed to fetch pins for user ${userId}`, { error: pinsError });
          errorCount++;
          continue;
        }

        if (!pins || pins.length === 0) {
          logger.info(`No published pins for user ${userId}`);
          continue;
        }

        logger.info(`Syncing analytics for ${pins.length} pins for user ${userId}`);

        // Process pins in batches to avoid rate limits
        for (const pin of pins) {
          try {
            const analytics = await getPinAnalytics(
              accessToken,
              pin.pinterest_pin_id,
              startDate,
              endDate
            );

            totalSynced++;

            // Parse analytics (handle multiple Pinterest API response formats)
            const summaryMetrics = analytics.all?.summary_metrics;
            const lifetime = analytics.lifetime_metrics || analytics.all?.lifetime_metrics;
            const allTime = analytics.all_time;

            let impressions = 0;
            let saves = 0;
            let clicks = 0;

            if (summaryMetrics) {
              impressions = summaryMetrics.IMPRESSION || 0;
              saves = summaryMetrics.SAVE || 0;
              clicks = (summaryMetrics.PIN_CLICK || 0) + (summaryMetrics.OUTBOUND_CLICK || 0);
            } else if (lifetime) {
              impressions = lifetime.IMPRESSION || lifetime.impressions || 0;
              saves = lifetime.SAVE || lifetime.saves || 0;
              clicks = (lifetime.PIN_CLICK || 0) + (lifetime.OUTBOUND_CLICK || 0) || lifetime.clicks || 0;
            } else if (allTime) {
              impressions = allTime.impressions || 0;
              saves = allTime.saves || 0;
              clicks = allTime.clicks || 0;
            } else if (analytics.daily_metrics?.length) {
              for (const day of analytics.daily_metrics) {
                const m = day.metrics || {};
                impressions += m.IMPRESSION || 0;
                saves += m.SAVE || 0;
                clicks += (m.PIN_CLICK || 0) + (m.OUTBOUND_CLICK || 0);
              }
            }

            // Calculate engagement and performance tier
            const engagementRate = impressions > 0 ? (saves + clicks) / impressions : 0;
            let performanceTier = 'pending';

            if (impressions >= 100) {
              if (engagementRate >= 0.02) {
                performanceTier = 'top';
              } else if (engagementRate >= 0.01) {
                performanceTier = 'good';
              } else if (engagementRate >= 0.005) {
                performanceTier = 'average';
              } else {
                performanceTier = 'underperformer';
              }
            }

            // Update pin
            const { error: updateError } = await supabase
              .from('pins' as any)
              .update({
                impressions,
                saves,
                clicks,
                engagement_rate: engagementRate,
                performance_tier: performanceTier,
                last_metrics_sync: new Date().toISOString(),
              })
              .eq('id', pin.id);

            if (!updateError) {
              totalUpdated++;
            }

            // Small delay to respect rate limits
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (pinError) {
            logger.error(`Failed to sync pin ${pin.id}`, { error: pinError });
          }
        }
      } catch (userError) {
        logger.error(`Error processing user ${userId}`, { error: userError });
        errorCount++;
      }
    }

    logger.info('Pinterest analytics sync complete', {
      users: integrations.length,
      pinsSynced: totalSynced,
      pinsUpdated: totalUpdated,
      errors: errorCount,
    });

    return {
      users: integrations.length,
      pins: totalSynced,
      updated: totalUpdated,
      errors: errorCount,
    };
  },
});
