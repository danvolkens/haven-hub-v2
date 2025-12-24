import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { SHOPIFY_CONFIG } from '@/lib/integrations/shopify/config';
import { ShopifyClient } from '@/lib/integrations/shopify/client';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const searchParams = request.nextUrl.searchParams;

    const shop = searchParams.get('shop');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');

    if (!shop || !code || !state) {
      throw new Error('Missing required parameters');
    }

    // Verify HMAC
    const queryParams = new URLSearchParams(searchParams);
    queryParams.delete('hmac');
    queryParams.sort();

    const message = queryParams.toString();
    const generatedHmac = crypto
      .createHmac('sha256', SHOPIFY_CONFIG.clientSecret)
      .update(message)
      .digest('hex');

    if (hmac !== generatedHmac) {
      throw new Error('HMAC validation failed');
    }

    // Verify state matches stored state
    const supabase = await createServerSupabaseClient();
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .single();

    if (!integration || integration.metadata.oauth_state !== state) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CONFIG.clientId,
        client_secret: SHOPIFY_CONFIG.clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const { access_token, scope } = await tokenResponse.json();

    // Get shop info
    const client = new ShopifyClient({ shop, accessToken: access_token });
    const { shop: shopInfo } = await client.getShop();

    // Store access token securely in vault
    const adminClient = getAdminClient();
    await (adminClient as any).rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'shopify',
      p_credential_type: 'access_token',
      p_credential_value: access_token,
    });

    // Update integration record
    await (supabase as any)
      .from('integrations')
      .update({
        status: 'connected',
        metadata: {
          shop_domain: shop,
          shop_name: shopInfo.name,
          access_scopes: scope.split(','),
        },
        connected_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq('user_id', userId)
      .eq('provider', 'shopify');

    // Register webhooks
    await registerShopifyWebhooks(userId, shop, access_token, supabase);

    // Update setup progress
    await (supabase as any)
      .from('user_settings')
      .update({
        setup_progress: (supabase as any).sql`jsonb_set(setup_progress, '{shopify}', '"completed"')`,
      })
      .eq('user_id', userId);

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'shopify', shop },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?success=shopify_connected`
    );
  } catch (error) {
    console.error('Shopify callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=shopify_callback_failed`
    );
  }
}

async function registerShopifyWebhooks(
  userId: string,
  shop: string,
  accessToken: string,
  supabase: any
) {
  const client = new ShopifyClient({ shop, accessToken });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  for (const topic of SHOPIFY_CONFIG.webhookTopics) {
    try {
      const address = `${baseUrl}/api/webhooks/shopify?topic=${topic}`;
      const { webhook } = await client.createWebhook(topic, address);

      await supabase.from('shopify_webhooks').insert({
        user_id: userId,
        shopify_webhook_id: String(webhook.id),
        topic,
        address,
      });
    } catch (error) {
      console.error(`Failed to register webhook ${topic}:`, error);
    }
  }
}
