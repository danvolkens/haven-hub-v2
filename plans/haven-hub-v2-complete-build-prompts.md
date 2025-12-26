# Haven Hub V2 — Complete Build Prompts (Final)

All 9 prompts for missing automation features. Each is self-contained with database schema, services, API routes, UI guidance, and cron configuration.

**Prerequisites:**
- Pinterest Standard Access ✅ (approved)
- Existing V2 codebase with Supabase, Next.js 14+, Trigger.dev

---

## Prompt 1: Winner Detection & Auto-Scaling System

```
Add a Winner Detection and Auto-Scaling system to Haven Hub.

## Database Schema

Create migration `supabase/migrations/025_performance_rules.sql`:

```sql
-- Performance Rules Configuration
CREATE TABLE performance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rule configuration
  metric TEXT NOT NULL CHECK (metric IN ('cpa', 'roas', 'ctr', 'conversion_rate')),
  comparison TEXT NOT NULL CHECK (comparison IN ('less_than', 'greater_than', 'between')),
  threshold_value DECIMAL(10,2),
  threshold_min DECIMAL(10,2),
  threshold_max DECIMAL(10,2),
  
  -- Action to take
  action_type TEXT NOT NULL CHECK (action_type IN (
    'increase_budget', 'decrease_budget', 'pause', 'alert', 'flag_winner'
  )),
  action_config JSONB DEFAULT '{}',
  
  -- Conditions
  min_spend DECIMAL(10,2) DEFAULT 50,
  min_days_active INTEGER DEFAULT 7,
  min_conversions INTEGER DEFAULT 3,
  
  -- Scope
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'specific')),
  campaign_ids UUID[],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 10,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Actions Log
CREATE TABLE performance_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  rule_id UUID REFERENCES performance_rules(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL,
  
  action_type TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  metrics_snapshot JSONB NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'applied', 'failed'
  )),
  
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_perf_rules_user ON performance_rules(user_id, is_active);
CREATE INDEX idx_perf_actions_user ON performance_actions(user_id, created_at DESC);
CREATE INDEX idx_perf_actions_status ON performance_actions(user_id, status);
CREATE INDEX idx_perf_actions_campaign ON performance_actions(campaign_id);

