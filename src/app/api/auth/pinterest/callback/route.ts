import { NextRequest, NextResponse } from 'next/server';
import {
  exchangePinterestCode,
  savePinterestIntegration,
  syncPinterestBoards,
} from '@/lib/integrations/pinterest/service';
import { PinterestClient } from '@/lib/integrations/pinterest/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Pinterest OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=missing_params`
      );
    }

    // Decode and verify state
    let stateData: { userId: string; nonce: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=invalid_state`
      );
    }

    // Check state is not too old (10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=expired_state`
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/pinterest/callback`;

    // Exchange code for tokens
    const tokens = await exchangePinterestCode(code, redirectUri);

    // Get user info from Pinterest
    const client = new PinterestClient({ accessToken: tokens.access_token });
    const userAccount = await client.getUserAccount();

    // Save integration to database
    await savePinterestIntegration(stateData.userId, tokens, {
      username: userAccount.username,
      profile_image: userAccount.profile_image,
    });

    // Sync boards in background
    syncPinterestBoards(stateData.userId).catch((err) => {
      console.error('Error syncing Pinterest boards:', err);
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pinterest?connected=true`
    );
  } catch (error) {
    console.error('Pinterest callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?pinterest_error=callback_failed`
    );
  }
}
