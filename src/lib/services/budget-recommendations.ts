import { getAdminClient } from '@/lib/supabase/admin';
import { applyBudgetChange, pauseCampaign } from './performance-engine';

interface CampaignData {
  id: string;
  pinterest_campaign_id: string;
  name: string;
  daily_budget: number;
  spend_7d: number;
  conversions_7d: number;
  clicks_7d: number;
  impressions_7d: number;
  days_active: number;
}

interface Guardrails {
  weekly_cap?: number;
  monthly_cap?: number;
}

interface Reasoning {
  primary: string;
  supporting: string[];
  risks: string[];
}

interface Recommendation {
  campaign_id: string;
  campaign_name: string;
  current_daily_budget: number;
  current_cpa: number | null;
  current_roas: number | null;
  current_spend_7d: number;
  recommendation_type: 'increase' | 'decrease' | 'pause' | 'maintain' | 'test_increase';
  recommended_daily_budget: number;
  recommended_change_percentage: number;
  confidence_score: number;
  reasoning: Reasoning;
  projected_additional_spend: number;
  projected_additional_conversions: number | null;
  projected_new_cpa: number | null;
  valid_until: string;
}

const THRESHOLDS = {
  CPA_EXCELLENT: 8,
  CPA_ACCEPTABLE: 12,
  CPA_POOR: 15,
  ROAS_EXCELLENT: 3,
  ROAS_GOOD: 2,
  MIN_SPEND_FOR_RECOMMENDATION: 50,
  MIN_DAYS_FOR_CONFIDENCE: 7,
  MIN_CONVERSIONS_FOR_CONFIDENCE: 3,
};

