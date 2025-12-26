import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

// Test payloads for different webhook topics
const testPayloads: Record<string, object> = {
  'orders/create': {
    id: 9999999999,
    order_number: 'TEST-001',
    email: 'test@example.com',
    total_price: '49.99',
    subtotal_price: '49.99',
    total_tax: '0.00',
    total_discounts: '0.00',
    currency: 'USD',
    financial_status: 'paid',
    fulfillment_status: null,
    line_items: [
      {
        product_id: 1234567890,
        variant_id: 9876543210,
        title: 'Test Product',
        quantity: 1,
        price: '49.99',
      },
    ],
    customer: {
      id: 1111111111,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'Customer',
      orders_count: 1,
      total_spent: '49.99',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'orders/updated': {
    id: 9999999999,
    order_number: 'TEST-001',
    email: 'test@example.com',
    total_price: '49.99',
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    updated_at: new Date().toISOString(),
  },
  'checkouts/create': {
    id: 8888888888,
    token: 'test-checkout-token',
    email: 'test@example.com',
    total_price: '49.99',
    line_items: [
      {
        product_id: 1234567890,
        variant_id: 9876543210,
        title: 'Test Product',
        quantity: 1,
        price: '49.99',
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'checkouts/update': {
    id: 8888888888,
    token: 'test-checkout-token',
    email: 'test@example.com',
    total_price: '49.99',
    line_items: [
      {
        product_id: 1234567890,
        variant_id: 9876543210,
        title: 'Test Product',
        quantity: 1,
        price: '49.99',
      },
    ],
    abandoned_checkout_url: 'https://example.myshopify.com/checkout/test',
    updated_at: new Date().toISOString(),
  },
  'customers/create': {
    id: 1111111111,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'Customer',
    orders_count: 0,
    total_spent: '0.00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'customers/update': {
    id: 1111111111,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'Customer',
    orders_count: 1,
    total_spent: '49.99',
    updated_at: new Date().toISOString(),
  },
  'products/update': {
    id: 1234567890,
    title: 'Test Product',
    body_html: '<p>This is a test product.</p>',
    status: 'active',
    variants: [
      {
        id: 9876543210,
        title: 'Default',
        price: '49.99',
        sku: 'TEST-SKU',
        inventory_quantity: 100,
      },
    ],
    images: [],
    updated_at: new Date().toISOString(),
  },
  'app/uninstalled': {
    shop_domain: 'test-shop.myshopify.com',
  },
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = getAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { topic } = body;

    if (!topic || !testPayloads[topic]) {
      return NextResponse.json(
        { error: 'Invalid topic', success: false },
        { status: 400 }
      );
    }

    // Get shop domain from integration
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('provider', 'shopify')
      .eq('status', 'connected')
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: 'Shopify not connected', success: false },
        { status: 400 }
      );
    }

    const shopDomain = integration.metadata?.shop_domain || 'test-shop.myshopify.com';

    // Log the test webhook event
    await (adminClient as any).from('shopify_webhook_events').insert({
      user_id: user.id,
      topic,
      shop_domain: shopDomain,
      shopify_id: `test-${Date.now()}`,
      payload: {
        ...testPayloads[topic],
        _test: true,
        _test_timestamp: new Date().toISOString(),
      },
      processed: true,
    });

    // Update webhook receive stats
    await (adminClient as any)
      .from('shopify_webhooks')
      .update({
        last_received_at: new Date().toISOString(),
        receive_count: (adminClient as any).raw('receive_count + 1'),
      })
      .eq('user_id', user.id)
      .eq('topic', topic);

    return NextResponse.json({
      success: true,
      topic,
      message: `Test webhook event logged for ${topic}`,
    });
  } catch (error) {
    console.error('Error sending test webhook:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send test webhook',
        success: false,
      },
      { status: 500 }
    );
  }
}
