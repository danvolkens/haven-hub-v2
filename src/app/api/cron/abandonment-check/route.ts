import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

type AbandonedCheckout = Database['public']['Tables']['abandoned_checkouts']['Row'];

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Find abandoned checkouts older than the configured window (default: 1 hour)
  // that haven't been processed yet
  const windowHours = 1; // Will be configurable per user
  const cutoffTime = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  // Use raw query to avoid TypeScript inference issues with .is()
  const { data: checkouts, error } = await supabase
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
      const { error: updateError } = await (supabase
        .from('abandoned_checkouts') as any)
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