-- RLS
ALTER TABLE performance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY perf_rules_all ON performance_rules FOR ALL USING (user_id = auth.uid());
CREATE POLICY perf_actions_all ON performance_actions FOR ALL USING (user_id = auth.uid());
```

## Service Implementation

Create `lib/services/performance-engine.ts`:

```typescript
import { getAdminClient } from '@/lib/supabase/admin';
import { getPinterestClient } from '@/lib/integrations/pinterest';

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
  
  const { data: rules } = await supabase
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
        ruleMatches = metricValue >= rule.threshold_min && metricValue <= rule.threshold_max;
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
  
  // Apply via Pinterest API
  await pinterest.campaigns.update({
    ad_account_id: pinterest.adAccountId,
    campaign_id: pinterestCampaignId,
    daily_spend_cap: newBudgetMicros,
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
```

## Cron Job

Create `app/api/cron/performance-evaluation/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { evaluateCampaignPerformance, applyBudgetChange } from '@/lib/services/performance-engine';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();
  
  // Get all users with active Pinterest integration
  const { data: users } = await supabase
    .from('user_settings')
    .select('user_id, global_mode')
    .not('integrations->pinterest', 'is', null);
  
  if (!users?.length) {
    return { success: true, data: { processed: 0 } };
  }
  
  let totalActions = 0;
  let totalWinners = 0;
  let totalApplied = 0;
  
  for (const user of users) {
    const { data: campaigns } = await supabase
      .from('pinterest_campaigns')
      .select(`
        id,
        pinterest_campaign_id,
        daily_budget,
        status,
        created_at,
        pinterest_campaign_metrics (
          spend,
          conversions,
          clicks,
          impressions
        )
      `)
      .eq('user_id', user.user_id)
      .eq('status', 'active');
    
    if (!campaigns?.length) continue;
    
    const isAutopilot = user.global_mode === 'autopilot';
    
    for (const campaign of campaigns) {
      const metrics = campaign.pinterest_campaign_metrics?.[0];
      if (!metrics) continue;
      
      const daysActive = Math.floor(
        (Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const aov = 15; // Could fetch from settings
      const campaignMetrics = {
        campaign_id: campaign.id,
        pinterest_campaign_id: campaign.pinterest_campaign_id,
        spend: metrics.spend || 0,
        conversions: metrics.conversions || 0,
        clicks: metrics.clicks || 0,
        impressions: metrics.impressions || 0,
        cpa: metrics.conversions > 0 ? metrics.spend / metrics.conversions : 999,
        roas: metrics.spend > 0 ? (metrics.conversions * aov) / metrics.spend : 0,
        ctr: metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0,
        days_active: daysActive,
        daily_budget: campaign.daily_budget,
      };
      
      const { actions, isWinner } = await evaluateCampaignPerformance(user.user_id, campaignMetrics);
      
      // Flag winner
      if (isWinner) {
        await supabase
          .from('pinterest_campaigns')
          .update({ is_winner: true, winner_detected_at: new Date().toISOString() })
          .eq('id', campaign.id);
        totalWinners++;
      }
      
      // Process actions
      for (const action of actions) {
        let previousValue = {};
        let newValue = {};
        let newBudget = campaign.daily_budget;
        
        if (action.action_type === 'increase_budget') {
          const increase = action.action_config.percentage / 100;
          newBudget = Math.min(
            campaign.daily_budget * (1 + increase),
            action.action_config.max_daily || 100
          );
          previousValue = { daily_budget: campaign.daily_budget };
          newValue = { daily_budget: newBudget };
        } else if (action.action_type === 'decrease_budget') {
          const decrease = action.action_config.percentage / 100;
          newBudget = campaign.daily_budget * (1 - decrease);
          previousValue = { daily_budget: campaign.daily_budget };
          newValue = { daily_budget: newBudget };
        } else if (action.action_type === 'pause') {
          previousValue = { status: 'active' };
          newValue = { status: 'paused' };
        }
        
        // Create action record
        const { data: actionRecord } = await supabase
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
              await applyBudgetChange(
                user.user_id,
                action.pinterest_campaign_id,
                newBudget * 1000000 // Convert to micros
              );
              
              await supabase
                .from('pinterest_campaigns')
                .update({ daily_budget: newBudget })
                .eq('id', action.campaign_id);
            } else if (action.action_type === 'pause') {
              // Pause via Pinterest API
              const pinterest = await getPinterestClient(user.user_id);
              await pinterest.campaigns.update({
                ad_account_id: pinterest.adAccountId,
                campaign_id: action.pinterest_campaign_id,
                status: 'PAUSED',
              });
              
              await supabase
                .from('pinterest_campaigns')
                .update({ status: 'paused' })
                .eq('id', action.campaign_id);
            }
            
            await supabase
              .from('performance_actions')
              .update({ executed_at: new Date().toISOString() })
              .eq('id', actionRecord.id);
            
            totalApplied++;
          } catch (error) {
            await supabase
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
```

## API Routes

Create `app/api/performance-rules/route.ts`:
- GET: List rules for user
- POST: Create new rule
- PUT: Update rule
- DELETE: Delete rule

Create `app/api/performance-actions/route.ts`:
- GET: List pending/recent actions
- POST with action 'approve': Approve and apply action
- POST with action 'reject': Reject action

## UI Components

Create `app/(admin)/pinterest/settings/performance-rules/page.tsx`:
1. List of rules with enable/disable toggles
2. Edit rule modal
3. Create custom rule form
4. Test rule against historical data

Create pending actions widget for dashboard showing count and quick approve/reject.

## Vercel Cron

Add to `vercel.json` crons array:
```json
{
  "path": "/api/cron/performance-evaluation",
  "schedule": "0 6 * * *"
}
```
```

---

## Prompt 2: Budget Recommendations Engine

```
Add a Budget Recommendations Engine to Haven Hub that generates proactive budget optimization suggestions.

## Database Schema

Create migration `supabase/migrations/026_budget_recommendations.sql`:

```sql
CREATE TABLE budget_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  campaign_id UUID NOT NULL,
  campaign_name TEXT,
  
  current_daily_budget DECIMAL(10,2) NOT NULL,
  current_cpa DECIMAL(10,2),
  current_roas DECIMAL(10,2),
  current_spend_7d DECIMAL(10,2),
  
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'increase', 'decrease', 'pause', 'maintain', 'test_increase'
  )),
  recommended_daily_budget DECIMAL(10,2),
  recommended_change_percentage DECIMAL(5,2),
  
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  reasoning JSONB NOT NULL,
  
  projected_additional_spend DECIMAL(10,2),
  projected_additional_conversions INTEGER,
  projected_new_cpa DECIMAL(10,2),
  
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'applied', 'expired', 'superseded'
  )),
  
  user_action TEXT,
  user_action_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  
  valid_until TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_rec_user ON budget_recommendations(user_id, status, created_at DESC);
CREATE INDEX idx_budget_rec_campaign ON budget_recommendations(campaign_id);
CREATE INDEX idx_budget_rec_pending ON budget_recommendations(user_id, status) WHERE status = 'pending';

ALTER TABLE budget_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY budget_rec_all ON budget_recommendations FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS void AS $$
BEGIN
  UPDATE budget_recommendations
  SET status = 'expired'
  WHERE status = 'pending' AND valid_until < NOW();
END;
$$ LANGUAGE plpgsql;
```

## Service Implementation

Create `lib/services/budget-recommendations.ts`:

```typescript
import { getAdminClient } from '@/lib/supabase/admin';
import { applyBudgetChange } from './performance-engine';

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
  guardrails: { weekly_cap?: number; monthly_cap?: number }
) {
  const recommendations = [];
  const aov = 15;
  
  for (const campaign of campaigns) {
    const cpa = campaign.conversions_7d > 0 
      ? campaign.spend_7d / campaign.conversions_7d 
      : null;
    const roas = campaign.spend_7d > 0 
      ? (campaign.conversions_7d * aov) / campaign.spend_7d 
      : null;
    
    if (campaign.spend_7d < THRESHOLDS.MIN_SPEND_FOR_RECOMMENDATION) continue;
    
    let recommendation = null;
    
    // Excellent - recommend increase
    if (cpa !== null && cpa < THRESHOLDS.CPA_EXCELLENT && 
        campaign.conversions_7d >= THRESHOLDS.MIN_CONVERSIONS_FOR_CONFIDENCE) {
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
    // Poor - recommend pause
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
    // Borderline - recommend decrease
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

function calculateConfidence(campaign: CampaignData, cpa: number | null, roas: number | null): number {
  let score = 50;
  if (campaign.days_active >= 14) score += 20;
  else if (campaign.days_active >= 7) score += 10;
  if (campaign.conversions_7d >= 10) score += 20;
  else if (campaign.conversions_7d >= 5) score += 10;
  else if (campaign.conversions_7d >= 3) score += 5;
  score += 10; // Consistency bonus
  return Math.min(score, 100);
}

function getRisks(campaign: CampaignData, newBudget: number, guardrails: any): string[] {
  const risks: string[] = [];
  if (guardrails.weekly_cap && newBudget * 7 > guardrails.weekly_cap * 0.8) {
    risks.push('Approaching weekly spend cap');
  }
  if (guardrails.monthly_cap && newBudget * 30 > guardrails.monthly_cap * 0.5) {
    risks.push('May exceed 50% of monthly budget');
  }
  return risks;
}

export async function saveRecommendations(userId: string, recommendations: any[]) {
  const supabase = getAdminClient();
  
  const campaignIds = recommendations.map(r => r.campaign_id);
  
  await supabase
    .from('budget_recommendations')
    .update({ status: 'superseded' })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .in('campaign_id', campaignIds);
  
  return supabase
    .from('budget_recommendations')
    .insert(recommendations.map(r => ({ user_id: userId, ...r })))
    .select();
}

export async function applyRecommendation(userId: string, recommendationId: string) {
  const supabase = getAdminClient();
  
  const { data: rec } = await supabase
    .from('budget_recommendations')
    .select('*, pinterest_campaigns!inner(pinterest_campaign_id)')
    .eq('id', recommendationId)
    .eq('user_id', userId)
    .single();
  
  if (!rec || rec.status !== 'pending') {
    throw new Error('Recommendation not found or already processed');
  }
  
  if (rec.recommendation_type !== 'pause' && rec.recommended_daily_budget) {
    await applyBudgetChange(
      userId,
      rec.pinterest_campaigns.pinterest_campaign_id,
      rec.recommended_daily_budget * 1000000
    );
    
    await supabase
      .from('pinterest_campaigns')
      .update({ daily_budget: rec.recommended_daily_budget })
      .eq('id', rec.campaign_id);
  }
  
  await supabase
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
```

## Cron Job

Create `app/api/cron/budget-recommendations/route.ts`:

```typescript
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateRecommendations, saveRecommendations } from '@/lib/services/budget-recommendations';

export const GET = cronHandler(async () => {
  const supabase = getAdminClient();
  
  // Expire old recommendations first
  await supabase.rpc('expire_old_recommendations');
  
  const { data: users } = await supabase
    .from('user_settings')
    .select('user_id, guardrails')
    .not('integrations->pinterest', 'is', null);
  
  let totalGenerated = 0;
  
  for (const user of users || []) {
    const { data: campaigns } = await supabase
      .from('pinterest_campaigns')
      .select(`
        id,
        pinterest_campaign_id,
        name,
        daily_budget,
        created_at,
        pinterest_campaign_metrics (spend, conversions, clicks, impressions)
      `)
      .eq('user_id', user.user_id)
      .eq('status', 'active');
    
    if (!campaigns?.length) continue;
    
    const campaignData = campaigns.map(c => ({
      id: c.id,
      pinterest_campaign_id: c.pinterest_campaign_id,
      name: c.name,
      daily_budget: c.daily_budget,
      spend_7d: c.pinterest_campaign_metrics?.[0]?.spend || 0,
      conversions_7d: c.pinterest_campaign_metrics?.[0]?.conversions || 0,
      clicks_7d: c.pinterest_campaign_metrics?.[0]?.clicks || 0,
      impressions_7d: c.pinterest_campaign_metrics?.[0]?.impressions || 0,
      days_active: Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    }));
    
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
```

## API Routes

Create `app/api/budget-recommendations/route.ts`:
- GET: Fetch pending recommendations
- POST: Manually trigger generation

Create `app/api/budget-recommendations/[id]/route.ts`:
- POST with action='apply': Apply recommendation
- POST with action='reject': Reject recommendation

## UI Integration

Update the existing Budget page to show:
1. Summary cards: "X recommendations pending", "Potential savings", "Growth opportunity"
2. Recommendation cards with confidence indicator, reasoning, and approve/reject buttons
3. History of applied recommendations

## Vercel Cron

Add to `vercel.json` crons array:
```json
{
  "path": "/api/cron/budget-recommendations",
  "schedule": "0 7 * * *"
}
```
```

---

## Prompt 3: Creative Fatigue Detection

```
Add Creative Fatigue Detection to Haven Hub to track performance degradation and recommend refreshes.

## Database Schema

Create migration `supabase/migrations/027_creative_health.sql`:

```sql
CREATE TABLE creative_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  content_type TEXT NOT NULL CHECK (content_type IN ('pin', 'ad_creative', 'asset')),
  content_id UUID NOT NULL,
  
  -- Baseline (captured after 7 days or 1000 impressions)
  baseline_ctr DECIMAL(6,4),
  baseline_engagement_rate DECIMAL(6,4),
  baseline_save_rate DECIMAL(6,4),
  baseline_captured_at TIMESTAMPTZ,
  baseline_impressions INTEGER,
  
  -- Current (rolling 7-day)
  current_ctr DECIMAL(6,4),
  current_engagement_rate DECIMAL(6,4),
  current_save_rate DECIMAL(6,4),
  current_impressions INTEGER,
  last_metrics_update TIMESTAMPTZ,
  
  -- Fatigue tracking
  fatigue_score INTEGER DEFAULT 0 CHECK (fatigue_score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'pending_baseline' CHECK (status IN (
    'pending_baseline', 'healthy', 'declining', 'fatigued', 'critical'
  )),
  
  metrics_history JSONB DEFAULT '[]',
  
  days_active INTEGER DEFAULT 0,
  days_since_baseline INTEGER DEFAULT 0,
  
  refresh_recommended BOOLEAN DEFAULT false,
  refresh_recommended_at TIMESTAMPTZ,
  refresh_reason TEXT,
  
  last_refresh_at TIMESTAMPTZ,
  refresh_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_creative_health_content ON creative_health(user_id, content_type, content_id);
CREATE INDEX idx_creative_health_status ON creative_health(user_id, status);
CREATE INDEX idx_creative_health_fatigued ON creative_health(user_id, fatigue_score DESC) WHERE fatigue_score > 50;

ALTER TABLE creative_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY creative_health_all ON creative_health FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_creative_health_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.baseline_ctr IS NULL THEN
    NEW.status := 'pending_baseline';
  ELSIF NEW.fatigue_score <= 25 THEN
    NEW.status := 'healthy';
  ELSIF NEW.fatigue_score <= 50 THEN
    NEW.status := 'declining';
  ELSIF NEW.fatigue_score <= 75 THEN
    NEW.status := 'fatigued';
  ELSE
    NEW.status := 'critical';
  END IF;
  
  IF NEW.fatigue_score >= 75 AND (OLD.refresh_recommended IS NULL OR NOT OLD.refresh_recommended) THEN
    NEW.refresh_recommended := true;
    NEW.refresh_recommended_at := NOW();
    NEW.refresh_reason := 'Fatigue score exceeded 75%';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creative_health_status_trigger
  BEFORE UPDATE OF fatigue_score ON creative_health
  FOR EACH ROW EXECUTE FUNCTION update_creative_health_status();
```

## Service Implementation

Create `lib/services/creative-health.ts`:

```typescript
import { getAdminClient } from '@/lib/supabase/admin';

const BASELINE_THRESHOLD = { MIN_IMPRESSIONS: 1000, MIN_DAYS: 7 };
const FATIGUE_WEIGHTS = { CTR_DECLINE: 0.5, ENGAGEMENT_DECLINE: 0.3, SAVE_RATE_DECLINE: 0.2 };

export async function updateCreativeHealth(
  userId: string,
  contentType: 'pin' | 'ad_creative' | 'asset',
  contentId: string,
  currentMetrics: { ctr: number; engagement_rate: number; save_rate: number; impressions: number }
) {
  const supabase = getAdminClient();
  const today = new Date().toISOString().split('T')[0];
  
  let { data: health } = await supabase
    .from('creative_health')
    .select('*')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .single();
  
  if (!health) {
    const { data: newHealth } = await supabase
      .from('creative_health')
      .insert({
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        current_ctr: currentMetrics.ctr,
        current_engagement_rate: currentMetrics.engagement_rate,
        current_save_rate: currentMetrics.save_rate,
        current_impressions: currentMetrics.impressions,
        last_metrics_update: new Date().toISOString(),
        days_active: 1,
        metrics_history: [{ date: today, ...currentMetrics }],
      })
      .select()
      .single();
    return newHealth;
  }
  
  const history = [...(health.metrics_history || [])];
  const existingToday = history.findIndex((h: any) => h.date === today);
  if (existingToday >= 0) {
    history[existingToday] = { date: today, ...currentMetrics };
  } else {
    history.push({ date: today, ...currentMetrics });
    if (history.length > 90) history.shift();
  }
  
  const daysActive = history.length;
  const totalImpressions = history.reduce((sum: number, h: any) => sum + h.impressions, 0);
  
  let updates: any = {
    current_ctr: currentMetrics.ctr,
    current_engagement_rate: currentMetrics.engagement_rate,
    current_save_rate: currentMetrics.save_rate,
    current_impressions: currentMetrics.impressions,
    last_metrics_update: new Date().toISOString(),
    days_active: daysActive,
    metrics_history: history,
  };
  
  // Capture baseline
  if (!health.baseline_ctr && daysActive >= BASELINE_THRESHOLD.MIN_DAYS && totalImpressions >= BASELINE_THRESHOLD.MIN_IMPRESSIONS) {
    const baselineDays = history.slice(0, 7);
    updates.baseline_ctr = average(baselineDays.map((d: any) => d.ctr));
    updates.baseline_engagement_rate = average(baselineDays.map((d: any) => d.engagement_rate));
    updates.baseline_save_rate = average(baselineDays.map((d: any) => d.save_rate));
    updates.baseline_captured_at = new Date().toISOString();
    updates.baseline_impressions = baselineDays.reduce((sum: number, d: any) => sum + d.impressions, 0);
  }
  
  // Calculate fatigue score
  if (health.baseline_ctr || updates.baseline_ctr) {
    const baseline = {
      ctr: updates.baseline_ctr || health.baseline_ctr,
      engagement_rate: updates.baseline_engagement_rate || health.baseline_engagement_rate,
      save_rate: updates.baseline_save_rate || health.baseline_save_rate,
    };
    
    const recentDays = history.slice(-7);
    const recent = {
      ctr: average(recentDays.map((d: any) => d.ctr)),
      engagement_rate: average(recentDays.map((d: any) => d.engagement_rate)),
      save_rate: average(recentDays.map((d: any) => d.save_rate)),
    };
    
    const ctrDecline = Math.max(0, (baseline.ctr - recent.ctr) / baseline.ctr);
    const engagementDecline = Math.max(0, (baseline.engagement_rate - recent.engagement_rate) / baseline.engagement_rate);
    const saveDecline = Math.max(0, (baseline.save_rate - recent.save_rate) / baseline.save_rate);
    
    const rawScore = (
      ctrDecline * FATIGUE_WEIGHTS.CTR_DECLINE +
      engagementDecline * FATIGUE_WEIGHTS.ENGAGEMENT_DECLINE +
      saveDecline * FATIGUE_WEIGHTS.SAVE_RATE_DECLINE
    );
    
    updates.fatigue_score = Math.round(Math.min(rawScore * 100, 100));
    updates.days_since_baseline = daysActive - BASELINE_THRESHOLD.MIN_DAYS;
  }
  
  const { data: updated } = await supabase
    .from('creative_health')
    .update(updates)
    .eq('id', health.id)
    .select()
    .single();
  
  return updated;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function getFatiguedContent(userId: string) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('creative_health')
    .select('*')
    .eq('user_id', userId)
    .gte('fatigue_score', 50)
    .order('fatigue_score', { ascending: false });
  return data || [];
}

export async function markRefreshed(userId: string, contentType: string, contentId: string) {
  const supabase = getAdminClient();
  return supabase
    .from('creative_health')
    .update({
      refresh_recommended: false,
      last_refresh_at: new Date().toISOString(),
      refresh_count: supabase.sql`refresh_count + 1`,
      baseline_ctr: null,
      baseline_engagement_rate: null,
      baseline_save_rate: null,
      fatigue_score: 0,
      status: 'pending_baseline',
    })
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId);
}
```

## Cron Job

Create `app/api/cron/creative-health/route.ts`:

```typescript
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { updateCreativeHealth } from '@/lib/services/creative-health';

export const GET = cronHandler(async () => {
  const supabase = getAdminClient();
  
  const { data: users } = await supabase
    .from('user_settings')
    .select('user_id')
    .not('integrations->pinterest', 'is', null);
  
  let totalUpdated = 0;
  let totalFatigued = 0;
  
  for (const { user_id } of users || []) {
    // Get pins with recent metrics
    const { data: pins } = await supabase
      .from('pins')
      .select(`id, pinterest_pin_metrics(ctr, engagement_rate, save_rate, impressions)`)
      .eq('user_id', user_id)
      .eq('status', 'published');
    
    for (const pin of pins || []) {
      const metrics = pin.pinterest_pin_metrics?.[0];
      if (!metrics) continue;
      
      const health = await updateCreativeHealth(user_id, 'pin', pin.id, {
        ctr: metrics.ctr || 0,
        engagement_rate: metrics.engagement_rate || 0,
        save_rate: metrics.save_rate || 0,
        impressions: metrics.impressions || 0,
      });
      
      totalUpdated++;
      if (health?.fatigue_score >= 50) totalFatigued++;
    }
  }
  
  return { success: true, data: { updated: totalUpdated, fatigued: totalFatigued } };
});
```

## UI Components

Add "Creative Health" section to Pinterest Analytics page:
1. Status summary: Healthy/Declining/Fatigued/Critical counts
2. Fatigued content list with fatigue score bars
3. Trend charts showing CTR vs baseline
4. "Mark as Refreshed" action button

## Vercel Cron

Add to `vercel.json` crons array:
```json
{
  "path": "/api/cron/creative-health",
  "schedule": "0 8 * * *"
}
```
```

---

## Prompt 4: Content Pillar Performance Tracking

```
Add Content Pillar Performance tracking to optimize content mix based on performance data.

## Database Schema

Create migration `supabase/migrations/028_content_pillars.sql`:

```sql
CREATE TABLE content_pillars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  recommended_percentage INTEGER DEFAULT 20,
  display_order INTEGER DEFAULT 0
);

INSERT INTO content_pillars (id, name, description, recommended_percentage, display_order) VALUES
  ('quote_reveal', 'Quote Reveal', 'Simple quote image with text reveal', 25, 1),
  ('transformation', 'Transformation', 'Before/after or journey content', 20, 2),
  ('educational', 'Educational', 'Tips, explanations, how-tos', 15, 3),
  ('lifestyle', 'Lifestyle', 'Styled room mockups, aesthetic content', 20, 4),
  ('behind_scenes', 'Behind the Scenes', 'Process, authenticity content', 10, 5),
  ('user_generated', 'User Generated', 'Customer photos and testimonials', 10, 6);

ALTER TABLE pins ADD COLUMN content_pillar TEXT REFERENCES content_pillars(id);
ALTER TABLE assets ADD COLUMN content_pillar TEXT REFERENCES content_pillars(id);

CREATE TABLE content_pillar_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  pillar_id TEXT REFERENCES content_pillars(id) NOT NULL,
  platform TEXT NOT NULL DEFAULT 'pinterest',
  
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'quarter')),
  period_start DATE NOT NULL,
  
  content_count INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  avg_ctr DECIMAL(6,4),
  avg_save_rate DECIMAL(6,4),
  
  winner_count INTEGER DEFAULT 0,
  winner_percentage DECIMAL(5,2),
  current_percentage DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pillar_id, platform, period_type, period_start)
);

CREATE TABLE content_mix_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  pillar_id TEXT REFERENCES content_pillars(id) NOT NULL,
  platform TEXT NOT NULL DEFAULT 'pinterest',
  
  recommended_percentage INTEGER NOT NULL,
  current_percentage INTEGER,
  
  reasoning JSONB,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  UNIQUE(user_id, pillar_id, platform)
);

CREATE INDEX idx_pillar_perf_user ON content_pillar_performance(user_id, period_type, period_start DESC);
CREATE INDEX idx_content_mix_user ON content_mix_recommendations(user_id, platform);

ALTER TABLE content_pillar_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_mix_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY pillar_perf_all ON content_pillar_performance FOR ALL USING (user_id = auth.uid());
CREATE POLICY content_mix_all ON content_mix_recommendations FOR ALL USING (user_id = auth.uid());
```

## Service Implementation

Create `lib/services/content-pillars.ts` with:
- `aggregatePillarPerformance(userId, periodType, periodStart)` - Aggregate metrics by pillar
- `generateMixRecommendations(userId)` - Generate recommended mix based on winner rates
- `getPillarPerformance(userId)` - Get recent pillar performance data

## Cron Job

Create `app/api/cron/content-pillar-aggregation/route.ts` to run weekly and aggregate pillar performance.

## UI Components

Create `app/(admin)/pinterest/analytics/content-mix/page.tsx`:
1. Current Mix vs Recommended Mix donut charts
2. Performance table by pillar
3. Action recommendations

Add pillar dropdown to pin/asset creation forms.

## Vercel Cron

Add to `vercel.json` crons array:
```json
{
  "path": "/api/cron/content-pillar-aggregation",
  "schedule": "0 9 * * 1"
}
```
```

---

## Prompt 5: A/B Testing Framework

```
Add an A/B Testing Framework for structured creative testing with statistical significance.

## Database Schema

Create migration `supabase/migrations/029_ab_testing.sql`:

```sql
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  
  test_type TEXT NOT NULL CHECK (test_type IN (
    'pin_creative', 'headline', 'description', 'hook', 'cta', 'audience', 'schedule'
  )),
  
  control_variant_id UUID NOT NULL,
  test_variant_ids UUID[] NOT NULL,
  traffic_split JSONB NOT NULL DEFAULT '{"control": 50, "test": 50}',
  
  primary_metric TEXT NOT NULL DEFAULT 'ctr' CHECK (primary_metric IN (
    'ctr', 'save_rate', 'conversion_rate', 'engagement_rate', 'cpa', 'roas'
  )),
  
  confidence_threshold DECIMAL(3,2) DEFAULT 0.95,
  minimum_sample_size INTEGER DEFAULT 1000,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  
  winner_variant_id UUID,
  winner_declared_at TIMESTAMPTZ,
  winner_confidence DECIMAL(5,4),
  results_summary JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  is_control BOOLEAN DEFAULT false,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  variant_config JSONB DEFAULT '{}',
  traffic_percentage INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  result_date DATE NOT NULL,
  
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  
  ctr DECIMAL(6,4),
  save_rate DECIMAL(6,4),
  conversion_rate DECIMAL(6,4),
  
  cumulative_impressions INTEGER DEFAULT 0,
  cumulative_conversions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(test_id, variant_id, result_date)
);

