import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getInstagramAuthUrl, INSTAGRAM_CONFIG } from '@/lib/integrations/instagram/config';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    // Check if Instagram credentials are configured
    if (!INSTAGRAM_CONFIG.appId || !INSTAGRAM_CONFIG.appSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=instagram_not_configured`
      );
    }

    const userId = await getApiUserId();

    // Generate and store state for CSRF protection
    const state = nanoid(32);
    const supabase = await createServerSupabaseClient();

    // Store state in platform_connections table
    const { error: upsertError } = await (supabase as any)
      .from('platform_connections')
      .upsert(
        {
          user_id: userId,
          platform: 'instagram',
          status: 'disconnected',
        },
        { onConflict: 'user_id,platform' }
      );

    // Also store in integrations for consistency
    await (supabase as any)
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'instagram',
          status: 'connecting',
          metadata: { oauth_state: state },
        },
        { onConflict: 'user_id,provider' }
      );

    if (upsertError) {
      console.error('Failed to store Instagram OAuth state:', upsertError);
      throw new Error('Failed to initialize Instagram connection');
    }

    // Generate OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram/callback`;
    const authUrl = getInstagramAuthUrl(state, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Instagram install error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=instagram_install_failed`
    );
  }
}
