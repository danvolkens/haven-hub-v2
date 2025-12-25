/**
 * Klaviyo Service
 * High-level service for Klaviyo integration
 */

import { getAdminClient } from '@/lib/supabase/admin';
import { KlaviyoClient } from './client';

// Get Klaviyo API key for user from vault
export async function getKlaviyoApiKey(userId: string): Promise<string | null> {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.log('Vault not available, checking metadata fallback');
  }

  // Fallback to metadata
  const { data: integration } = await (supabase as any)
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'klaviyo')
    .eq('status', 'connected')
    .single();

  return integration?.metadata?._api_key || null;
}

// Create Klaviyo client for user
export async function getKlaviyoClient(userId: string): Promise<KlaviyoClient | null> {
  const apiKey = await getKlaviyoApiKey(userId);
  if (!apiKey) return null;
  return new KlaviyoClient({ apiKey });
}

// Get Klaviyo connection status
export async function getKlaviyoStatus(userId: string): Promise<{
  connected: boolean;
  accountName?: string;
  listCount?: number;
}> {
  const supabase = getAdminClient();

  const { data } = await (supabase as any)
    .from('integrations')
    .select('metadata, status')
    .eq('user_id', userId)
    .eq('provider', 'klaviyo')
    .single();

  if (!data || data.status !== 'connected') {
    return { connected: false };
  }

  return {
    connected: true,
    accountName: data.metadata?.account_name,
    listCount: data.metadata?.list_count,
  };
}

// Disconnect Klaviyo
export async function disconnectKlaviyo(userId: string): Promise<void> {
  const supabase = getAdminClient();

  // Delete credentials from vault
  await supabase.rpc('delete_credentials', {
    p_user_id: userId,
    p_provider: 'klaviyo',
  });

  // Update integration status
  await (supabase as any)
    .from('integrations')
    .update({
      status: 'disconnected',
      disconnected_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'klaviyo');
}

// Sync a lead to Klaviyo
export async function syncLeadToKlaviyo(
  userId: string,
  lead: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    source?: string | null;
    recommended_collection?: string | null;
    quiz_results?: Record<string, any> | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  },
  options: {
    listId?: string;
    tags?: string[];
  } = {}
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const client = await getKlaviyoClient(userId);
    if (!client) {
      return { success: false, error: 'Klaviyo not connected' };
    }

    // Create or update profile
    const profile = await client.createOrUpdateProfile({
      email: lead.email,
      first_name: lead.first_name || undefined,
      last_name: lead.last_name || undefined,
      phone_number: lead.phone || undefined,
      properties: {
        source: lead.source,
        recommended_collection: lead.recommended_collection,
        quiz_results: lead.quiz_results,
        utm_source: lead.utm_source,
        utm_medium: lead.utm_medium,
        utm_campaign: lead.utm_campaign,
        synced_from: 'haven_hub',
      },
    });

    // Add to list if specified
    if (options.listId) {
      await client.addProfilesToList(options.listId, [profile.id]);
    }

    // Add tags if specified
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await client.tagProfileByName(profile.id, tag);
      }
    }

    // Update lead record
    const supabase = getAdminClient();
    await (supabase as any)
      .from('leads')
      .update({
        klaviyo_profile_id: profile.id,
        synced_to_klaviyo_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    return { success: true, profileId: profile.id };
  } catch (error) {
    console.error('Klaviyo sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Track quiz completion
export async function trackQuizCompletion(
  userId: string,
  email: string,
  quizResults: Record<string, any>,
  recommendedCollection: string
): Promise<void> {
  const client = await getKlaviyoClient(userId);
  if (!client) return;

  await client.trackQuizComplete(email, quizResults, recommendedCollection);
}

// Track purchase
export async function trackPurchase(
  userId: string,
  email: string,
  orderId: string,
  value: number,
  items: Array<{ name: string; quantity: number; price: number }>
): Promise<void> {
  const client = await getKlaviyoClient(userId);
  if (!client) return;

  await client.trackPurchase(email, orderId, value, items);
}

// Track cart abandonment
export async function trackCartAbandonment(
  userId: string,
  email: string,
  cartId: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  cartValue: number
): Promise<void> {
  const client = await getKlaviyoClient(userId);
  if (!client) return;

  await client.trackCartAbandonment(email, cartId, items, cartValue);
}

// Get lists for user
export async function getKlaviyoLists(userId: string): Promise<Array<{ id: string; name: string }>> {
  const client = await getKlaviyoClient(userId);
  if (!client) return [];

  const lists = await client.getLists();
  return lists.map(list => ({ id: list.id, name: list.name }));
}

// Get user's default list (or first list)
export async function getDefaultList(userId: string): Promise<string | null> {
  const supabase = getAdminClient();

  // Check if user has a default list configured
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('klaviyo_settings')
    .eq('user_id', userId)
    .single();

  if (settings?.klaviyo_settings?.default_list_id) {
    return settings.klaviyo_settings.default_list_id;
  }

  // Fall back to first list
  const lists = await getKlaviyoLists(userId);
  return lists[0]?.id || null;
}

// Bulk sync leads
export async function bulkSyncLeads(
  userId: string,
  leadIds: string[],
  options: { listId?: string; tags?: string[] } = {}
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const supabase = getAdminClient();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  // Get leads
  const { data: leads } = await (supabase as any)
    .from('leads')
    .select('*')
    .in('id', leadIds);

  if (!leads || leads.length === 0) {
    return { synced: 0, failed: 0, errors: ['No leads found'] };
  }

  // Sync each lead
  for (const lead of leads) {
    const result = await syncLeadToKlaviyo(userId, lead, options);
    if (result.success) {
      synced++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${lead.email}: ${result.error}`);
      }
    }
  }

  return { synced, failed, errors };
}
