import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getTikTokAuthUrl, TIKTOK_CONFIG } from '@/lib/integrations/tiktok/config';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    // Check if TikTok credentials are configured
    if (!TIKTOK_CONFIG.clientKey || !TIKTOK_CONFIG.clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=tiktok_not_configured`
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
          platform: 'tiktok',
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
          provider: 'tiktok',
          status: 'connecting',
          metadata: { oauth_state: state },
        },
        { onConflict: 'user_id,provider' }
      );

    if (upsertError) {
      console.error('Failed to store TikTok OAuth state:', upsertError);
      throw new Error('Failed to initialize TikTok connection');
    }

    // Generate OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/tiktok/callback`;
    const authUrl = getTikTokAuthUrl(state, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('TikTok install error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=tiktok_install_failed`
    );
  }
}