CREATE INDEX idx_ab_tests_user ON ab_tests(user_id, status);
CREATE INDEX idx_ab_variants_test ON ab_test_variants(test_id);
CREATE INDEX idx_ab_results_test ON ab_test_results(test_id, result_date);

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY ab_tests_all ON ab_tests FOR ALL USING (user_id = auth.uid());
CREATE POLICY ab_variants_all ON ab_test_variants FOR ALL USING (user_id = auth.uid());
CREATE POLICY ab_results_all ON ab_test_results FOR ALL USING (user_id = auth.uid());
```

## Service Implementation

Create `lib/services/ab-testing.ts` with:
- `createTest()` - Initialize test with variants
- `startTest()` / `pauseTest()` - Control test status
- `recordResults()` - Record daily metrics
- `calculateSignificance()` - Two-proportion z-test for statistical significance
- `declareWinner()` - Finalize test with winner

## Cron Job

Create `app/api/cron/ab-test-significance/route.ts` to check running tests every 6 hours.

## UI Components

Create `app/(admin)/pinterest/ab-tests/page.tsx`:
1. Test list (active, draft, completed)
2. Create test wizard
3. Test detail with live results chart
4. Significance indicator and "Declare Winner" button

## Vercel Cron

Add to `vercel.json` crons array:
```json
{
  "path": "/api/cron/ab-test-significance",
  "schedule": "0 */6 * * *"
}
```
```