export async function generateRecommendations(
  userId: string,
  campaigns: CampaignData[],
  guardrails: Guardrails
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];
  const aov = 15; // Average order value

  for (const campaign of campaigns) {
    const cpa = campaign.conversions_7d > 0
      ? campaign.spend_7d / campaign.conversions_7d
      : null;
    const roas = campaign.spend_7d > 0
      ? (campaign.conversions_7d * aov) / campaign.spend_7d
      : null;

    // Skip campaigns with insufficient spend
    if (campaign.spend_7d < THRESHOLDS.MIN_SPEND_FOR_RECOMMENDATION) continue;

    let recommendation: Recommendation | null = null;

    // Excellent performance - recommend increase
    if (
      cpa !== null &&
      cpa < THRESHOLDS.CPA_EXCELLENT &&
      campaign.conversions_7d >= THRESHOLDS.MIN_CONVERSIONS_FOR_CONFIDENCE
    ) {
      const increasePercent = 25;
      const newBudget = campaign.daily_budget * 1.25;
      const additionalSpend = (newBudget - campaign.daily_budget) * 7;

      recommendation = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        current_daily_budget: campaign.daily_budget,
        current_cpa: cpa,
        current_roas: roas,
        current_spend_7d: campaign.spend_7d,
        recommendation_type: 'increase',
        recommended_daily_budget: newBudget,
        recommended_change_percentage: increasePercent,
        confidence_score: calculateConfidence(campaign, cpa, roas),
        reasoning: {
          primary: `CPA of $${cpa.toFixed(2)} is ${Math.round((1 - cpa / THRESHOLDS.CPA_EXCELLENT) * 100)}% below $8 target`,
          supporting: [
            campaign.days_active >= 7 ? '7+ days of consistent performance' : '',
            roas && roas > THRESHOLDS.ROAS_EXCELLENT ? `ROAS of ${roas.toFixed(1)}x exceeds 3x target` : '',
            `${campaign.conversions_7d} conversions provides statistical confidence`,
          ].filter(Boolean),
          risks: getRisks(campaign, newBudget, guardrails),
        },
        projected_additional_spend: additionalSpend,
        projected_additional_conversions: Math.round(additionalSpend / cpa),
        projected_new_cpa: cpa,
        valid_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    // Poor performance - recommend pause
    else if (cpa !== null && cpa > THRESHOLDS.CPA_POOR && campaign.days_active >= 14) {
      recommendation = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        current_daily_budget: campaign.daily_budget,
        current_cpa: cpa,
        current_roas: roas,
        current_spend_7d: campaign.spend_7d,
        recommendation_type: 'pause',
        recommended_daily_budget: 0,
        recommended_change_percentage: -100,
        confidence_score: calculateConfidence(campaign, cpa, roas),
        reasoning: {
          primary: `CPA of $${cpa.toFixed(2)} exceeds $15 threshold`,
          supporting: [
            `Active for ${campaign.days_active} days`,
            roas && roas < THRESHOLDS.ROAS_GOOD ? `ROAS of ${roas.toFixed(1)}x below break-even` : '',
          ].filter(Boolean),
          risks: ['Pausing may lose audience learning', 'Consider creative refresh first'],
        },
        projected_additional_spend: -campaign.daily_budget * 7,
        projected_additional_conversions: 0,
        projected_new_cpa: null,
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    // Borderline performance - recommend decrease
    else if (cpa !== null && cpa > THRESHOLDS.CPA_ACCEPTABLE && cpa <= THRESHOLDS.CPA_POOR) {
      const newBudget = campaign.daily_budget * 0.8;

      recommendation = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        current_daily_budget: campaign.daily_budget,
        current_cpa: cpa,
        current_roas: roas,
        current_spend_7d: campaign.spend_7d,
        recommendation_type: 'decrease',
        recommended_daily_budget: newBudget,
        recommended_change_percentage: -20,
        confidence_score: calculateConfidence(campaign, cpa, roas),
        reasoning: {
          primary: `CPA of $${cpa.toFixed(2)} is in borderline range ($12-15)`,
          supporting: ['Reducing budget preserves spend while optimizing'],
          risks: ['May reduce delivery and learning'],
        },
        projected_additional_spend: (newBudget - campaign.daily_budget) * 7,
        projected_additional_conversions: null,
        projected_new_cpa: null,
        valid_until: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    if (recommendation) recommendations.push(recommendation);
  }

  return recommendations;
}

function calculateConfidence(
  campaign: CampaignData,
  cpa: number | null,
  roas: number | null
): number {
  let score = 50;

  // Days active bonus
  if (campaign.days_active >= 14) score += 20;
  else if (campaign.days_active >= 7) score += 10;

  // Conversions bonus
  if (campaign.conversions_7d >= 10) score += 20;
  else if (campaign.conversions_7d >= 5) score += 10;
  else if (campaign.conversions_7d >= 3) score += 5;

  // Consistency bonus (placeholder - assumes consistent)
  score += 10;

  return Math.min(score, 100);
}

function getRisks(
  campaign: CampaignData,
  newBudget: number,
  guardrails: Guardrails
): string[] {
  const risks: string[] = [];

  if (guardrails.weekly_cap && newBudget * 7 > guardrails.weekly_cap * 0.8) {
    risks.push('Approaching weekly spend cap');
  }

  if (guardrails.monthly_cap && newBudget * 30 > guardrails.monthly_cap * 0.5) {
    risks.push('May exceed 50% of monthly budget');
  }

  return risks;
}

export async function saveRecommendations(
  userId: string,
  recommendations: Recommendation[]
): Promise<{ data: any; error: any }> {
  const supabase = getAdminClient();

  // Get campaign IDs to supersede old recommendations
  const campaignIds = recommendations.map((r) => r.campaign_id);

  // Supersede old pending recommendations for these campaigns
  await (supabase as any)
    .from('budget_recommendations')
    .update({ status: 'superseded' })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .in('campaign_id', campaignIds);

  // Insert new recommendations
  return (supabase as any)
    .from('budget_recommendations')
    .insert(recommendations.map((r) => ({ user_id: userId, ...r })))
    .select();
}

export async function applyRecommendation(
  userId: string,
  recommendationId: string
): Promise<{ success: boolean }> {
  const supabase = getAdminClient();

  // Get the recommendation with campaign info
  const { data: rec } = await (supabase as any)
    .from('budget_recommendations')
    .select('*')
    .eq('id', recommendationId)
    .eq('user_id', userId)
    .single();

  if (!rec || rec.status !== 'pending') {
    throw new Error('Recommendation not found or already processed');
  }

  // Get campaign to get pinterest_campaign_id
  const { data: campaign } = await (supabase as any)
    .from('pinterest_campaigns')
    .select('pinterest_campaign_id')
    .eq('id', rec.campaign_id)
    .single();

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Apply the action based on type
  if (rec.recommendation_type === 'pause') {
    await pauseCampaign(userId, campaign.pinterest_campaign_id);
  } else if (rec.recommended_daily_budget) {
    // Apply budget change via Pinterest API (budget in micros = dollars * 1,000,000)
    await applyBudgetChange(
      userId,
      campaign.pinterest_campaign_id,
      rec.recommended_daily_budget * 1000000
    );

    // Update local campaign record
    await (supabase as any)
      .from('pinterest_campaigns')
      .update({ daily_budget: rec.recommended_daily_budget })
      .eq('id', rec.campaign_id);
  }

  // Mark recommendation as applied
  await (supabase as any)
    .from('budget_recommendations')
    .update({
      status: 'applied',
      user_action: 'approved',
      user_action_at: new Date().toISOString(),
      applied_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  return { success: true };
}

export async function rejectRecommendation(
  userId: string,
  recommendationId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const supabase = getAdminClient();

  const { data: rec } = await (supabase as any)
    .from('budget_recommendations')
    .select('id')
    .eq('id', recommendationId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .single();

  if (!rec) {
    throw new Error('Recommendation not found or already processed');
  }

  await (supabase as any)
    .from('budget_recommendations')
    .update({
      status: 'rejected',
      user_action: reason || 'rejected',
      user_action_at: new Date().toISOString(),
    })
    .eq('id', recommendationId);

  return { success: true };
}

export async function getPendingRecommendations(userId: string) {
  try {
    const supabase = getAdminClient();

    const { data, error } = await (supabase as any)
      .from('budget_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false });

    if (error) {
      console.error('Supabase error in getPendingRecommendations:', error);
    }

    return { data: data || [], error };
  } catch (e) {
    console.error('Exception in getPendingRecommendations:', e);
    return { data: [], error: e };
  }
}

export async function getRecommendationHistory(userId: string, limit = 50) {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('budget_recommendations')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}
