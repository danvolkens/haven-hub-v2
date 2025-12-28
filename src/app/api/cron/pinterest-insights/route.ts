import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPinterestClient } from '@/lib/integrations/pinterest/service';
import { ALERT_THRESHOLDS } from '@/lib/constants';

interface PinWithMetrics {
  id: string;
  user_id: string;
  pinterest_pin_id: string;
  impressions: number;
  saves: number;
  clicks: number;
  performance_tier: string | null;
}

function calculatePerformanceTier(
  impressions: number,
  saves: number,
  clicks: number
): string {
  if (impressions === 0) return 'new';

  const engagementRate = (saves + clicks) / impressions;

  if (impressions >= ALERT_THRESHOLDS.viral_impressions && engagementRate >= ALERT_THRESHOLDS.high_performer_engagement) {
    return 'top';
  }

  if (engagementRate >= ALERT_THRESHOLDS.high_performer_engagement) {
    return 'good';
  }

  if (engagementRate < ALERT_THRESHOLDS.underperformer_ctr && impressions >= ALERT_THRESHOLDS.underperformer_impressions_min) {
    return 'underperformer';
  }

  return 'average';
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Get all users with Pinterest connected
  const { data: integrations } = await (supabase as any)
    .from('integrations')
    .select('user_id')
    .eq('provider', 'pinterest')
    .eq('status', 'connected');

  if (!integrations || integrations.length === 0) {
    return {
      success: true,
      data: {
        usersProcessed: 0,
        pinsUpdated: 0,
        message: 'No Pinterest integrations found',
      },
    };
  }

  let totalPinsUpdated = 0;
  let usersProcessed = 0;

  for (const integration of integrations) {
    const userId = integration.user_id;

    try {
      // Get Pinterest client
      const client = await getPinterestClient(userId);
      if (!client) continue;

      // Get published pins with Pinterest IDs
      const { data: pins } = await (supabase as any)
        .from('pins')
        .select('id, user_id, pinterest_pin_id, impressions, saves, clicks, performance_tier')
        .eq('user_id', userId)
        .eq('status', 'published')
        .not('pinterest_pin_id', 'is', null)
        .order('published_at', { ascending: false })
        .limit(100);

      if (!pins || pins.length === 0) continue;

      // Fetch analytics for each pin
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let pinsUpdated = 0;

      for (const pin of pins as PinWithMetrics[]) {
        try {
          const analytics = await client.getPinAnalytics(pin.pinterest_pin_id, {
            start_date: startDate,
            end_date: endDate,
            metric_types: ['IMPRESSION', 'SAVE', 'PIN_CLICK', 'OUTBOUND_CLICK'],
          });

          // Pinterest API returns different structures - handle all cases
          const lifetime = (analytics as any).lifetime_metrics || (analytics as any).all?.lifetime_metrics;
          const allTime = analytics.all_time as Record<string, number> | undefined;

          let impressions = pin.impressions || 0;
          let saves = pin.saves || 0;
          let clicks = pin.clicks || 0;
          let outboundClicks = 0;

          if (lifetime) {
            // Pinterest API v5 format
            impressions = lifetime.IMPRESSION || lifetime.impressions || impressions;
            saves = lifetime.SAVE || lifetime.saves || saves;
            clicks = lifetime.PIN_CLICK || lifetime.clicks || clicks;
            outboundClicks = lifetime.OUTBOUND_CLICK || 0;
          } else if (allTime) {
            // Legacy format
            impressions = allTime.impressions || impressions;
            saves = allTime.saves || saves;
            clicks = allTime.clicks || clicks;
            outboundClicks = allTime.outbound_clicks || 0;
          } else if ((analytics as any).daily_metrics?.length > 0) {
            // Sum from daily metrics
            impressions = 0; saves = 0; clicks = 0; outboundClicks = 0;
            for (const day of (analytics as any).daily_metrics) {
              const m = day.metrics || {};
              impressions += m.IMPRESSION || 0;
              saves += m.SAVE || 0;
              clicks += m.PIN_CLICK || 0;
              outboundClicks += m.OUTBOUND_CLICK || 0;
            }
          }

          // Calculate performance tier
          const performanceTier = calculatePerformanceTier(impressions, saves, clicks);
          const engagementRate = impressions > 0 ? (saves + clicks) / impressions : 0;

          // Update pin with new metrics
          await (supabase as any)
            .from('pins')
            .update({
              impressions,
              saves,
              clicks,
              outbound_clicks: outboundClicks,
              engagement_rate: engagementRate,
              performance_tier: performanceTier,
              last_metrics_sync: new Date().toISOString(),
            })
            .eq('id', pin.id);

          // Store daily analytics snapshot
          await (supabase as any)
            .from('pin_analytics_daily')
            .upsert({
              user_id: userId,
              pin_id: pin.id,
              date: endDate,
              impressions,
              saves,
              clicks,
              engagement_rate: engagementRate,
            }, {
              onConflict: 'pin_id,date',
            });

          // Check for viral content alert
          if (
            impressions >= ALERT_THRESHOLDS.viral_impressions &&
            pin.impressions < ALERT_THRESHOLDS.viral_impressions
          ) {
            // Log viral content alert
            await (supabase as any).rpc('log_activity', {
              p_user_id: userId,
              p_action_type: 'viral_content_detected',
              p_details: {
                pinId: pin.id,
                impressions,
                saves,
                clicks,
                engagementRate,
              },
              p_executed: true,
              p_module: 'pinterest',
              p_reference_id: pin.id,
              p_reference_table: 'pins',
            });
          }

          pinsUpdated++;
        } catch (err) {
          console.error(`Failed to sync analytics for pin ${pin.id}:`, err);
        }
      }

      totalPinsUpdated += pinsUpdated;
      usersProcessed++;
    } catch (err) {
      console.error(`Failed to process user ${userId}:`, err);
    }
  }

  return {
    success: true,
    data: {
      usersProcessed,
      pinsUpdated: totalPinsUpdated,
      message: 'Pinterest insights sync complete',
    },
  };
});
