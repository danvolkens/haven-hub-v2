import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { evaluateRulesForUser, MetricData } from '@/lib/alerts/alert-service';

// Runs every 15 minutes to check performance thresholds and trigger alerts
export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Get all users with active alert rules
  const { data: usersWithRules, error: usersError } = await (supabase as any)
    .from('performance_alert_rules')
    .select('user_id')
    .eq('is_active', true);

  if (usersError) {
    throw new Error(`Failed to get users with rules: ${usersError.message}`);
  }

  const uniqueUserIds = [...new Set(usersWithRules?.map((r: any) => r.user_id) || [])];
  let totalAlertsTriggered = 0;
  const errors: string[] = [];

  for (const userId of uniqueUserIds) {
    try {
      // Get pin performance data
      const { data: pins } = await (supabase as any)
        .from('pins')
        .select('id, impressions, saves, clicks')
        .eq('user_id', userId)
        .gt('impressions', 0)
        .order('updated_at', { ascending: false })
        .limit(100);

      // Check each pin against rules
      for (const pin of pins || []) {
        const ctr = pin.impressions > 0 ? pin.clicks / pin.impressions : 0;
        const metrics: MetricData = {
          pin_impressions: pin.impressions,
          pin_saves: pin.saves,
          pin_clicks: pin.clicks,
          pin_ctr: ctr,
        };

        const alerts = await evaluateRulesForUser(userId as string, metrics, { pinId: pin.id });
        totalAlertsTriggered += alerts.length;
      }

      // Get campaign performance data (if ads module is active)
      const { data: campaigns } = await (supabase as any)
        .from('campaigns')
        .select('id, budget, actual_spend, conversions, conversion_value')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(50);

      for (const campaign of campaigns || []) {
        const roas = campaign.actual_spend > 0
          ? campaign.conversion_value / campaign.actual_spend
          : 0;
        const cpa = campaign.conversions > 0
          ? campaign.actual_spend / campaign.conversions
          : 0;

        const metrics: MetricData = {
          campaign_spend: campaign.actual_spend,
          campaign_revenue: campaign.conversion_value,
          campaign_roas: roas,
          campaign_cpa: cpa,
        };

        const alerts = await evaluateRulesForUser(userId as string, metrics, { campaignId: campaign.id });
        totalAlertsTriggered += alerts.length;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`User ${userId}: ${error}`);
    }
  }

  return {
    success: true,
    data: {
      usersChecked: uniqueUserIds.length,
      alertsTriggered: totalAlertsTriggered,
      errors: errors.slice(0, 10),
    },
  };
});
