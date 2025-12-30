import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { ShopifyClient } from '@/lib/integrations/shopify/client';
import { getCredential } from '@/lib/integrations/credentials';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get integration status
    const { data: integration, error: integrationError } = await (supabase as any)
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .single();

    if (integrationError && integrationError.code !== 'PGRST116') {
      throw new Error(integrationError.message);
    }

    if (!integration || integration.status !== 'connected') {
      return NextResponse.json({
        connected: false,
        status: integration?.status || 'disconnected',
      });
    }

    // Auto-fetch primary domain if missing (one-time fix for existing integrations)
    if (!integration.metadata?.primary_domain && integration.metadata?.shop_domain) {
      try {
        const accessToken = await getCredential(userId, 'shopify', 'access_token');
        if (accessToken) {
          const client = new ShopifyClient({
            shop: integration.metadata.shop_domain,
            accessToken
          });
          const { shop: shopInfo } = await client.getShop();
          if (shopInfo.domain) {
            // Update metadata with primary domain
            await (supabase as any)
              .from('integrations')
              .update({
                metadata: {
                  ...integration.metadata,
                  primary_domain: shopInfo.domain,
                },
              })
              .eq('user_id', userId)
              .eq('provider', 'shopify');
            integration.metadata.primary_domain = shopInfo.domain;
          }
        }
      } catch (error) {
        console.error('Failed to auto-fetch primary domain:', error);
      }
    }

    // Get webhook status
    const { data: webhooks } = await (supabase as any)
      .from('shopify_webhooks')
      .select('topic, last_received_at, receive_count')
      .eq('user_id', userId);

    // Get order stats
    const { data: orderStats } = await (supabase as any)
      .from('shopify_orders')
      .select('id, shopify_created_at')
      .eq('user_id', userId)
      .order('shopify_created_at', { ascending: false })
      .limit(1);

    // Get customer count
    const { count: customerCount } = await (supabase as any)
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('shopify_customer_id', 'is', null);

    // Get product count synced from Shopify
    const { count: productCount } = await (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('shopify_product_id', 'is', null);

    // Get total orders count
    const { count: orderCount } = await (supabase as any)
      .from('shopify_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get sync settings
    const { data: userSettings } = await (supabase as any)
      .from('user_settings')
      .select('shopify_sync_settings')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      connected: true,
      status: integration.status,
      shop: {
        domain: integration.metadata?.primary_domain || integration.metadata?.shop_domain, // Prefer custom domain
        myshopifyDomain: integration.metadata?.shop_domain,
        name: integration.metadata?.shop_name,
      },
      connectedAt: integration.connected_at,
      webhooks: webhooks || [],
      stats: {
        orders: orderCount || 0,
        customers: customerCount || 0,
        products: productCount || 0,
        lastOrderAt: orderStats?.[0]?.shopify_created_at || null,
      },
      syncSettings: {
        autoSync: userSettings?.shopify_sync_settings?.autoSync ?? false,
        syncFrequency: userSettings?.shopify_sync_settings?.syncFrequency ?? '24h',
      },
    });
  } catch (error) {
    console.error('Shopify status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
