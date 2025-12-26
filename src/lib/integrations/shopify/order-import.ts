import { getAdminClient } from '@/lib/supabase/admin';
import { processShopifyOrder } from './order-service';
import type { ShopifyOrder } from './client';

interface ImportProgress {
  imported: number;
  skipped: number;
  errors: string[];
  lastOrderId?: string;
}

// =============================================================================
// Historical Order Import
// =============================================================================

export async function importOrdersFromShopify(
  userId: string,
  accessToken: string,
  shopDomain: string,
  options: {
    since?: Date; // Only import orders after this date
    limit?: number; // Maximum orders to import
  } = {}
): Promise<ImportProgress> {
  const adminClient = getAdminClient();
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;
  let sinceId: string | undefined;
  const maxOrders = options.limit || 10000;

  try {
    // Paginate through orders
    while (imported + skipped < maxOrders) {
      const url = new URL(`https://${shopDomain}/admin/api/2024-01/orders.json`);
      url.searchParams.set('limit', '250');
      url.searchParams.set('status', 'any'); // Include all orders
      if (sinceId) {
        url.searchParams.set('since_id', sinceId);
      }
      if (options.since) {
        url.searchParams.set('created_at_min', options.since.toISOString());
      }

      const response = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const { orders } = await response.json();

      if (!orders || orders.length === 0) {
        break;
      }

      // Check if order already exists
      for (const order of orders as ShopifyOrder[]) {
        try {
          const { data: existing } = await (adminClient as any)
            .from('shopify_orders')
            .select('id')
            .eq('user_id', userId)
            .eq('shopify_order_id', String(order.id))
            .single();

          if (existing) {
            skipped++;
            continue;
          }

          // Process the order
          await processShopifyOrder(userId, order as any);
          imported++;
        } catch (error) {
          errors.push(
            `Order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Check for next page
      if (orders.length < 250) {
        break;
      }

      sinceId = String(orders[orders.length - 1].id);

      // Respect rate limits (40 calls/sec for Shopify)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Log activity
    await (adminClient as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'orders_imported',
      p_details: { imported, skipped, errors: errors.length },
      p_executed: true,
      p_module: 'shopify',
    });

    return { imported, skipped, errors, lastOrderId: sinceId };
  } catch (error) {
    console.error('Order import error:', error);
    return {
      imported,
      skipped,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// =============================================================================
// Get Import Status
// =============================================================================

export async function getOrderImportStatus(userId: string): Promise<{
  totalOrders: number;
  lastImportedAt: string | null;
  oldestOrder: string | null;
  newestOrder: string | null;
}> {
  const adminClient = getAdminClient();

  const { data: stats } = await (adminClient as any)
    .from('shopify_orders')
    .select('id, shopify_created_at')
    .eq('user_id', userId)
    .order('shopify_created_at', { ascending: false });

  if (!stats || stats.length === 0) {
    return {
      totalOrders: 0,
      lastImportedAt: null,
      oldestOrder: null,
      newestOrder: null,
    };
  }

  return {
    totalOrders: stats.length,
    lastImportedAt: stats[0].created_at,
    oldestOrder: stats[stats.length - 1].shopify_created_at,
    newestOrder: stats[0].shopify_created_at,
  };
}
