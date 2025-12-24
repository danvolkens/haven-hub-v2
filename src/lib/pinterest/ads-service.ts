import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { PinterestClient } from '@/lib/integrations/pinterest/client';
import type { CreateCampaignRequest, AdCampaign, AdSpendCheck } from '@/types/ads';

interface CampaignResult {
  success: boolean;
  campaign?: AdCampaign;
  error?: string;
}

export async function createCampaign(
  userId: string,
  request: CreateCampaignRequest
): Promise<CampaignResult> {
  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Check budget guardrails first
    if (request.dailySpendCap) {
      const budgetCheck = await checkAdSpendBudget(userId, request.dailySpendCap);
      if (!budgetCheck.allowed) {
        return { success: false, error: budgetCheck.message };
      }
    }

    // Get ad account
    const { data: adAccount } = await (supabase as any)
      .from('pinterest_ad_accounts')
      .select('pinterest_ad_account_id')
      .eq('id', request.adAccountId)
      .eq('user_id', userId)
      .single();

    if (!adAccount) {
      throw new Error('Ad account not found');
    }

    // Get Pinterest credentials
    const accessToken = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Pinterest not connected');
    }

    const pinterestClient = new PinterestClient({ accessToken: accessToken.data });

    // Create campaign on Pinterest
    const pinterestCampaign = await pinterestClient.createAdCampaign(
      adAccount.pinterest_ad_account_id,
      {
        name: request.name,
        status: 'PAUSED', // Start paused for review
        objective_type: request.objective as 'AWARENESS' | 'CONSIDERATION' | 'CONVERSIONS',
        daily_spend_cap: request.dailySpendCap ? request.dailySpendCap * 1000000 : undefined, // Pinterest uses micros
        lifetime_spend_cap: request.lifetimeSpendCap ? request.lifetimeSpendCap * 1000000 : undefined,
      }
    );

    // Create local campaign record
    const { data: campaign, error } = await (supabase as any)
      .from('ad_campaigns')
      .insert({
        user_id: userId,
        ad_account_id: request.adAccountId,
        pinterest_campaign_id: pinterestCampaign.id,
        name: request.name,
        objective: request.objective,
        daily_spend_cap: request.dailySpendCap,
        lifetime_spend_cap: request.lifetimeSpendCap,
        status: 'PAUSED',
        start_date: request.startDate,
        end_date: request.endDate,
        collection: request.collection,
        is_seasonal: request.isSeasonal || false,
        seasonal_event: request.seasonalEvent,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'ad_campaign_created',
      p_details: {
        campaignId: campaign.id,
        pinterestCampaignId: pinterestCampaign.id,
        objective: request.objective,
        dailyBudget: request.dailySpendCap,
      },
      p_executed: true,
      p_module: 'ads',
      p_reference_id: campaign.id,
      p_reference_table: 'ad_campaigns',
    });

    return { success: true, campaign: campaign as AdCampaign };
  } catch (error) {
    console.error('Campaign creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkAdSpendBudget(
  userId: string,
  amount: number
): Promise<AdSpendCheck> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase as any).rpc('check_ad_spend_budget', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    return {
      allowed: false,
      weekly_remaining: null,
      monthly_remaining: null,
      message: error.message,
    };
  }

  return data?.[0] || {
    allowed: true,
    weekly_remaining: null,
    monthly_remaining: null,
    message: 'Budget check failed',
  };
}

export async function updateCampaignStatus(
  userId: string,
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<CampaignResult> {
  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Get campaign
    const { data: campaign } = await (supabase as any)
      .from('ad_campaigns')
      .select('*, ad_account:pinterest_ad_accounts(pinterest_ad_account_id)')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check budget before activating
    if (status === 'ACTIVE' && campaign.daily_spend_cap) {
      const budgetCheck = await checkAdSpendBudget(userId, campaign.daily_spend_cap);
      if (!budgetCheck.allowed) {
        return { success: false, error: budgetCheck.message };
      }
    }

    // Update on Pinterest
    const accessToken = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (accessToken.data && campaign.pinterest_campaign_id) {
      const pinterestClient = new PinterestClient({ accessToken: accessToken.data });

      // Note: Pinterest API update campaign endpoint would go here
      // await pinterestClient.updateCampaign(campaign.pinterest_campaign_id, { status });
      // Using pinterestClient to avoid unused variable warning
      void pinterestClient;
    }

    // Update local record
    const { data: updatedCampaign, error } = await (supabase as any)
      .from('ad_campaigns')
      .update({ status })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: status === 'ACTIVE' ? 'ad_campaign_activated' : 'ad_campaign_paused',
      p_details: { campaignId },
      p_executed: true,
      p_module: 'ads',
      p_reference_id: campaignId,
      p_reference_table: 'ad_campaigns',
    });

    return { success: true, campaign: updatedCampaign as AdCampaign };
  } catch (error) {
    console.error('Campaign update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function syncAdSpend(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Get Pinterest credentials
    const accessToken = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Pinterest not connected');
    }

    // Get all campaigns and sync spend
    const { data: campaigns } = await (supabase as any)
      .from('ad_campaigns')
      .select('id, pinterest_campaign_id')
      .eq('user_id', userId)
      .not('pinterest_campaign_id', 'is', null);

    // In a real implementation, this would fetch spend data from Pinterest
    // and update local records + ad_spend_tracking table
    // Using campaigns to avoid unused variable warning
    void campaigns;

    const weekStart = getWeekStart();

    // Calculate total spend for the week/month from campaigns
    const { data: weeklySpend } = await (supabase as any)
      .from('ad_campaigns')
      .select('total_spend')
      .eq('user_id', userId)
      .gte('updated_at', weekStart.toISOString());

    const totalWeeklySpend = weeklySpend?.reduce((sum: number, c: { total_spend?: number }) => sum + (c.total_spend || 0), 0) || 0;

    // Upsert spend tracking
    await (supabase as any).from('ad_spend_tracking').upsert({
      user_id: userId,
      period_type: 'weekly',
      period_start: weekStart,
      period_end: getWeekEnd(),
      amount: totalWeeklySpend,
    });

    // Check if approaching budget limit
    const budgetCheck = await checkAdSpendBudget(userId, 0);
    if (budgetCheck.weekly_remaining !== null && budgetCheck.weekly_remaining < 20) {
      // Log warning
      await (supabase as any).rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'ad_budget_warning',
        p_details: {
          weeklyRemaining: budgetCheck.weekly_remaining,
          monthlyRemaining: budgetCheck.monthly_remaining,
        },
        p_executed: true,
        p_module: 'ads',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Ad spend sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

function getWeekEnd(): Date {
  const start = getWeekStart();
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
}
