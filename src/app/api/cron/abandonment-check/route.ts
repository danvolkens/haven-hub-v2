import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

// Type for abandoned_checkouts table (matches schema)
interface AbandonedCheckout {
  id: string;
  user_id: string;
  shopify_checkout_id: string;
  email: string;
  customer_id: string | null;
  lead_id: string | null;
  cart_total: number;
  cart_items: unknown[];
  checkout_url: string | null;
  abandoned_at: string;
  status: 'abandoned' | 'sequence_triggered' | 'recovered' | 'expired';
  sequence_triggered_at: string | null;
  klaviyo_flow_id: string | null;
  recovered_at: string | null;
  recovered_order_id: string | null;
  recovered_order_total: number | null;
  created_at: string;
  updated_at: string;
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Find abandoned checkouts older than the configured window (default: 1 hour)
  // that haven't been processed yet
  const windowHours = 1; // Will be configurable per user
  const cutoffTime = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  // Use 'as any' cast since abandoned_checkouts not yet in generated types
  const { data: checkouts, error } = await (supabase as any)
    .from('abandoned_checkouts')
    .select('id, user_id, shopify_checkout_id, email, cart_total, cart_items, checkout_url, abandoned_at, status')
    .eq('status', 'abandoned')
    .lt('abandoned_at', cutoffTime)
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch abandoned checkouts: ${error.message}`);
  }

  if (!checkouts || checkouts.length === 0) {
    return { success: true, data: { processed: 0, message: 'No abandoned checkouts' } };
  }

  let triggered = 0;

  for (const checkout of checkouts as AbandonedCheckout[]) {
    const checkoutId = checkout.id;
    try {
      // Mark as processing and set trigger timestamp
      const { error: updateError } = await (supabase as any)
        .from('abandoned_checkouts')
        .update({
          status: 'sequence_triggered',
          sequence_triggered_at: new Date().toISOString()
        })
        .eq('id', checkoutId);

      if (updateError) throw updateError;

      // Trigger Klaviyo sequence (implementation in Phase 16)
      // For now, just log
      console.log(`Would trigger abandonment sequence for checkout ${checkout.id}`);

      triggered++;
    } catch (err) {
      console.error(`Failed to process checkout ${checkout.id}:`, err);
    }
  }

  return {
    success: true,
    data: {
      checked: checkouts.length,
      triggered,
    },
  };
});
