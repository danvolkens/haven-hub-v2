import { getAdminClient } from '@/lib/supabase/admin';
import { syncCustomerFromShopify } from './customer-service';
import type { ShopifyOrder, ShopifyCustomer } from './client';

interface ExtendedShopifyOrder extends ShopifyOrder {
  order_number?: number;
  subtotal_price?: string;
  total_tax?: string;
  total_discounts?: string;
  currency?: string;
  landing_site?: string;
  referring_site?: string;
  updated_at?: string;
  note_attributes?: Array<{ name: string; value: string }>;
}

// =============================================================================
// Main Order Processing
// =============================================================================

export async function processShopifyOrder(
  userId: string,
  order: ExtendedShopifyOrder
): Promise<void> {
  const adminClient = getAdminClient();

  // 1. Upsert customer from order
  let customerId: string | null = null;
  if (order.customer && order.email) {
    const customer = await syncCustomerFromShopify(userId, {
      ...order.customer,
      email: order.email,
      orders_count: order.customer.orders_count || 1,
      total_spent: order.customer.total_spent || order.total_price,
    });
    customerId = customer?.id || null;
  }

  // 2. Extract UTM params from note_attributes or landing_site
  const utmParams = extractUtmParams(order);

  // 3. Upsert order record
  const { data: orderRecord, error: orderError } = await (adminClient as any)
    .from('shopify_orders')
    .upsert(
      {
        user_id: userId,
        shopify_order_id: String(order.id),
        shopify_order_number: order.order_number ? String(order.order_number) : null,
        customer_id: customerId,
        email: order.email,
        total_price: parseFloat(order.total_price),
        subtotal_price: order.subtotal_price ? parseFloat(order.subtotal_price) : null,
        total_tax: order.total_tax ? parseFloat(order.total_tax) : null,
        total_discounts: order.total_discounts ? parseFloat(order.total_discounts) : null,
        currency: order.currency || 'USD',
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        line_items: order.line_items,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        landing_page: order.landing_site,
        referring_site: order.referring_site,
        shopify_created_at: order.created_at,
        shopify_updated_at: order.updated_at || order.created_at,
      },
      { onConflict: 'user_id,shopify_order_id' }
    )
    .select('id')
    .single();

  if (orderError) {
    console.error('Failed to upsert order:', orderError);
    throw new Error(`Failed to upsert order: ${orderError.message}`);
  }

  // 4. Update product stats
  await updateProductStats(userId, order.line_items);

  // 5. Record attribution event
  await recordAttributionEvent(userId, order, customerId, utmParams);

  // 6. Record touchpoint
  if (customerId) {
    await recordTouchpoint(userId, customerId, order);
  }

  // 7. Update customer stage
  if (customerId) {
    await (adminClient as any).rpc('update_customer_stage', {
      p_customer_id: customerId,
      p_trigger_type: 'purchase',
    });
  }
}

// =============================================================================
// Order Status Updates
// =============================================================================

