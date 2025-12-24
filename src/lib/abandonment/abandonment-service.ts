import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { CartItem } from '@/types/abandonment';

interface ProcessResult {
  triggered: number;
  errors: string[];
}

export async function processAbandonedCheckouts(userId: string): Promise<ProcessResult> {
  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();
  const errors: string[] = [];
  let triggered = 0;

  try {
    // Get user's abandonment window from guardrails
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', userId)
      .single();

    const windowHours = settings?.guardrails?.abandonment_window_hours || 1;

    // Get checkouts ready for sequence trigger
    const { data: checkouts } = await (supabase as any).rpc('get_checkouts_for_sequence', {
      p_user_id: userId,
      p_window_hours: windowHours,
    });

    if (!checkouts || checkouts.length === 0) {
      return { triggered: 0, errors: [] };
    }

    // Get Klaviyo API key
    const apiKey = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!apiKey.data) {
      return { triggered: 0, errors: ['Klaviyo not connected'] };
    }

    // Process each checkout
    for (const checkout of checkouts) {
      try {
        // Trigger Klaviyo flow
        await triggerKlaviyoFlow(
          apiKey.data,
          checkout.klaviyo_flow_id,
          checkout.email,
          {
            cart_total: checkout.cart_total,
            cart_items: checkout.cart_items,
            checkout_url: checkout.checkout_url,
          }
        );

        // Update checkout status
        await (supabase as any)
          .from('abandoned_checkouts')
          .update({
            status: 'sequence_triggered',
            sequence_triggered_at: new Date().toISOString(),
            klaviyo_flow_id: checkout.klaviyo_flow_id,
          })
          .eq('id', checkout.checkout_id);

        // Update sequence stats - use raw SQL for increment
        await (supabase as any)
          .from('abandonment_sequences')
          .update({
            checkouts_triggered: checkout.sequence_checkouts_triggered + 1,
          })
          .eq('id', checkout.sequence_id);

        triggered++;
      } catch (error) {
        errors.push(`Checkout ${checkout.checkout_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log activity
    if (triggered > 0) {
      await (supabase as any).rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'abandonment_sequences_triggered',
        p_details: { triggered, errors: errors.length },
        p_executed: true,
        p_module: 'abandonment',
      });
    }

    return { triggered, errors };
  } catch (error) {
    console.error('Abandonment processing error:', error);
    return {
      triggered,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function recordAbandonedCheckout(
  userId: string,
  checkout: {
    shopifyCheckoutId: string;
    shopifyCheckoutToken?: string;
    email: string;
    customerId?: string;
    cartTotal: number;
    cartItems: CartItem[];
    checkoutUrl?: string;
    abandonedAt: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    // Check if lead exists
    const { data: lead } = await (supabase as any)
      .from('leads')
      .select('id')
      .eq('user_id', userId)
      .eq('email', checkout.email)
      .single();

    const { error } = await (supabase as any)
      .from('abandoned_checkouts')
      .upsert({
        user_id: userId,
        shopify_checkout_id: checkout.shopifyCheckoutId,
        shopify_checkout_token: checkout.shopifyCheckoutToken,
        email: checkout.email,
        customer_id: checkout.customerId,
        lead_id: lead?.id,
        cart_total: checkout.cartTotal,
        cart_items: checkout.cartItems,
        checkout_url: checkout.checkoutUrl,
        abandoned_at: checkout.abandonedAt,
        status: 'abandoned',
      }, {
        onConflict: 'user_id,shopify_checkout_id',
      });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Record abandoned checkout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function markCheckoutRecovered(
  userId: string,
  shopifyCheckoutId: string,
  orderId: string,
  orderTotal: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    const { data: checkout } = await (supabase as any)
      .from('abandoned_checkouts')
      .select('id, klaviyo_flow_id')
      .eq('user_id', userId)
      .eq('shopify_checkout_id', shopifyCheckoutId)
      .single();

    if (!checkout) {
      return { success: false, error: 'Checkout not found' };
    }

    // Update checkout
    await (supabase as any)
      .from('abandoned_checkouts')
      .update({
        status: 'recovered',
        recovered_at: new Date().toISOString(),
        recovered_order_id: orderId,
        recovered_order_total: orderTotal,
      })
      .eq('id', checkout.id);

    // Update sequence stats if triggered
    if (checkout.klaviyo_flow_id) {
      // Get current stats first
      const { data: sequence } = await (supabase as any)
        .from('abandonment_sequences')
        .select('checkouts_recovered, revenue_recovered')
        .eq('klaviyo_flow_id', checkout.klaviyo_flow_id)
        .single();

      if (sequence) {
        await (supabase as any)
          .from('abandonment_sequences')
          .update({
            checkouts_recovered: (sequence.checkouts_recovered || 0) + 1,
            revenue_recovered: (sequence.revenue_recovered || 0) + orderTotal,
          })
          .eq('klaviyo_flow_id', checkout.klaviyo_flow_id);
      }
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'checkout_recovered',
      p_details: {
        checkoutId: checkout.id,
        orderId,
        orderTotal,
        wasSequenceTriggered: !!checkout.klaviyo_flow_id,
      },
      p_executed: true,
      p_module: 'abandonment',
      p_reference_id: checkout.id,
      p_reference_table: 'abandoned_checkouts',
    });

    return { success: true };
  } catch (error) {
    console.error('Mark checkout recovered error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function triggerKlaviyoFlow(
  apiKey: string,
  flowId: string,
  email: string,
  properties: Record<string, unknown>
): Promise<void> {
  const response = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          profile: { email },
          metric: { name: 'Checkout Abandoned' },
          properties: {
            ...properties,
            flow_id: flowId,
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to trigger Klaviyo flow');
  }
}
