import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { PINTEREST_CONFIG } from '@/lib/integrations/pinterest/config';
import { PinterestClient, PinterestBoard } from '@/lib/integrations/pinterest/client';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const searchParams = request.nextUrl.searchParams;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      throw new Error('Missing required parameters');
    }

    // Verify state
    const supabase = await createServerSupabaseClient();
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', 'pinterest')
      .single();

    if (!integration || integration.metadata.oauth_state !== state) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/pinterest/callback`;

    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${PINTEREST_CONFIG.clientId}:${PINTEREST_CONFIG.clientSecret}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    // Get user account info
    const client = new PinterestClient({ accessToken: access_token });
    const user = await client.getUserAccount();
    const { items: boards } = await client.getBoards({ page_size: 100 });

    // Store tokens securely
    const adminClient = getAdminClient();
    await (adminClient as any).rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
      p_credential_value: access_token,
    });
    await (adminClient as any).rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'refresh_token',
      p_credential_value: refresh_token,
    });

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update integration record (tokens stored securely via vault RPC above)
    await (supabase as any)
      .from('integrations')
      .update({
        status: 'connected',
        metadata: {
          account_name: user.business_name || user.username,
          account_id: user.username,
          board_count: boards.length,
        },
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq('user_id', userId)
      .eq('provider', 'pinterest');

    // Sync boards to local database
    await syncPinterestBoards(userId, boards);

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
          setup_progress: { ...settings.setup_progress, pinterest: 'completed' },
        })
        .eq('user_id', userId);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'pinterest', accountName: user.username },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?success=pinterest_connected`
    );
  } catch (error) {
    console.error('Pinterest callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=pinterest_callback_failed`
    );
  }
}

async function syncPinterestBoards(userId: string, boards: PinterestBoard[]) {
  const supabase = await createServerSupabaseClient();

  // Upsert boards
  for (const board of boards) {
    await (supabase as any).from('pinterest_boards').upsert({
      user_id: userId,
      pinterest_board_id: board.id,
      name: board.name,
      pin_count: board.pin_count,
      synced_at: new Date().toISOString(),
    });
  }
}
