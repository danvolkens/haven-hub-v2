import { getAdminClient } from '@/lib/supabase/admin';
import { processShopifyOrder, updateOrderStatus } from './order-service';
import { syncCustomerFromShopify } from './customer-service';
import { syncProductFromShopify } from './product-sync';
import { recordAbandonedCheckout, markCheckoutRecovered } from '@/lib/abandonment/abandonment-service';
import type { ShopifyOrder, ShopifyCustomer, ShopifyProduct } from './client';

interface ShopifyCheckout {
  id: number;
  token: string;
  email: string;
  customer?: { id: number };
  total_price: string;
  line_items: Array<{
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
  abandoned_checkout_url?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// =============================================================================
// Order Webhooks
// =============================================================================

export async function handleOrderCreated(userId: string, order: ShopifyOrder) {
  console.log(`Processing order/create for user ${userId}, order ${order.id}`);

  // Process the order (creates customer, records attribution, updates stats)
  await processShopifyOrder(userId, order);

  // Check if this order recovers an abandoned checkout
  // Shopify sends checkout_id or checkout_token in the order
  const checkoutToken = (order as any).checkout_token;
  if (checkoutToken) {
    await markCheckoutRecovered(
      userId,
      checkoutToken,
      String(order.id),
      parseFloat(order.total_price)
    );
  }

  // Log activity
  const adminClient = getAdminClient();
  await (adminClient as any).rpc('log_activity', {
    p_user_id: userId,
    p_action_type: 'order_received',
    p_details: {
      shopify_order_id: order.id,
      order_number: (order as any).order_number,
      total: order.total_price,
      email: order.email,
    },
    p_executed: true,
    p_module: 'shopify',
  });
}

export async function handleOrderUpdated(userId: string, order: ShopifyOrder) {
  console.log(`Processing order/updated for user ${userId}, order ${order.id}`);

  // Update order status and handle refunds
  await updateOrderStatus(userId, order);
}

// =============================================================================
// Checkout Webhooks
// =============================================================================

export async function handleCheckoutCreated(userId: string, checkout: ShopifyCheckout) {
  console.log(`Processing checkout/create for user ${userId}, checkout ${checkout.id}`);

  // Don't record as abandoned yet - it's just created
  // Wait for checkout/update or a timeout
}

export async function handleCheckoutUpdated(userId: string, checkout: ShopifyCheckout) {
  console.log(`Processing checkout/update for user ${userId}, checkout ${checkout.id}`);

  // If checkout is completed, it will trigger orders/create webhook
  // So we only care about abandoned checkouts here
  if (checkout.completed_at) {
    // Checkout completed - order webhook will handle it
    return;
  }

  // If we have an email and the checkout has items, record as abandoned
  if (checkout.email && checkout.line_items && checkout.line_items.length > 0) {
    await recordAbandonedCheckout(userId, {
      shopifyCheckoutId: String(checkout.id),
      shopifyCheckoutToken: checkout.token,
      email: checkout.email,
      customerId: checkout.customer?.id ? String(checkout.customer.id) : undefined,
      cartTotal: parseFloat(checkout.total_price),
      cartItems: checkout.line_items.map((item) => ({
        product_id: String(item.product_id),
        variant_id: String(item.variant_id),
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
      })),
      checkoutUrl: checkout.abandoned_checkout_url,
      abandonedAt: checkout.updated_at,
    });
  }
}

// =============================================================================
// Customer Webhooks
// =============================================================================

export async function handleCustomerCreated(userId: string, customer: ShopifyCustomer) {
  console.log(`Processing customer/create for user ${userId}, customer ${customer.id}`);

  await syncCustomerFromShopify(userId, customer);
}

export async function handleCustomerUpdated(userId: string, customer: ShopifyCustomer) {
  console.log(`Processing customer/update for user ${userId}, customer ${customer.id}`);

  await syncCustomerFromShopify(userId, customer);
}

// =============================================================================
// Product Webhooks
// =============================================================================

export async function handleProductUpdated(userId: string, product: ShopifyProduct) {
  console.log(`Processing product/update for user ${userId}, product ${product.id}`);

  await syncProductFromShopify(userId, product);
}

// =============================================================================
// App Webhooks
// =============================================================================

export async function handleAppUninstalled(userId: string, payload: { shop_domain?: string }) {
  console.log(`Processing app/uninstalled for user ${userId}`);

  const adminClient = getAdminClient();

  // Mark integration as disconnected
  await (adminClient as any)
    .from('integrations')
    .update({
      status: 'disconnected',
      disconnected_at: new Date().toISOString(),
      metadata: {},
    })
    .eq('user_id', userId)
    .eq('provider', 'shopify');

  // Delete stored credentials
  await (adminClient as any).rpc('delete_credentials', {
    p_user_id: userId,
    p_provider: 'shopify',
  });

  // Delete webhook records (they're invalid now)
  await (adminClient as any)
    .from('shopify_webhooks')
    .delete()
    .eq('user_id', userId);

  // Log activity
  await (adminClient as any).rpc('log_activity', {
    p_user_id: userId,
    p_action_type: 'integration_disconnected',
    p_details: { provider: 'shopify', reason: 'app_uninstalled' },
    p_executed: true,
    p_module: 'settings',
  });
}