export async function updateOrderStatus(
  userId: string,
  order: ExtendedShopifyOrder
): Promise<void> {
  const adminClient = getAdminClient();

  // Update order record
  const { error } = await (adminClient as any)
    .from('shopify_orders')
    .update({
      financial_status: order.financial_status,
      fulfillment_status: order.fulfillment_status,
      shopify_updated_at: order.updated_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('shopify_order_id', String(order.id));

  if (error) {
    console.error('Failed to update order status:', error);
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  // Handle refunds
  if (order.financial_status === 'refunded' || order.financial_status === 'partially_refunded') {
    await handleRefund(userId, order);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function extractUtmParams(order: ExtendedShopifyOrder): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  let utm_source: string | null = null;
  let utm_medium: string | null = null;
  let utm_campaign: string | null = null;

  // Check note_attributes first (more reliable)
  if (order.note_attributes) {
    for (const attr of order.note_attributes) {
      if (attr.name === 'utm_source') utm_source = attr.value;
      if (attr.name === 'utm_medium') utm_medium = attr.value;
      if (attr.name === 'utm_campaign') utm_campaign = attr.value;
    }
  }

  // Fall back to parsing landing_site URL
  if (!utm_source && order.landing_site) {
    try {
      const url = new URL(order.landing_site, 'https://example.com');
      utm_source = url.searchParams.get('utm_source') || null;
      utm_medium = url.searchParams.get('utm_medium') || null;
      utm_campaign = url.searchParams.get('utm_campaign') || null;
    } catch {
      // Invalid URL, skip
    }
  }

  return { utm_source, utm_medium, utm_campaign };
}

async function updateProductStats(
  userId: string,
  lineItems: ExtendedShopifyOrder['line_items']
): Promise<void> {
  const adminClient = getAdminClient();

  for (const item of lineItems) {
    // Find the product in our system by Shopify product ID
    const { data: product } = await (adminClient as any)
      .from('products')
      .select('id, stats')
      .eq('user_id', userId)
      .eq('shopify_product_id', String(item.product_id))
      .single();

    if (product) {
      const currentStats = product.stats || { orders: 0, revenue: 0, units_sold: 0 };
      const itemRevenue = parseFloat(item.price) * item.quantity;

      await (adminClient as any)
        .from('products')
        .update({
          stats: {
            ...currentStats,
            orders: (currentStats.orders || 0) + 1,
            revenue: (currentStats.revenue || 0) + itemRevenue,
            units_sold: (currentStats.units_sold || 0) + item.quantity,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);
    }
  }
}

async function recordAttributionEvent(
  userId: string,
  order: ExtendedShopifyOrder,
  customerId: string | null,
  utmParams: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null }
): Promise<void> {
  const adminClient = getAdminClient();

  // Determine attribution source
  let source = 'direct';
  if (utmParams.utm_source === 'pinterest') {
    source = 'pinterest';
  } else if (utmParams.utm_source === 'email' || utmParams.utm_source === 'klaviyo') {
    source = 'email';
  } else if (utmParams.utm_source) {
    source = utmParams.utm_source;
  }

  // Insert attribution event
  await (adminClient as any).from('attribution_events').insert({
    user_id: userId,
    customer_id: customerId,
    event_type: 'purchase',
    event_value: parseFloat(order.total_price),
    source,
    medium: utmParams.utm_medium,
    campaign: utmParams.utm_campaign,
    metadata: {
      shopify_order_id: order.id,
      order_number: order.order_number,
      line_items_count: order.line_items.length,
    },
    occurred_at: order.created_at,
  });
}

async function recordTouchpoint(
  userId: string,
  customerId: string,
  order: ExtendedShopifyOrder
): Promise<void> {
  const adminClient = getAdminClient();

  // Determine channel from referring_site
  let channel = 'direct';
  if (order.referring_site) {
    if (order.referring_site.includes('pinterest')) {
      channel = 'pinterest';
    } else if (order.referring_site.includes('email') || order.referring_site.includes('klaviyo')) {
      channel = 'email';
    } else {
      channel = 'referral';
    }
  }

  await (adminClient as any).from('touchpoints').insert({
    user_id: userId,
    customer_id: customerId,
    type: 'purchase',
    channel,
    reference_id: String(order.id),
    reference_type: 'shopify_order',
    value: parseFloat(order.total_price),
    metadata: {
      order_number: order.order_number,
      line_items: order.line_items.map((item) => ({
        product_id: item.product_id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      })),
    },
    occurred_at: order.created_at,
  });
}

async function handleRefund(
  userId: string,
  order: ExtendedShopifyOrder
): Promise<void> {
  const adminClient = getAdminClient();

  // Get the order record
  const { data: orderRecord } = await (adminClient as any)
    .from('shopify_orders')
    .select('id, customer_id, total_price')
    .eq('user_id', userId)
    .eq('shopify_order_id', String(order.id))
    .single();

  if (!orderRecord || !orderRecord.customer_id) {
    return;
  }

  // Update customer lifetime value
  const { data: customer } = await (adminClient as any)
    .from('customers')
    .select('lifetime_value, total_orders')
    .eq('id', orderRecord.customer_id)
    .single();

  if (customer) {
    const refundAmount = order.financial_status === 'refunded'
      ? parseFloat(order.total_price)
      : 0; // For partial refunds, we'd need the refund amount from Shopify

    await (adminClient as any)
      .from('customers')
      .update({
        lifetime_value: Math.max(0, (customer.lifetime_value || 0) - refundAmount),
        total_orders: order.financial_status === 'refunded'
          ? Math.max(0, (customer.total_orders || 1) - 1)
          : customer.total_orders,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderRecord.customer_id);
  }

  // Log activity
  await (adminClient as any).rpc('log_activity', {
    p_user_id: userId,
    p_action_type: 'order_refunded',
    p_details: {
      shopify_order_id: order.id,
      financial_status: order.financial_status,
    },
    p_executed: true,
    p_module: 'shopify',
  });
}
