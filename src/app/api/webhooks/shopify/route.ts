import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';
import { SHOPIFY_CONFIG } from '@/lib/integrations/shopify/config';
import {
  handleOrderCreated,
  handleOrderUpdated,
  handleCheckoutCreated,
  handleCheckoutUpdated,
  handleCustomerCreated,
  handleCustomerUpdated,
  handleProductUpdated,
  handleAppUninstalled,
} from '@/lib/integrations/shopify/webhook-service';

// Disable body parsing - we need the raw body for HMAC verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const adminClient = getAdminClient();

  try {
    // Get headers
    const shopifyHmac = request.headers.get('x-shopify-hmac-sha256');
    const shopifyTopic = request.headers.get('x-shopify-topic');
    const shopifyDomain = request.headers.get('x-shopify-shop-domain');

    if (!shopifyHmac || !shopifyTopic || !shopifyDomain) {
      console.error('Missing Shopify webhook headers');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Get raw body for HMAC verification
    const rawBody = await request.text();

    // Verify HMAC
    const generatedHmac = crypto
      .createHmac('sha256', SHOPIFY_CONFIG.clientSecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (generatedHmac !== shopifyHmac) {
      console.error('HMAC verification failed', {
        topic: shopifyTopic,
        shop: shopifyDomain,
      });
      return NextResponse.json(
        { error: 'HMAC verification failed' },
        { status: 401 }
      );
    }

    // Parse the JSON body
    const payload = JSON.parse(rawBody);

    // Find user by shop domain
    const { data: integration, error: integrationError } = await (adminClient as any)
      .from('integrations')
      .select('user_id, metadata')
      .eq('provider', 'shopify')
      .eq('status', 'connected')
      .filter('metadata->shop_domain', 'eq', shopifyDomain)
      .single();

    if (integrationError || !integration) {
      console.error('No integration found for shop:', shopifyDomain);
      // Return 200 to prevent Shopify from retrying - user may have disconnected
      return NextResponse.json({ status: 'ignored', reason: 'no_integration' });
    }

    const userId = integration.user_id;

    // Log the webhook event
    const shopifyId = payload.id ? String(payload.id) : null;
    await (adminClient as any).from('shopify_webhook_events').insert({
      user_id: userId,
      topic: shopifyTopic,
      shop_domain: shopifyDomain,
      shopify_id: shopifyId,
      payload,
      processed: false,
    });

    // Update webhook receive stats
    await (adminClient as any)
      .from('shopify_webhooks')
      .update({
        last_received_at: new Date().toISOString(),
        receive_count: (adminClient as any).raw('receive_count + 1'),
      })
      .eq('user_id', userId)
      .eq('topic', shopifyTopic);

    // Process webhook asynchronously (don't await to return 200 quickly)
    processWebhook(userId, shopifyTopic, payload, shopifyId, adminClient).catch(
      (error) => {
        console.error('Webhook processing error:', {
          topic: shopifyTopic,
          shop: shopifyDomain,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    );

    const duration = Date.now() - startTime;
    console.log(`Shopify webhook received: ${shopifyTopic} from ${shopifyDomain} (${duration}ms)`);

    // Return 200 immediately
    return NextResponse.json({ status: 'accepted' });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    // Return 200 to prevent retries on parse errors
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }
    );
  }
}

async function processWebhook(
  userId: string,
  topic: string,
  payload: any,
  shopifyId: string | null,
  adminClient: any
) {
  try {
    switch (topic) {
      case 'orders/create':
        await handleOrderCreated(userId, payload);
        break;

      case 'orders/updated':
        await handleOrderUpdated(userId, payload);
        break;

      case 'checkouts/create':
        await handleCheckoutCreated(userId, payload);
        break;

      case 'checkouts/update':
        await handleCheckoutUpdated(userId, payload);
        break;

      case 'customers/create':
        await handleCustomerCreated(userId, payload);
        break;

      case 'customers/update':
        await handleCustomerUpdated(userId, payload);
        break;

      case 'products/update':
        await handleProductUpdated(userId, payload);
        break;

      case 'app/uninstalled':
        await handleAppUninstalled(userId, payload);
        break;

      default:
        console.warn(`Unhandled webhook topic: ${topic}`);
    }

    // Mark as processed
    if (shopifyId) {
      await adminClient
        .from('shopify_webhook_events')
        .update({ processed: true })
        .eq('user_id', userId)
        .eq('shopify_id', shopifyId)
        .eq('topic', topic);
    }
  } catch (error) {
    // Log error but don't throw - webhook already accepted
    console.error('Webhook handler error:', {
      topic,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Update event with error
    if (shopifyId) {
      await adminClient
        .from('shopify_webhook_events')
        .update({
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('user_id', userId)
        .eq('shopify_id', shopifyId)
        .eq('topic', topic);
    }
  }
}