---

## Prompt 6: Campaign Wizard Pinterest API Integration

```
Update Campaign Wizard to create campaigns directly via Pinterest API.

## Current State

The wizard shows templates and outputs manual instructions. Update to create campaigns via Pinterest Ads API.

## Service Implementation

Update `lib/services/pinterest-campaigns.ts`:

```typescript
import { getPinterestClient } from '@/lib/integrations/pinterest';
import { getAdminClient } from '@/lib/supabase/admin';

const CAMPAIGN_TEMPLATES = {
  'mh-core-traffic': {
    name: 'MH-Core-Traffic',
    dailyBudget: 5,
    objective: 'CONSIDERATION',
    targeting: {
      interests: ['mental health', 'therapy', 'counseling', 'psychology', 'self-care', 'mindfulness'],
      keywords: ['therapy office decor', 'counselor office prints', 'anxiety wall art'],
      demographics: { genders: ['female'], ages: ['25-34', '35-44', '45-54'] },
    },
  },
  'hd-core-traffic': {
    name: 'HD-Core-Traffic',
    dailyBudget: 4,
    objective: 'CONSIDERATION',
    targeting: {
      interests: ['home decor', 'interior design', 'minimalism', 'wall art'],
      keywords: ['printable wall art', 'minimalist quotes', 'bedroom prints'],
      demographics: { genders: ['female'], ages: ['25-34', '35-44', '45-54'] },
    },
  },
  'rt-site-visitors': {
    name: 'RT-SiteVisitors',
    dailyBudget: 2,
    objective: 'CONVERSIONS',
    targeting: { audienceType: 'site_visitors', excludePurchasers: true },
  },
  'b2b-therapists': {
    name: 'TO-Core-Traffic',
    dailyBudget: 3,
    objective: 'CONSIDERATION',
    targeting: {
      interests: ['therapy practice', 'counseling', 'psychology', 'office decor'],
      keywords: ['therapy office decor', 'counselor office art'],
      demographics: { genders: ['female', 'male'], ages: ['25-34', '35-44', '45-54', '55-64'] },
    },
  },
};

