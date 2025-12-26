import { getAdminClient } from '@/lib/supabase/admin';
import type { ShopifyCustomer } from './client';

interface ExtendedShopifyCustomer extends ShopifyCustomer {
  created_at?: string;
  updated_at?: string;
  phone?: string;
  verified_email?: boolean;
  accepts_marketing?: boolean;
}

interface Customer {
  id: string;
  email: string;
  shopify_customer_id: string;
}

// =============================================================================
// Customer Sync
// =============================================================================

export async function syncCustomerFromShopify(
  userId: string,
  shopifyCustomer: ExtendedShopifyCustomer
): Promise<Customer | null> {
  const adminClient = getAdminClient();

  if (!shopifyCustomer.email) {
    console.warn('Cannot sync customer without email:', shopifyCustomer.id);
    return null;
  }

  // Calculate metrics
  const totalOrders = shopifyCustomer.orders_count || 0;
  const lifetimeValue = parseFloat(shopifyCustomer.total_spent) || 0;
  const averageOrderValue = totalOrders > 0 ? lifetimeValue / totalOrders : 0;

  // Determine stage based on order count
  let stage = 'lead';
  if (totalOrders === 0) {
    stage = 'lead';
  } else if (totalOrders === 1) {
    stage = 'customer';
  } else if (totalOrders >= 2) {
    stage = lifetimeValue >= 500 ? 'vip' : 'repeat';
  }

  // Upsert customer
  const { data: customer, error } = await (adminClient as any)
    .from('customers')
    .upsert(
      {
        user_id: userId,
        shopify_customer_id: String(shopifyCustomer.id),
        email: shopifyCustomer.email.toLowerCase(),
        first_name: shopifyCustomer.first_name || null,
        last_name: shopifyCustomer.last_name || null,
        phone: shopifyCustomer.phone || null,
        stage,
        total_orders: totalOrders,
        lifetime_value: lifetimeValue,
        average_order_value: averageOrderValue,
        email_subscribed: shopifyCustomer.accepts_marketing ?? true,
        became_customer_at: totalOrders > 0 ? new Date().toISOString() : null,
        became_repeat_at: totalOrders >= 2 ? new Date().toISOString() : null,
        became_vip_at: stage === 'vip' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,email',
        ignoreDuplicates: false,
      }
    )
    .select('id, email, shopify_customer_id')
    .single();

  if (error) {
    console.error('Failed to sync customer:', error);
    throw new Error(`Failed to sync customer: ${error.message}`);
  }

  // Sync to Klaviyo if connected
  await syncCustomerToKlaviyo(userId, customer, shopifyCustomer);

  return customer;
}

// =============================================================================
// Klaviyo Sync
// =============================================================================

async function syncCustomerToKlaviyo(
  userId: string,
  customer: Customer,
  shopifyCustomer: ExtendedShopifyCustomer
): Promise<void> {
  const adminClient = getAdminClient();

  try {
    // Check if Klaviyo is connected
    const { data: integration } = await (adminClient as any)
      .from('integrations')
      .select('status')
      .eq('user_id', userId)
      .eq('provider', 'klaviyo')
      .single();

    if (!integration || integration.status !== 'connected') {
      return;
    }

    // Get Klaviyo API key
    const { data: apiKey } = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!apiKey) {
      return;
    }

    // Update profile in Klaviyo
    await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: shopifyCustomer.email,
            first_name: shopifyCustomer.first_name,
            last_name: shopifyCustomer.last_name,
            phone_number: shopifyCustomer.phone,
            properties: {
              shopify_customer_id: shopifyCustomer.id,
              total_orders: shopifyCustomer.orders_count,
              lifetime_value: parseFloat(shopifyCustomer.total_spent) || 0,
              haven_customer_id: customer.id,
            },
          },
        },
      }),
    });

    // Update Klaviyo profile ID on customer if returned
    // (Klaviyo returns profile ID on create)
  } catch (error) {
    // Log but don't fail - Klaviyo sync is best-effort
    console.error('Failed to sync customer to Klaviyo:', error);
  }
}

// =============================================================================
// Customer Import (Historical)
// =============================================================================

export async function importCustomersFromShopify(
  userId: string,
  accessToken: string,
  shopDomain: string
): Promise<{ imported: number; errors: string[] }> {
  const adminClient = getAdminClient();
  const errors: string[] = [];
  let imported = 0;
  let sinceId: string | undefined;

  try {
    // Paginate through all customers
    while (true) {
      const url = new URL(`https://${shopDomain}/admin/api/2024-01/customers.json`);
      url.searchParams.set('limit', '250');
      if (sinceId) {
        url.searchParams.set('since_id', sinceId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const { customers } = await response.json();

      if (!customers || customers.length === 0) {
        break;
      }

      // Process each customer
      for (const customer of customers) {
        try {
          await syncCustomerFromShopify(userId, customer);
          imported++;
        } catch (error) {
          errors.push(
            `Customer ${customer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Check for next page
      if (customers.length < 250) {
        break;
      }

      sinceId = String(customers[customers.length - 1].id);

      // Respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Log activity
    await (adminClient as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'customers_imported',
      p_details: { imported, errors: errors.length },
      p_executed: true,
      p_module: 'shopify',
    });

    return { imported, errors };
  } catch (error) {
    console.error('Customer import error:', error);
    return {
      imported,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
