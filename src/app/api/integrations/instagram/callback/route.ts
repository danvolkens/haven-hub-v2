import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { INSTAGRAM_CONFIG, getInstagramApiUrl } from '@/lib/integrations/instagram/config';
import { InstagramClient } from '@/lib/integrations/instagram/client';

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
      .eq('provider', 'instagram')
      .single();

    if (!integration || integration.metadata.oauth_state !== state) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens (Facebook OAuth)
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`;

    const tokenResponse = await fetch(
      `${getInstagramApiUrl()}/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: INSTAGRAM_CONFIG.appId,
          client_secret: INSTAGRAM_CONFIG.appSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Instagram token error:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;

    // Exchange for long-lived token
    const longLivedResponse = await fetch(
      `${getInstagramApiUrl()}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: INSTAGRAM_CONFIG.appId,
          client_secret: INSTAGRAM_CONFIG.appSecret,
          fb_exchange_token: access_token,
        })
    );

    let finalAccessToken = access_token;
    let finalExpiresIn = expires_in || 3600;

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      finalAccessToken = longLivedData.access_token;
      finalExpiresIn = longLivedData.expires_in || 5184000; // ~60 days
    }

    // Get connected Instagram Business Account
    const client = new InstagramClient({ accessToken: finalAccessToken });
    const pages = await client.getPages();

    // Debug: Log what pages were returned
    console.log('Instagram OAuth - Pages returned:', JSON.stringify(pages, null, 2));

    // Find page with Instagram business account
    const pageWithInstagram = pages.find(p => p.instagram_business_account);

    console.log('Instagram OAuth - Page with Instagram:', pageWithInstagram ? pageWithInstagram.name : 'NONE FOUND');

    if (!pageWithInstagram?.instagram_business_account) {
      throw new Error(`No Instagram Business Account found. Pages returned: ${pages.length}. Page names: ${pages.map(p => p.name).join(', ') || 'none'}`);
    }

    const igAccount = pageWithInstagram.instagram_business_account;

    // Store tokens securely (using admin client for vault if available)
    const adminClient = getAdminClient();
    try {
      await (adminClient as any).rpc('store_credential', {
        p_user_id: userId,
        p_provider: 'instagram',
        p_credential_type: 'access_token',
        p_credential_value: finalAccessToken,
      });
    } catch (vaultError) {
      // Vault may not be available in development
      console.log('Vault not available, storing in metadata fallback');
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + finalExpiresIn * 1000).toISOString();

    // Update platform_connections table
    const { error: platformError } = await (supabase as any)
      .from('platform_connections')
      .upsert(
        {
          user_id: userId,
          platform: 'instagram',
          access_token_encrypted: finalAccessToken, // Store encrypted in production
          token_expires_at: tokenExpiresAt,
          account_id: igAccount.id,
          account_name: igAccount.username,
          status: 'active',
          last_sync_at: null,
        },
        { onConflict: 'user_id,platform' }
      );

    if (platformError) {
      console.error('Instagram OAuth - platform_connections error:', platformError);
      // Continue anyway - this table may not exist
    } else {
      console.log('Instagram OAuth - platform_connections updated successfully');
    }

    // Update integration record (with metadata fallback for local dev)
    const { data: updateData, error: updateError } = await (supabase as any)
      .from('integrations')
      .update({
        status: 'connected',
        metadata: {
          account_name: igAccount.username,
          account_id: igAccount.id,
          page_id: pageWithInstagram.id,
          page_name: pageWithInstagram.name,
          profile_picture_url: igAccount.profile_picture_url,
          followers_count: igAccount.followers_count,
          media_count: igAccount.media_count,
          // Store tokens in metadata as fallback when vault is unavailable
          _access_token: finalAccessToken,
        },
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq('user_id', userId)
      .eq('provider', 'instagram')
      .select();

    if (updateError) {
      console.error('Instagram OAuth - integrations update error:', updateError);
      throw new Error(`Failed to update integration: ${updateError.message}`);
    }

    console.log('Instagram OAuth - integrations updated:', updateData);

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'instagram', accountName: igAccount.username },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?success=instagram_connected`
    );
  } catch (error) {
    console.error('Instagram callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=instagram_callback_failed&message=${encodeURIComponent(message)}`
    );
  }
}