export async function createPinterestCampaign(
  userId: string,
  templateId: string,
  options: { dailyBudget?: number; name?: string; pinIds?: string[] } = {}
) {
  const template = CAMPAIGN_TEMPLATES[templateId as keyof typeof CAMPAIGN_TEMPLATES];
  if (!template) throw new Error(`Unknown template: ${templateId}`);
  
  const pinterest = await getPinterestClient(userId);
  if (!pinterest) throw new Error('Pinterest not connected');
  
  const monthPrefix = new Date().toLocaleDateString('en-US', { month: 'short' });
  const campaignName = options.name || `${monthPrefix}-${template.name}`;
  const dailyBudget = options.dailyBudget || template.dailyBudget;
  
  // Create campaign
  const campaign = await pinterest.campaigns.create({
    ad_account_id: pinterest.adAccountId,
    name: campaignName,
    status: 'PAUSED',
    objective_type: template.objective,
    daily_spend_cap: dailyBudget * 1000000,
  });
  
  // Create ad group with targeting
  let targetingSpec: any = {};
  
  if (templateId === 'rt-site-visitors') {
    const audiences = await pinterest.audiences.list({ ad_account_id: pinterest.adAccountId });
    const visitorAudience = audiences.items?.find((a: any) => a.audience_type === 'VISITOR');
    targetingSpec = { AUDIENCE_INCLUDE: visitorAudience ? [visitorAudience.id] : [] };
  } else {
    targetingSpec = {
      INTEREST: template.targeting.interests || [],
      KEYWORD: (template.targeting.keywords || []).map((k: string) => ({ keyword: k, match_type: 'BROAD' })),
      GENDER: template.targeting.demographics?.genders || [],
      AGE_BUCKET: template.targeting.demographics?.ages || [],
      LOCALE: ['en-US'],
      GEO: ['US'],
    };
  }
  
  const adGroup = await pinterest.adGroups.create({
    ad_account_id: pinterest.adAccountId,
    campaign_id: campaign.id,
    name: `${campaignName}-AdGroup`,
    status: 'PAUSED',
    auto_targeting_enabled: false,
    targeting_spec: targetingSpec,
  });
  
  // Add pins if provided
  if (options.pinIds?.length) {
    await Promise.all(options.pinIds.map(pinId =>
      pinterest.promotedPins.create({
        ad_account_id: pinterest.adAccountId,
        ad_group_id: adGroup.id,
        pin_id: pinId,
      })
    ));
  }
  
  // Store in database
  const supabase = getAdminClient();
  const { data: dbCampaign } = await supabase
    .from('pinterest_campaigns')
    .insert({
      user_id: userId,
      pinterest_campaign_id: campaign.id,
      pinterest_ad_group_id: adGroup.id,
      name: campaignName,
      template_id: templateId,
      daily_budget: dailyBudget,
      objective: template.objective,
      status: 'paused',
      pin_count: options.pinIds?.length || 0,
    })
    .select()
    .single();
  
  return { campaign, adGroup, dbRecord: dbCampaign };
}

