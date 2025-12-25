import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Validate API key by fetching account info
    const accountResponse = await fetch('https://a.klaviyo.com/api/accounts/', {
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-02-15',
      },
    });

    if (!accountResponse.ok) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }

    const accountData = await accountResponse.json();
    const account = accountData.data?.[0];

    // Get lists to show count
    const listsResponse = await fetch('https://a.klaviyo.com/api/lists/', {
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-02-15',
      },
    });

    let listCount = 0;
    if (listsResponse.ok) {
      const listsData = await listsResponse.json();
      listCount = listsData.data?.length || 0;
    }

    // Store API key securely in vault
    const adminClient = getAdminClient();
    await (adminClient as any).rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
      p_credential_value: apiKey,
    });

    // Update integration record
    const supabase = await createServerSupabaseClient();
    await (supabase as any)
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'klaviyo',
          status: 'connected',
          metadata: {
            account_name: account?.attributes?.contact_information?.organization_name || 'Klaviyo Account',
            list_count: listCount,
          },
          connected_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
        },
        { onConflict: 'user_id,provider' }
      );

    // Update setup progress
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('setup_progress')
      .eq('user_id', userId)
      .single();

    if (settings) {
      await (supabase as any)
        .from('user_settings')
        .update({
          setup_progress: { ...settings.setup_progress, klaviyo: 'completed' },
        })
        .eq('user_id', userId);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'klaviyo' },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Klaviyo connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Klaviyo' },
      { status: 500 }
    );
  }
}
