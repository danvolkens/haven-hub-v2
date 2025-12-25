import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  generateRecommendations,
  saveRecommendations,
} from '@/lib/services/budget-recommendations';

export const GET = cronHandler(async () => {
  const supabase = getAdminClient();

  // Expire old recommendations first
  await (supabase as any).rpc('expire_old_recommendations');

  // Get users with Pinterest integration
  const { data: users } = await (supabase as any)
    .from('user_settings')
    .select('user_id, guardrails')
    .not('integrations->pinterest', 'is', null);

  let totalGenerated = 0;

  for (const user of users || []) {
    // Get active campaigns with metrics
    const { data: campaigns } = await (supabase as any)
      .from('pinterest_campaigns')
      .select(`
        id,
        pinterest_campaign_id,
        name,
        daily_budget,
        created_at
      `)
      .eq('user_id', user.user_id)
      .eq('status', 'ACTIVE');

    if (!campaigns?.length) continue;

    // Get metrics for each campaign (last 7 days)
    const campaignData = await Promise.all(
      campaigns.map(async (c: any) => {
        const { data: metrics } = await (supabase as any)
          .from('pinterest_campaign_metrics')
          .select('spend, conversions, clicks, impressions')
          .eq('campaign_id', c.id)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false });

        const totals = (metrics || []).reduce(
          (acc: any, m: any) => ({
            spend: acc.spend + (m.spend || 0),
            conversions: acc.conversions + (m.conversions || 0),
            clicks: acc.clicks + (m.clicks || 0),
            impressions: acc.impressions + (m.impressions || 0),
          }),
          { spend: 0, conversions: 0, clicks: 0, impressions: 0 }
        );

        return {
          id: c.id,
          pinterest_campaign_id: c.pinterest_campaign_id,
          name: c.name,
          daily_budget: c.daily_budget || 0,
          spend_7d: totals.spend,
          conversions_7d: totals.conversions,
          clicks_7d: totals.clicks,
          impressions_7d: totals.impressions,
          days_active: Math.floor(
            (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
          ),
        };
      })
    );

    // Generate recommendations
    const recommendations = await generateRecommendations(
      user.user_id,
      campaignData,
      user.guardrails || {}
    );

    if (recommendations.length > 0) {
      await saveRecommendations(user.user_id, recommendations);
      totalGenerated += recommendations.length;
    }
  }

  return { success: true, data: { recommendations_generated: totalGenerated } };
});
