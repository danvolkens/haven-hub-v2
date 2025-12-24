import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Lead } from '@/types/leads';

interface KlaviyoSyncOptions {
  listId: string;
  tags?: string[];
}

export async function syncLeadToKlaviyo(
  userId: string,
  lead: Lead,
  options: KlaviyoSyncOptions
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  const adminClient = getAdminClient();
  const supabase = await createServerSupabaseClient();

  try {
    // Get Klaviyo API key
    const apiKey = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!apiKey.data) {
      throw new Error('Klaviyo not connected');
    }

    // Create or update profile in Klaviyo
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${apiKey.data}`,
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: lead.email,
            first_name: lead.first_name,
            last_name: lead.last_name,
            phone_number: lead.phone,
            properties: {
              source: lead.source,
              recommended_collection: lead.recommended_collection,
              quiz_results: lead.quiz_results,
              utm_source: lead.utm_source,
              utm_medium: lead.utm_medium,
              utm_campaign: lead.utm_campaign,
            },
          },
        },
      }),
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      throw new Error(error.errors?.[0]?.detail || 'Failed to create Klaviyo profile');
    }

    const profile = await profileResponse.json();
    const profileId = profile.data.id;

    // Subscribe to list
    await fetch('https://a.klaviyo.com/api/list-relationships/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${apiKey.data}`,
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'list',
          id: options.listId,
          relationships: {
            profiles: {
              data: [{ type: 'profile', id: profileId }],
            },
          },
        },
      }),
    });

    // Add tags if provided
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await addTagToProfile(apiKey.data, profileId, tag);
      }
    }

    // Update lead with Klaviyo profile ID
    await (supabase as any)
      .from('leads')
      .update({
        klaviyo_profile_id: profileId,
        synced_to_klaviyo_at: new Date().toISOString(),
        status: 'subscribed',
      })
      .eq('id', lead.id);

    return { success: true, profileId };
  } catch (error) {
    console.error('Klaviyo sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function addTagToProfile(apiKey: string, profileId: string, tag: string) {
  // First, get or create the tag
  const tagResponse = await fetch(`https://a.klaviyo.com/api/tags/?filter=equals(name,"${tag}")`, {
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': '2024-02-15',
    },
  });

  let tagId: string;

  if (tagResponse.ok) {
    const tags = await tagResponse.json();
    if (tags.data.length > 0) {
      tagId = tags.data[0].id;
    } else {
      // Create tag
      const createResponse = await fetch('https://a.klaviyo.com/api/tags/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Klaviyo-API-Key ${apiKey}`,
          'revision': '2024-02-15',
        },
        body: JSON.stringify({
          data: {
            type: 'tag',
            attributes: { name: tag },
          },
        }),
      });
      const created = await createResponse.json();
      tagId = created.data.id;
    }

    // Associate tag with profile
    await fetch(`https://a.klaviyo.com/api/tags/${tagId}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: [{ type: 'profile', id: profileId }],
      }),
    });
  }
}