export async function activateCampaign(userId: string, campaignId: string) {
  const supabase = getAdminClient();
  const pinterest = await getPinterestClient(userId);
  
  const { data: campaign } = await supabase
    .from('pinterest_campaigns')
    .select('pinterest_campaign_id, pinterest_ad_group_id, pin_count')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();
  
  if (!campaign) throw new Error('Campaign not found');
  if (!campaign.pin_count) throw new Error('Add at least one pin before activating');
  
  await pinterest.campaigns.update({
    ad_account_id: pinterest.adAccountId,
    campaign_id: campaign.pinterest_campaign_id,
    status: 'ACTIVE',
  });
  
  await pinterest.adGroups.update({
    ad_account_id: pinterest.adAccountId,
    ad_group_id: campaign.pinterest_ad_group_id,
    status: 'ACTIVE',
  });
  
  await supabase
    .from('pinterest_campaigns')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', campaignId);
  
  return { success: true };
}
```

## Update Campaign Wizard UI

Modify `app/(admin)/pinterest/campaign-wizard/page.tsx`:

1. Step 1: Select Template (existing)
2. Step 2: Configure Budget (existing)
3. Step 3: Select Pins (NEW - grid of approved pins)
4. Step 4: Review & Create (calls API, shows loading)
5. Step 5: Success with "Activate" button

## API Routes

Create:
- `POST /api/pinterest/campaigns` - Create campaign
- `POST /api/pinterest/campaigns/[id]/activate` - Activate campaign
- `POST /api/pinterest/campaigns/[id]/pins` - Add pins to campaign
```

