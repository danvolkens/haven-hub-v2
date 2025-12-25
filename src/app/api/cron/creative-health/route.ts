import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { updateCreativeHealth } from '@/lib/services/creative-health';

/**
 * Cron job to update creative health metrics daily
 * Runs at 8 AM daily to analyze pin performance and detect fatigue
 */
export const GET = cronHandler(async () => {
  const supabase = getAdminClient();

  // Get all users with Pinterest integration
  const { data: users, error: usersError } = await (supabase as any)
    .from('user_settings')
    .select('user_id')
    .not('integrations->pinterest', 'is', null);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return { success: false, data: { error: 'Failed to fetch users' } };
  }

  let totalUpdated = 0;
  let totalFatigued = 0;
  let totalCritical = 0;
  const errors: string[] = [];

  for (const { user_id } of users || []) {
    try {
      // Get published pins with their metrics
      const { data: pins, error: pinsError } = await (supabase as any)
        .from('pins')
        .select(`
          id,
          impressions,
          saves,
          clicks,
          engagement_rate
        `)
        .eq('user_id', user_id)
        .eq('status', 'published')
        .gt('impressions', 0);

      if (pinsError) {
        errors.push(`User ${user_id}: ${pinsError.message}`);
        continue;
      }

      for (const pin of pins || []) {
        // Calculate metrics for this pin
        const impressions = pin.impressions || 0;
        const saves = pin.saves || 0;
        const clicks = pin.clicks || 0;

        // CTR = clicks / impressions
        const ctr = impressions > 0 ? clicks / impressions : 0;

        // Engagement rate = (saves + clicks) / impressions
        const engagementRate =
          impressions > 0 ? (saves + clicks) / impressions : 0;

        // Save rate = saves / impressions
        const saveRate = impressions > 0 ? saves / impressions : 0;

        const health = await updateCreativeHealth(user_id, 'pin', pin.id, {
          ctr,
          engagement_rate: engagementRate,
          save_rate: saveRate,
          impressions,
        });

        if (health) {
          totalUpdated++;
          if (health.fatigue_score >= 50) totalFatigued++;
          if (health.fatigue_score >= 75) totalCritical++;
        }
      }

      // Also check ad creatives if they exist
      const { data: adCreatives } = await (supabase as any)
        .from('pinterest_ads')
        .select(`
          id,
          impressions,
          clicks,
          saves
        `)
        .eq('user_id', user_id)
        .eq('status', 'ACTIVE')
        .gt('impressions', 0);

      for (const ad of adCreatives || []) {
        const impressions = ad.impressions || 0;
        const clicks = ad.clicks || 0;
        const saves = ad.saves || 0;

        const ctr = impressions > 0 ? clicks / impressions : 0;
        const engagementRate =
          impressions > 0 ? (saves + clicks) / impressions : 0;
        const saveRate = impressions > 0 ? saves / impressions : 0;

        const health = await updateCreativeHealth(user_id, 'ad_creative', ad.id, {
          ctr,
          engagement_rate: engagementRate,
          save_rate: saveRate,
          impressions,
        });

        if (health) {
          totalUpdated++;
          if (health.fatigue_score >= 50) totalFatigued++;
          if (health.fatigue_score >= 75) totalCritical++;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`User ${user_id}: ${message}`);
    }
  }

  return {
    success: errors.length === 0,
    data: {
      updated: totalUpdated,
      fatigued: totalFatigued,
      critical: totalCritical,
      users_processed: users?.length || 0,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors in response
    },
  };
});
