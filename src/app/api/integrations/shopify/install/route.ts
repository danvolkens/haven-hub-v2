import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getShopifyAuthUrl, SHOPIFY_CONFIG } from '@/lib/integrations/shopify/config';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter required' }, { status: 400 });
    }

    // Validate shop domain format
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
    }

    // Generate and store state for CSRF protection
    const state = nanoid(32);
    const supabase = await createServerSupabaseClient();

    // Store state in user's integration record
    const { error: upsertError } = await (supabase as any)
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'shopify',
          status: 'connecting',
          metadata: { shop_domain: shop, oauth_state: state },
        },
        { onConflict: 'user_id,provider' }
      );

    if (upsertError) {
      console.error('Failed to store OAuth state:', upsertError);
      throw new Error('Failed to initialize Shopify connection');
    }

    // Generate OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/shopify/callback`;
    const authUrl = getShopifyAuthUrl(shop, state, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Shopify install error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/setup?error=shopify_install_failed`
    );
  }
}
