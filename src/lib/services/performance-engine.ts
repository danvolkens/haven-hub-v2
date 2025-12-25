import { getAdminClient } from '@/lib/supabase/admin';
import { getPinterestClient } from '@/lib/integrations/pinterest/service';

interface CampaignMetrics {
    campaign_id: string;
    pinterest_campaign_id: string;
    spend: number;
    conversions: number;
    clicks: number;
    impressions: number;
    cpa: number;
    roas: number;
    ctr: number;
    days_active: number;
    daily_budget: number;
}

interface PerformanceRule {
    id: string;
    metric: 'cpa' | 'roas' | 'ctr' | 'conversion_rate';
    comparison: 'less_than' | 'greater_than' | 'between';
    threshold_value: number;
    threshold_min?: number;
    threshold_max?: number;
    action_type: string;
    action_config: Record<string, any>;
    min_spend: number;
    min_days_active: number;
    min_conversions: number;
}

export async function evaluateCampaignPerformance(
    userId: string,
    campaignMetrics: CampaignMetrics
): Promise<{ actions: any[]; isWinner: boolean }> {
    const supabase = getAdminClient();

    const { data: rules } = await (supabase as any)
        .from('performance_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

    if (!rules?.length) return { actions: [], isWinner: false };

    const actions: any[] = [];
    let isWinner = false;

    for (const rule of rules) {
        if (campaignMetrics.spend < rule.min_spend) continue;
        if (campaignMetrics.days_active < rule.min_days_active) continue;
        if (campaignMetrics.conversions < rule.min_conversions) continue;

        const metricValue = campaignMetrics[rule.metric as keyof CampaignMetrics] as number;

        let ruleMatches = false;
        switch (rule.comparison) {
            case 'less_than':
                ruleMatches = metricValue < rule.threshold_value;
                break;
            case 'greater_than':
                ruleMatches = metricValue > rule.threshold_value;
                break;
            case 'between':
                ruleMatches = metricValue >= rule.threshold_min! && metricValue <= rule.threshold_max!;
                break;
        }

        if (ruleMatches) {
            if (rule.action_type === 'flag_winner') {
                isWinner = true;
            } else {
                actions.push({
                    rule_id: rule.id,
                    campaign_id: campaignMetrics.campaign_id,
                    pinterest_campaign_id: campaignMetrics.pinterest_campaign_id,
                    action_type: rule.action_type,
                    action_config: rule.action_config,
                    metrics_snapshot: campaignMetrics,
                    current_budget: campaignMetrics.daily_budget,
                });
            }
        }
    }

    return { actions, isWinner };
}

export async function applyBudgetChange(
    userId: string,
    pinterestCampaignId: string,
    newBudgetMicros: number
) {
    const pinterest = await getPinterestClient(userId);
    if (!pinterest) throw new Error('Pinterest not connected');

    const adAccounts = await pinterest.getAdAccounts();
    const adAccountId = adAccounts.items?.[0]?.id;
    if (!adAccountId) throw new Error('No ad account found');

    // Apply via Pinterest API
    await pinterest.updateAdCampaign(adAccountId, {
        campaign_id: pinterestCampaignId,
        daily_spend_cap: newBudgetMicros,
    });

    return { success: true };
}

export async function pauseCampaign(
    userId: string,
    pinterestCampaignId: string
) {
    const pinterest = await getPinterestClient(userId);
    if (!pinterest) throw new Error('Pinterest not connected');

    const adAccounts = await pinterest.getAdAccounts();
    const adAccountId = adAccounts.items?.[0]?.id;
    if (!adAccountId) throw new Error('No ad account found');

    await pinterest.updateAdCampaign(adAccountId, {
        campaign_id: pinterestCampaignId,
        status: 'PAUSED',
    });

    return { success: true };
}

export async function getDefaultRules(userId: string) {
    return [
        {
            user_id: userId,
            name: 'Scale Winners (CPA < $8)',
            description: 'Increase budget 25% for campaigns with excellent CPA',
            metric: 'cpa',
            comparison: 'less_than',
            threshold_value: 8,
            action_type: 'increase_budget',
            action_config: { percentage: 25, max_daily: 50 },
            min_spend: 50,
            min_days_active: 7,
            min_conversions: 5,
            priority: 1,
        },
        {
            user_id: userId,
            name: 'Flag Winners (ROAS > 3)',
            description: 'Mark campaigns achieving 3x+ ROAS as winners',
            metric: 'roas',
            comparison: 'greater_than',
            threshold_value: 3,
            action_type: 'flag_winner',
            action_config: {},
            min_spend: 50,
            min_days_active: 7,
            min_conversions: 3,
            priority: 2,
        },
        {
            user_id: userId,
            name: 'Pause Underperformers (CPA > $15)',
            description: 'Pause campaigns with CPA exceeding acceptable threshold',
            metric: 'cpa',
            comparison: 'greater_than',
            threshold_value: 15,
            action_type: 'pause',
            action_config: {},
            min_spend: 75,
            min_days_active: 14,
            min_conversions: 0,
            priority: 10,
        },
        {
            user_id: userId,
            name: 'Reduce Budget (CPA $12-15)',
            description: 'Decrease budget 20% for borderline campaigns',
            metric: 'cpa',
            comparison: 'between',
            threshold_min: 12,
            threshold_max: 15,
            action_type: 'decrease_budget',
            action_config: { percentage: 20 },
            min_spend: 75,
            min_days_active: 14,
            min_conversions: 3,
            priority: 5,
        },
    ];
}