---

## Prompt 7: Additional Campaign Templates

```
Add Phase 2+ campaign templates that unlock based on sales milestones.

## Database Schema

Create migration `supabase/migrations/030_campaign_templates.sql`:

```sql
CREATE TABLE campaign_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL,
  default_daily_budget DECIMAL(10,2) NOT NULL,
  targeting_type TEXT NOT NULL CHECK (targeting_type IN ('interest', 'keyword', 'retargeting', 'lookalike')),
  targeting_presets JSONB DEFAULT '{}',
  phase INTEGER NOT NULL DEFAULT 1,
  min_sales_required INTEGER DEFAULT 0,
  min_purchases_for_lookalike INTEGER DEFAULT 0,
  requires_pixel_data BOOLEAN DEFAULT false,
  requires_audience TEXT,
  is_recommended BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all templates (Phase 1, 2, 3)
INSERT INTO campaign_templates VALUES
  ('mh-core-traffic', 'MH-Core-Traffic', 'Mental health audience', 'CONSIDERATION', 5.00, 'interest', '{"interests": ["mental health", "therapy", "counseling"]}', 1, 0, 0, false, null, true, 1),
  ('hd-core-traffic', 'HD-Core-Traffic', 'Home decor audience', 'CONSIDERATION', 4.00, 'interest', '{"interests": ["home decor", "interior design", "minimalism"]}', 1, 0, 0, false, null, true, 2),
  ('rt-site-visitors', 'RT-SiteVisitors', 'Retarget website visitors', 'CONVERSIONS', 2.00, 'retargeting', '{"audience_type": "site_visitors"}', 1, 0, 0, true, 'site_visitors', true, 3),
  ('b2b-therapists', 'TO-Core-Traffic', 'Professional therapists', 'CONSIDERATION', 3.00, 'interest', '{"interests": ["therapy practice", "counseling"]}', 1, 0, 0, false, null, false, 4),
  ('kw-core', 'KW-Core', 'Search intent keywords', 'CONSIDERATION', 4.00, 'keyword', '{"keywords": ["wall art quotes", "printable quotes", "therapy office decor"]}', 2, 50, 0, false, null, true, 5),
  ('lal-purchasers-1pct', 'LAL-Purchasers1pct', 'Lookalike 1% of purchasers', 'CONSIDERATION', 8.00, 'lookalike', '{"source": "purchasers", "percentage": 1}', 2, 50, 50, true, 'purchasers', true, 6),
  ('rt-cart-abandon', 'RT-CartAbandon', 'Retarget cart abandoners', 'CONVERSIONS', 2.00, 'retargeting', '{"audience_type": "cart_abandoners"}', 3, 100, 0, true, 'cart_abandoners', true, 7);

