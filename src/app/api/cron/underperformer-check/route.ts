import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { ALERT_THRESHOLDS, GUARDRAIL_DEFAULTS } from '@/lib/constants';

interface PinForCheck {
  id: string;
  user_id: string;
  impressions: number;
  saves: number;
  clicks: number;
  engagement_rate: number;
  published_at: string;
  performance_tier: string;
}

interface UserSettings {
  user_id: string;
  global_mode: string;
  guardrails: {
    auto_retire_days?: number;
  };
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Get all users with their settings
  const { data: allSettings } = await (supabase as any)
    .from('user_settings')
    .select('user_id, global_mode, guardrails');

  if (!allSettings || allSettings.length === 0) {
    return {
      success: true,
      data: {
        checked: 0,
        flagged: 0,
        retired: 0,
        message: 'No users found',
      },
    };
  }

  let totalChecked = 0;
  let totalFlagged = 0;
  let totalRetired = 0;

  for (const settings of allSettings as UserSettings[]) {
    const userId = settings.user_id;
    const autoRetireDays = settings.guardrails?.auto_retire_days || GUARDRAIL_DEFAULTS.auto_retire_days;
    const isAutopilot = settings.global_mode === 'autopilot';
    const isAssisted = settings.global_mode === 'assisted';

    // Calculate the date threshold for underperformer check
    const minDaysAgo = new Date(Date.now() - ALERT_THRESHOLDS.underperformer_days_min * 24 * 60 * 60 * 1000);
    const autoRetireDate = new Date(Date.now() - autoRetireDays * 24 * 60 * 60 * 1000);

    // Get published pins that are old enough to evaluate
    const { data: pins } = await (supabase as any)
      .from('pins')
      .select('id, user_id, impressions, saves, clicks, engagement_rate, published_at, performance_tier')
      .eq('user_id', userId)
      .eq('status', 'published')
      .lt('published_at', minDaysAgo.toISOString())
      .gte('impressions', ALERT_THRESHOLDS.underperformer_impressions_min);

    if (!pins || pins.length === 0) continue;

    for (const pin of pins as PinForCheck[]) {
      totalChecked++;

      const engagementRate = pin.engagement_rate || 0;
      const publishedAt = new Date(pin.published_at);

      // Check if underperforming
      if (engagementRate < ALERT_THRESHOLDS.underperformer_ctr) {
        // Mark as underperformer if not already
        if (pin.performance_tier !== 'underperformer') {
          await (supabase as any)
            .from('pins')
            .update({
              performance_tier: 'underperformer',
              updated_at: new Date().toISOString(),
            })
            .eq('id', pin.id);

          totalFlagged++;

          // Log activity for underperformer detection
          await (supabase as any).rpc('log_activity', {
            p_user_id: userId,
            p_action_type: 'underperformer_detected',
            p_details: {
              pinId: pin.id,
              impressions: pin.impressions,
              engagementRate,
              daysLive: Math.floor((Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000)),
            },
            p_executed: false,
            p_module: 'pinterest',
            p_reference_id: pin.id,
            p_reference_table: 'pins',
          });
        }

        // Check if should auto-retire
        const shouldAutoRetire = publishedAt < autoRetireDate && (isAutopilot || isAssisted);

        if (shouldAutoRetire && isAutopilot) {
          // Auto-retire in autopilot mode
          await (supabase as any)
            .from('pins')
            .update({
              status: 'retired',
              retired_at: new Date().toISOString(),
              retired_reason: 'auto_retired_underperformer',
            })
            .eq('id', pin.id);

          totalRetired++;

          // Log auto-retirement
          await (supabase as any).rpc('log_activity', {
            p_user_id: userId,
            p_action_type: 'pin_auto_retired',
            p_details: {
              pinId: pin.id,
              reason: 'underperformer',
              impressions: pin.impressions,
              engagementRate,
              daysLive: Math.floor((Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000)),
            },
            p_executed: true,
            p_module: 'pinterest',
            p_reference_id: pin.id,
            p_reference_table: 'pins',
          });
        } else if (shouldAutoRetire && isAssisted) {
          // Create approval item for retirement in assisted mode
          await (supabase as any)
            .from('approval_items')
            .insert({
              user_id: userId,
              type: 'pin',
              reference_id: pin.id,
              reference_table: 'pins',
              payload: {
                type: 'pin_retire',
                action: 'retire',
                pinId: pin.id,
                reason: 'underperformer',
                impressions: pin.impressions,
                engagementRate,
                daysLive: Math.floor((Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000)),
                message: `This pin has been live for ${Math.floor((Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000))} days with a ${(engagementRate * 100).toFixed(2)}% engagement rate.`,
              },
              confidence_score: 0.7,
              flags: ['underperformer', 'suggested_retire'],
              flag_reasons: {
                underperformer: `Engagement rate ${(engagementRate * 100).toFixed(2)}% is below threshold`,
                suggested_retire: `Pin has been live for ${autoRetireDays}+ days`,
              },
              priority: 1,
            });
        }
      }
    }
  }

  return {
    success: true,
    data: {
      checked: totalChecked,
      flagged: totalFlagged,
      retired: totalRetired,
      message: 'Underperformer check complete',
    },
  };
});
