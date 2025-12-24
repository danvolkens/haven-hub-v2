import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { CreateWinbackCampaignRequest, WinbackCampaign } from '@/types/winback';

interface CampaignResult {
  success: boolean;
  campaign?: WinbackCampaign;
  error?: string;
}

export async function createWinbackCampaign(
  userId: string,
  request: CreateWinbackCampaignRequest
): Promise<CampaignResult> {
  const supabase = await createServerSupabaseClient();

  try {
    const { data: campaign, error } = await (supabase as any)
      .from('winback_campaigns')
      .insert({
        user_id: userId,
        name: request.name,
        description: request.description,
        target_stages: request.targetStages || ['at_risk', 'churned'],
        min_days_inactive: request.minDaysInactive,
        max_days_inactive: request.maxDaysInactive,
        min_lifetime_value: request.minLifetimeValue,
        target_collections: request.targetCollections || [],
        incentive_type: request.incentiveType,
        incentive_value: request.incentiveValue,
        discount_code: request.discountCode,
        klaviyo_flow_id: request.klaviyoFlowId,
        send_delay_days: request.sendDelayDays || 0,
        status: 'draft',
        starts_at: request.startsAt,
        ends_at: request.endsAt,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, campaign: campaign as WinbackCampaign };
  } catch (error) {
    console.error('Create win-back campaign error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function activateWinbackCampaign(
  userId: string,
  campaignId: string
): Promise<{ success: boolean; recipientsAdded: number; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    // Get eligible customers
    const { data: eligibleCustomers } = await (supabase as any).rpc('get_winback_eligible_customers', {
      p_campaign_id: campaignId,
    });

    if (!eligibleCustomers || eligibleCustomers.length === 0) {
      return { success: true, recipientsAdded: 0 };
    }

    // Add recipients
    const recipients = eligibleCustomers.map((c: any) => ({
      campaign_id: campaignId,
      customer_id: c.customer_id,
      user_id: userId,
      status: 'pending',
    }));

    const { error: insertError } = await (supabase as any)
      .from('winback_recipients')
      .insert(recipients);

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Update campaign
    await (supabase as any)
      .from('winback_campaigns')
      .update({
        status: 'active',
        starts_at: new Date().toISOString(),
        customers_targeted: eligibleCustomers.length,
      })
      .eq('id', campaignId);

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'winback_campaign_activated',
      p_details: {
        campaignId,
        recipientsAdded: eligibleCustomers.length,
      },
      p_executed: true,
      p_module: 'winback',
      p_reference_id: campaignId,
      p_reference_table: 'winback_campaigns',
    });

    return { success: true, recipientsAdded: eligibleCustomers.length };
  } catch (error) {
    console.error('Activate win-back campaign error:', error);
    return {
      success: false,
      recipientsAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function processWinbackRecipients(userId: string): Promise<{
  sent: number;
  errors: string[];
}> {
  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();
  let sent = 0;
  const errors: string[] = [];

  try {
    // Get pending recipients for active campaigns
    const { data: recipients } = await (supabase as any)
      .from('winback_recipients')
      .select(`
        *,
        campaign:winback_campaigns(*),
        customer:customers(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(50);

    if (!recipients || recipients.length === 0) {
      return { sent: 0, errors: [] };
    }

    // Filter to only active campaigns (can't filter nested relation in query)
    const activeRecipients = recipients.filter(
      (r: any) => r.campaign?.status === 'active'
    );

    if (activeRecipients.length === 0) {
      return { sent: 0, errors: [] };
    }

    // Get Klaviyo API key
    const apiKey = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!apiKey.data) {
      return { sent: 0, errors: ['Klaviyo not connected'] };
    }

    for (const recipient of activeRecipients) {
      try {
        // Check delay
        const daysSinceAdded = Math.floor(
          (Date.now() - new Date(recipient.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceAdded < recipient.campaign.send_delay_days) {
          continue;
        }

        // Trigger Klaviyo flow
        await triggerWinbackFlow(apiKey.data, recipient.campaign, recipient.customer);

        // Update recipient status
        await (supabase as any)
          .from('winback_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);

        // Update campaign stats - increment emails_sent
        const { data: currentCampaign } = await (supabase as any)
          .from('winback_campaigns')
          .select('emails_sent')
          .eq('id', recipient.campaign_id)
          .single();

        if (currentCampaign) {
          await (supabase as any)
            .from('winback_campaigns')
            .update({
              emails_sent: (currentCampaign.emails_sent || 0) + 1,
            })
            .eq('id', recipient.campaign_id);
        }

        sent++;
      } catch (error) {
        errors.push(`Recipient ${recipient.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { sent, errors };
  } catch (error) {
    console.error('Process win-back recipients error:', error);
    return {
      sent,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function recordWinbackRecovery(
  userId: string,
  email: string,
  orderId: string,
  orderValue: number,
  discountCode?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    // Find customer
    const { data: customer } = await (supabase as any)
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('email', email)
      .single();

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Find active recipient
    const { data: recipient } = await (supabase as any)
      .from('winback_recipients')
      .select('id, campaign_id')
      .eq('customer_id', customer.id)
      .in('status', ['sent', 'opened', 'clicked'])
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (!recipient) {
      return { success: false, error: 'No active win-back recipient found' };
    }

    // Update recipient
    await (supabase as any)
      .from('winback_recipients')
      .update({
        status: 'recovered',
        recovered_at: new Date().toISOString(),
        recovery_order_id: orderId,
        recovery_order_value: orderValue,
        discount_code_used: discountCode,
      })
      .eq('id', recipient.id);

    // Update campaign stats - get current values first
    const { data: currentCampaign } = await (supabase as any)
      .from('winback_campaigns')
      .select('customers_recovered, revenue_recovered')
      .eq('id', recipient.campaign_id)
      .single();

    if (currentCampaign) {
      await (supabase as any)
        .from('winback_campaigns')
        .update({
          customers_recovered: (currentCampaign.customers_recovered || 0) + 1,
          revenue_recovered: (currentCampaign.revenue_recovered || 0) + orderValue,
        })
        .eq('id', recipient.campaign_id);
    }

    // Update customer stage
    await (supabase as any).rpc('update_customer_stage', {
      p_customer_id: customer.id,
      p_trigger_type: 'winback_recovery',
    });

    return { success: true };
  } catch (error) {
    console.error('Record win-back recovery error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function triggerWinbackFlow(
  apiKey: string,
  campaign: any,
  customer: any
): Promise<void> {
  const response = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          profile: {
            email: customer.email,
            first_name: customer.first_name,
          },
          metric: { name: 'Win-Back Campaign Triggered' },
          properties: {
            campaign_name: campaign.name,
            incentive_type: campaign.incentive_type,
            incentive_value: campaign.incentive_value,
            discount_code: campaign.discount_code,
            primary_collection: customer.primary_collection,
            lifetime_value: customer.lifetime_value,
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to trigger Klaviyo flow');
  }
}
