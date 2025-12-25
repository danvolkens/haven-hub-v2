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

    // Note: Skip API validation - Dynamic Mockups API may not have a simple validation endpoint
    // The key will be validated on first actual use

    // Store API key securely in vault
    const adminClient = getAdminClient();
    await (adminClient as any).rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'dynamic_mockups',
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
          provider: 'dynamic_mockups',
          status: 'connected',
          metadata: {
            configured: true,
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
          setup_progress: { ...settings.setup_progress, dynamic_mockups: 'completed' },
        })
        .eq('user_id', userId);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'dynamic_mockups' },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dynamic Mockups connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect Dynamic Mockups' },
      { status: 500 }
    );
  }
}
