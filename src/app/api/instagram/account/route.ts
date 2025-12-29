import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { InstagramClient } from '@/lib/integrations/instagram/client';

/**
 * GET /api/instagram/account
 *
 * Fetches Instagram account profile info and recent media.
 * This endpoint demonstrates the instagram_basic permission use case:
 * - Profile fields (id, username, name, bio, followers, etc.)
 * - Media list (recent posts)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get integration data with stored tokens
    const { data: integration, error: intError } = await (supabase as any)
      .from('integrations')
      .select('metadata, status, connected_at, token_expires_at')
      .eq('user_id', userId)
      .eq('provider', 'instagram')
      .single();

    if (intError || !integration || integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Instagram not connected' },
        { status: 400 }
      );
    }

    // Get access token from metadata (fallback for local dev)
    const accessToken = integration.metadata?._access_token;
    const accountId = integration.metadata?.account_id;

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing Instagram credentials' },
        { status: 400 }
      );
    }

    // Create Instagram client
    const client = new InstagramClient({
      accessToken,
      instagramAccountId: accountId,
    });

    // Fetch account info with all available profile fields
    const accountInfo = await client.getAccountInfo();

    // Fetch recent media (posts)
    const mediaResponse = await client.getMedia({ limit: 12 });

    return NextResponse.json({
      profile: {
        id: accountInfo.id,
        username: accountInfo.username,
        name: accountInfo.name,
        biography: accountInfo.biography || null,
        website: accountInfo.website || null,
        profile_picture_url: accountInfo.profile_picture_url,
        followers_count: accountInfo.followers_count,
        follows_count: accountInfo.follows_count,
        media_count: accountInfo.media_count,
      },
      media: mediaResponse.data.map((post) => ({
        id: post.id,
        caption: post.caption,
        media_type: post.media_type,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
        like_count: post.like_count,
        comments_count: post.comments_count,
      })),
      connection: {
        connected_at: integration.connected_at,
        token_expires_at: integration.token_expires_at,
        page_name: integration.metadata?.page_name,
      },
    });
  } catch (error) {
    console.error('Instagram account fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch account' },
      { status: 500 }
    );
  }
}