CREATE TABLE user_campaign_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_sales INTEGER DEFAULT 0,
  total_purchasers INTEGER DEFAULT 0,
  has_pixel_data BOOLEAN DEFAULT false,
  has_site_visitors_audience BOOLEAN DEFAULT false,
  has_cart_abandoners_audience BOOLEAN DEFAULT false,
  has_purchasers_audience BOOLEAN DEFAULT false,
  phase_2_unlocked_at TIMESTAMPTZ,
  phase_3_unlocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_campaign_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestones_all ON user_campaign_milestones FOR ALL USING (user_id = auth.uid());
```

## Service Implementation

Create `lib/services/campaign-templates.ts` with:
- `getAvailableTemplates(userId)` - Returns available and locked templates
- `updateMilestones(userId)` - Updates sales counts from Shopify

## Cron Job

Create `app/api/cron/update-milestones/route.ts` to run daily.

## Update Campaign Wizard

Group templates by phase with unlock requirements shown for locked templates.

## Vercel Cron

Add to `vercel.json` crons array:
```json
{
  "path": "/api/cron/update-milestones",
  "schedule": "0 5 * * *"
}
```
```

---

## Prompt 8: Cross-Platform Performance Sync

```
Add TikTok and Instagram performance tracking for cross-platform winner detection.

## Database Schema

Create migration `supabase/migrations/031_cross_platform.sql`:

```sql
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'pinterest')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE TABLE cross_platform_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  platform_content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  caption TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  quote_id UUID REFERENCES quotes(id),
  is_winner BOOLEAN DEFAULT false,
  winner_detected_at TIMESTAMPTZ,
  adapted_to_pinterest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_content_id)
);

CREATE TABLE cross_platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES cross_platform_content(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(6,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, metric_date)
);

CREATE INDEX idx_xp_content_winners ON cross_platform_content(user_id, is_winner) WHERE is_winner = true;

ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_conn_all ON platform_connections FOR ALL USING (user_id = auth.uid());
CREATE POLICY xp_content_all ON cross_platform_content FOR ALL USING (user_id = auth.uid());
CREATE POLICY xp_metrics_all ON cross_platform_metrics FOR ALL USING (user_id = auth.uid());
```

## Service Implementation

Create:
- `lib/integrations/tiktok.ts` - TikTok Business API client
- `lib/integrations/instagram.ts` - Instagram Graph API client
- `lib/services/cross-platform-sync.ts` - Sync and winner detection

## Cron Job

Create `app/api/cron/cross-platform-sync/route.ts` to run daily.

## UI Components

1. Settings > Integrations: Connect TikTok/Instagram buttons
2. Dashboard widget: Cross-platform winners with "Adapt to Pinterest" action
3. Analytics page: Comparative performance across platforms

## Vercel Cron

Add to `vercel.json` crons array:
```json
{
  "path": "/api/cron/cross-platform-sync",
  "schedule": "0 10 * * *"
}
```
```

---

## Prompt 9: Winner Detection Dashboard Alerts

```
Add visual winner highlighting and alerts across the Hub.

## Components to Create

### 1. Winner Alert Banner

Create `components/alerts/winner-alert.tsx`:
- Dismissible banner shown when new winners detected
- "X campaigns performing excellently! Review & Scale" with CTA

### 2. Update Budget Page

Modify Budget page to show:
- Campaign cards with color-coded performance status
- Winner badge (🏆) on high-performing campaigns
- Inline recommendation: "This campaign is performing well! Consider +25% budget."

Status colors:
- Green (scale): CPA < $8, ROAS > 3
- Blue (maintain): CPA $8-12
- Yellow (optimize): CPA $12-15
- Red (pause): CPA > $15

### 3. Dashboard Widget

Create `components/dashboard/campaign-performance-widget.tsx`:
- 4-quadrant summary: Winners / On Track / Optimize / Review
- Top winner highlight with key metrics
- "Scale Winners" CTA button

### 4. Toast Notifications

Show toast when new winner detected during data refresh:
```typescript
toast({
  title: '🏆 New Winner Detected!',
  description: `${campaignName} is performing excellently with ${roas}x ROAS`,
  action: <Link href="/pinterest/budget">View</Link>,
});
```

### 5. API Endpoint

Create `app/api/pinterest/campaigns/winners/route.ts`:
- GET: Returns winner campaigns
- Query param `recent=true` for winners detected in last 7 days

## Integration

Add WinnerAlertBanner to main layout, show when pending winners exist.
Add CampaignPerformanceWidget to dashboard home page.
```

---

## Complete Vercel Cron Configuration

Add all crons to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/performance-evaluation",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/budget-recommendations",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/creative-health",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/content-pillar-aggregation",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/ab-test-significance",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/update-milestones",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/cross-platform-sync",
      "schedule": "0 10 * * *"
    }
  ]
}
```

---

## Migration Execution Order

Run in this order:
1. `025_performance_rules.sql`
2. `026_budget_recommendations.sql`
3. `027_creative_health.sql`
4. `028_content_pillars.sql`
5. `029_ab_testing.sql`
6. `030_campaign_templates.sql`
7. `031_cross_platform.sql`

---

## Environment Variables

Add to `.env.local` if implementing cross-platform sync:

```bash
# TikTok (Prompt 8)
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Instagram (Prompt 8)
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

# Token encryption
TOKEN_ENCRYPTION_KEY=
```

---

**All 9 prompts are now complete and self-contained. Ready for Claude Code.**
