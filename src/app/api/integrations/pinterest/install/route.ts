import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getPinterestAuthUrl, PINTEREST_CONFIG } from '@/lib/integrations/pinterest/config';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    // Check if Pinterest credentials are configured
    if (!PINTEREST_CONFIG.clientId || !PINTEREST_CONFIG.clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=pinterest_not_configured`
      );
    }

    const userId = await getApiUserId();

    // Generate and store state for CSRF protection
    const state = nanoid(32);
    const supabase = await createServerSupabaseClient();

    // Store state in user's integration record
    const { error: upsertError } = await (supabase as any)
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'pinterest',
          status: 'connecting',
          metadata: { oauth_state: state },
        },
        { onConflict: 'user_id,provider' }
      );

    if (upsertError) {
      console.error('Failed to store Pinterest OAuth state:', upsertError);
      throw new Error('Failed to initialize Pinterest connection');
    }

    // Generate OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/pinterest/callback`;
    const authUrl = getPinterestAuthUrl(state, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Pinterest install error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=pinterest_install_failed`
    );
  }
}
