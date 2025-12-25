import { task, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import type { WinnerRefreshPayload } from '@/lib/trigger/client';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PinWithAnalytics {
  id: string;
  pinterest_pin_id: string;
  user_id: string;
  collection: string | null;
  impressions: number;
  saves: number;
  clicks: number;
  engagement_rate: number;
}

interface WinnerRecord {
  pin_id: string;
  collection: string;
  rank: number;
  score: number;
  metrics: {
    impressions: number;
    saves: number;
    clicks: number;
    engagement_rate: number;
  };
}

/**
 * Calculate winner score based on engagement metrics
 * Weights: Saves (40%), Clicks (35%), Engagement Rate (25%)
 */
function calculateWinnerScore(pin: PinWithAnalytics): number {
  const saveScore = pin.saves * 4;
  const clickScore = pin.clicks * 3.5;
  const engagementScore = pin.engagement_rate * 250;

  return saveScore + clickScore + engagementScore;
}

export const winnerRefreshTask = task({
  id: 'winner-refresh',

  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },

  run: async (payload: WinnerRefreshPayload) => {
    const supabase = getSupabaseClient();
    const { userId, pinIds } = payload;

    logger.info('Starting winner refresh', { userId, pinIds: pinIds?.length });

    // Step 1: Fetch pins with analytics
    let query = supabase
      .from('pins' as any)
      .select('id, pinterest_pin_id, user_id, collection, impressions, saves, clicks, engagement_rate')
      .eq('user_id', userId)
      .eq('status', 'published')
      .not('pinterest_pin_id', 'is', null);

    if (pinIds && pinIds.length > 0) {
      query = query.in('id', pinIds);
    }

    const { data: pins, error } = await query;

    if (error) {
      logger.error('Failed to fetch pins', { error });
      throw new Error(`Failed to fetch pins: ${error.message}`);
    }

    if (!pins || pins.length === 0) {
      logger.info('No published pins found for winner analysis');
      return { success: true, winnersUpdated: 0 };
    }

    logger.info(`Analyzing ${pins.length} pins for winners`);

    // Step 2: Group pins by collection and calculate scores
    const collectionPins: Record<string, Array<PinWithAnalytics & { score: number }>> = {};

    for (const pin of pins as PinWithAnalytics[]) {
      const collection = pin.collection || 'uncategorized';
      const score = calculateWinnerScore(pin);

      if (!collectionPins[collection]) {
        collectionPins[collection] = [];
      }

      collectionPins[collection].push({ ...pin, score });
    }

    // Step 3: Sort and select top winners per collection
    const winners: WinnerRecord[] = [];

    for (const [collection, collectionPinsArray] of Object.entries(collectionPins)) {
      // Sort by score descending
      collectionPinsArray.sort((a, b) => b.score - a.score);

      // Take top 10 per collection
      const topPins = collectionPinsArray.slice(0, 10);

      topPins.forEach((pin, index) => {
        winners.push({
          pin_id: pin.id,
          collection,
          rank: index + 1,
          score: pin.score,
          metrics: {
            impressions: pin.impressions,
            saves: pin.saves,
            clicks: pin.clicks,
            engagement_rate: pin.engagement_rate,
          },
        });
      });
    }

    logger.info(`Identified ${winners.length} winners across ${Object.keys(collectionPins).length} collections`);

    // Step 4: Clear existing winners for this user
    await supabase
      .from('pin_winners' as any)
      .delete()
      .eq('user_id', userId);

    // Step 5: Insert new winners
    if (winners.length > 0) {
      const winnerRecords = winners.map((w) => ({
        user_id: userId,
        pin_id: w.pin_id,
        collection: w.collection,
        rank: w.rank,
        score: w.score,
        metrics: w.metrics,
        calculated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('pin_winners' as any)
        .insert(winnerRecords);

      if (insertError) {
        logger.error('Failed to insert winners', { error: insertError });
        throw new Error(`Failed to insert winners: ${insertError.message}`);
      }
    }

    // Step 6: Update pins with winner status
    const winnerPinIds = winners.filter((w) => w.rank <= 3).map((w) => w.pin_id);

    if (winnerPinIds.length > 0) {
      await supabase
        .from('pins' as any)
        .update({ is_winner: true })
        .in('id', winnerPinIds);

      // Reset non-winners
      await supabase
        .from('pins' as any)
        .update({ is_winner: false })
        .eq('user_id', userId)
        .not('id', 'in', `(${winnerPinIds.join(',')})`);
    }

    // Step 7: Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'winners_refreshed',
      p_details: {
        totalPinsAnalyzed: pins.length,
        winnersIdentified: winners.length,
        collections: Object.keys(collectionPins),
        topWinners: winners.slice(0, 5).map((w) => ({
          pinId: w.pin_id,
          collection: w.collection,
          score: w.score,
        })),
      },
      p_executed: true,
      p_module: 'pinterest',
    });

    logger.info('Winner refresh complete', {
      userId,
      pinsAnalyzed: pins.length,
      winnersUpdated: winners.length,
    });

    return {
      success: true,
      pinsAnalyzed: pins.length,
      winnersUpdated: winners.length,
      collections: Object.keys(collectionPins),
    };
  },
});
