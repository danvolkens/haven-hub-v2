import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { evaluateCampaignPerformance, applyBudgetChange, pauseCampaign } from '@/lib/services/performance-engine';

export const GET = cronHandler(async (request: NextRequest) => {
    const supabase = getAdminClient();

    // Get all users with active Pinterest integration from integrations table
    const { data: connectedIntegrations } = await supabase
        .from('integrations')
        .select('user_id')
        .eq('provider', 'pinterest')
        .eq('status', 'connected');

    if (!connectedIntegrations?.length) {
        return { success: true, data: { processed: 0 } };
    }

    const userIds = connectedIntegrations.map(i => i.user_id);
    const { data: userSettings } = await supabase
        .from('user_settings')
        .select('user_id, global_mode')
        .in('user_id', userIds);

    const userMap = new Map(userSettings?.map(u => [u.user_id, u]) || []);

    let totalActions = 0;
    let totalWinners = 0;
    let totalApplied = 0;

    for (const userId of userIds) {
        const user = userMap.get(userId) || { user_id: userId, global_mode: 'manual' };

        // Use ad_campaigns table (the actual table name from migrations)
        const { data: campaigns } = await supabase
            .from('ad_campaigns')
            .select(`
                id,
                pinterest_campaign_id,
                daily_spend_cap,
                status,
                created_at,
                total_spend,
                impressions,
                clicks,
                conversions
            `)
            .eq('user_id', user.user_id)
            .eq('status', 'ACTIVE');

        if (!campaigns?.length) continue;

        const isAutopilot = user.global_mode === 'autopilot';

        for (const campaign of campaigns) {
            const daysActive = Math.floor(
                (Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            const aov = 15; // Could fetch from settings
            const spend = Number(campaign.total_spend) || 0;
            const conversions = campaign.conversions || 0;
            const clicks = campaign.clicks || 0;
            const impressions = campaign.impressions || 0;

            const campaignMetrics = {
                campaign_id: campaign.id,
                pinterest_campaign_id: campaign.pinterest_campaign_id || '',
                spend,
                conversions,
                clicks,
                impressions,
                cpa: conversions > 0 ? spend / conversions : 999,
                roas: spend > 0 ? (conversions * aov) / spend : 0,
                ctr: impressions > 0 ? clicks / impressions : 0,
                days_active: daysActive,
                daily_budget: Number(campaign.daily_spend_cap) || 0,
            };

            const { actions, isWinner } = await evaluateCampaignPerformance(user.user_id, campaignMetrics);

            // Flag winner - update campaign metadata
            if (isWinner) {
                // Note: is_winner column doesn't exist in ad_campaigns schema
                // Storing in metadata JSONB column would be ideal, or just track via actions
                totalWinners++;
            }

            // Process actions
            for (const action of actions) {
                let previousValue = {};
                let newValue = {};
                let newBudget = Number(campaign.daily_spend_cap) || 0;

                if (action.action_type === 'increase_budget') {
                    const increase = action.action_config.percentage / 100;
                    newBudget = Math.min(
                        newBudget * (1 + increase),
                        action.action_config.max_daily || 100
                    );
                    previousValue = { daily_spend_cap: campaign.daily_spend_cap };
                    newValue = { daily_spend_cap: newBudget };
                } else if (action.action_type === 'decrease_budget') {
                    const decrease = action.action_config.percentage / 100;
                    newBudget = newBudget * (1 - decrease);
                    previousValue = { daily_spend_cap: campaign.daily_spend_cap };
                    newValue = { daily_spend_cap: newBudget };
                } else if (action.action_type === 'pause') {
                    previousValue = { status: 'ACTIVE' };
                    newValue = { status: 'PAUSED' };
                }

                // Create action record
                const { data: actionRecord } = await (supabase as any)
                    .from('performance_actions')
                    .insert({
                        user_id: user.user_id,
                        rule_id: action.rule_id,
                        campaign_id: action.campaign_id,
                        action_type: action.action_type,
                        previous_value: previousValue,
                        new_value: newValue,
                        metrics_snapshot: action.metrics_snapshot,
                        requires_approval: !isAutopilot,
                        status: isAutopilot ? 'applied' : 'pending',
                    })
                    .select()
                    .single();

                totalActions++;

                // Auto-apply in autopilot mode
                if (isAutopilot && actionRecord) {
                    try {
                        if (action.action_type === 'increase_budget' || action.action_type === 'decrease_budget') {
                            if (action.pinterest_campaign_id) {
                                await applyBudgetChange(
                                    user.user_id,
                                    action.pinterest_campaign_id,
                                    newBudget * 1000000 // Convert to micros
                                );
                            }

                            await supabase
                                .from('ad_campaigns')
                                .update({ daily_spend_cap: newBudget })
                                .eq('id', action.campaign_id);
                        } else if (action.action_type === 'pause') {
                            if (action.pinterest_campaign_id) {
                                await pauseCampaign(user.user_id, action.pinterest_campaign_id);
                            }

                            await supabase
                                .from('ad_campaigns')
                                .update({ status: 'PAUSED' })
                                .eq('id', action.campaign_id);
                        }

                        await (supabase as any)
                            .from('performance_actions')
                            .update({ executed_at: new Date().toISOString() })
                            .eq('id', actionRecord.id);

                        totalApplied++;
                    } catch (error) {
                        await (supabase as any)
                            .from('performance_actions')
                            .update({
                                status: 'failed',
                                error_message: error instanceof Error ? error.message : 'Unknown error'
                            })
                            .eq('id', actionRecord.id);
                    }
                }
            }
        }
    }

    return {
        success: true,
        data: {
            actions_created: totalActions,
            actions_applied: totalApplied,
            winners_detected: totalWinners,
        },
    };
});
