import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { ShopifyClient } from '@/lib/integrations/shopify/client';
import { SHOPIFY_CONFIG } from '@/lib/integrations/shopify/config';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get registered webhooks
    const { data: webhooks, error } = await (supabase as any)
      .from('shopify_webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('topic');

    if (error) {
      throw new Error(error.message);
    }

    // Check which topics are registered
    const registeredTopics = new Set((webhooks || []).map((w: any) => w.topic));
    const expectedTopics = SHOPIFY_CONFIG.webhookTopics;
    const missingTopics = expectedTopics.filter((t) => !registeredTopics.has(t));

    return NextResponse.json({
      webhooks: webhooks || [],
      expectedTopics,
      missingTopics,
      healthy: missingTopics.length === 0,
    });
  } catch (error) {
    console.error('Webhooks list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    // Get integration
    const { data: integration, error: integrationError } = await (supabase as any)
      .from('integrations')
      .select('metadata, status')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .single();

    if (integrationError || !integration || integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 400 }
      );
    }

    // Get access token from vault
    const { data: accessToken } = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'shopify',
      p_credential_type: 'access_token',
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not found' },
        { status: 400 }
      );
    }

    const shop = integration.metadata.shop_domain;
    const client = new ShopifyClient({ shop, accessToken });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Get existing webhooks from Shopify
    const { webhooks: shopifyWebhooks } = await client.getWebhooks();
    const existingTopics = new Set(shopifyWebhooks.map((w) => w.topic));

    // Register missing webhooks
    const registered: string[] = [];
    const errors: string[] = [];

    for (const topic of SHOPIFY_CONFIG.webhookTopics) {
      if (existingTopics.has(topic)) {
        continue;
      }

      try {
        const address = `${baseUrl}/api/webhooks/shopify?topic=${topic}`;
        const { webhook } = await client.createWebhook(topic, address);

        // Save to our database
        await (supabase as any).from('shopify_webhooks').upsert(
          {
            user_id: userId,
            shopify_webhook_id: String(webhook.id),
            topic,
            address,
          },
          { onConflict: 'user_id,topic' }
        );

        registered.push(topic);
      } catch (error) {
        errors.push(`${topic}: ${error instanceof Error ? error.message : 'Failed'}`);
      }
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'webhooks_registered',
      p_details: { registered, errors: errors.length },
      p_executed: true,
      p_module: 'shopify',
    });

    return NextResponse.json({
      success: true,
      registered,
      errors,
    });
  } catch (error) {
    console.error('Webhook registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
