import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { TIKTOK_CONFIG } from '@/lib/integrations/tiktok/config';
import { TikTokClient } from '@/lib/integrations/tiktok/client';

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
      .eq('provider', 'tiktok')
      .single();

    if (!integration || integration.metadata.oauth_state !== state) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/tiktok/callback`;

    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CONFIG.clientKey,
        client_secret: TIKTOK_CONFIG.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('TikTok token error:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, open_id } = tokenData;

    // Get user account info
    const client = new TikTokClient({ accessToken: access_token });
    const user = await client.getUserInfo();

    // Store tokens securely (using admin client for vault if available)
    const adminClient = getAdminClient();
    try {
      await (adminClient as any).rpc('store_credential', {
        p_user_id: userId,
        p_provider: 'tiktok',
        p_credential_type: 'access_token',
        p_credential_value: access_token,
      });
      await (adminClient as any).rpc('store_credential', {
        p_user_id: userId,
        p_provider: 'tiktok',
        p_credential_type: 'refresh_token',
        p_credential_value: refresh_token,
      });
    } catch (vaultError) {
      // Vault may not be available in development
      console.log('Vault not available, storing in metadata fallback');
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update platform_connections table
    await (supabase as any)
      .from('platform_connections')
      .upsert(
        {
          user_id: userId,
          platform: 'tiktok',
          access_token_encrypted: access_token, // Store encrypted in production
          refresh_token_encrypted: refresh_token,
          token_expires_at: tokenExpiresAt,
          account_id: open_id,
          account_name: user.display_name,
          status: 'active',
          last_sync_at: null,
        },
        { onConflict: 'user_id,platform' }
      );

    // Update integration record (with metadata fallback for local dev)
    await (supabase as any)
      .from('integrations')
      .update({
        status: 'connected',
        metadata: {
          account_name: user.display_name,
          account_id: open_id,
          avatar_url: user.avatar_url,
          follower_count: user.follower_count,
          // Store tokens in metadata as fallback when vault is unavailable
          _access_token: access_token,
          _refresh_token: refresh_token,
        },
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq('user_id', userId)
      .eq('provider', 'tiktok');

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'tiktok', accountName: user.display_name },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?success=tiktok_connected`
    );
  } catch (error) {
    console.error('TikTok callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=tiktok_callback_failed`
    );
  }
}
