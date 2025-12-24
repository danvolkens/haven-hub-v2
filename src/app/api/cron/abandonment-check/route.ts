import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

// Type for abandoned_checkouts table (not yet in generated types)
interface AbandonedCheckout {
  id: string;
  user_id: string;
  shopify_checkout_id: string;
  customer_email: string | null;
  order_id: string | null;
  status: string;
  checkout_data: Record<string, unknown>;
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
    .select('id, user_id, shopify_checkout_id, customer_email, order_id, status, checkout_data, created_at, updated_at')
    .eq('status', 'pending')
    .lt('created_at', cutoffTime)
    .is('order_id', null)
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
      // Mark as processing - use 'as any' to avoid TypeScript inference issues
      const { error: updateError } = await (supabase as any)
        .from('abandoned_checkouts')
        .update({ status: 'sequence_triggered' })
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
