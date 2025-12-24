import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

interface RetryItem {
  id: string;
  attempts: number;
  max_attempts: number;
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();
  const workerId = `cron-${Date.now()}`;

  // Claim items for processing using database function
  // Use 'as any' to avoid TypeScript inference issues with rpc functions
  const { data: items, error } = await (supabase as any).rpc('claim_retry_items', {
    p_worker_id: workerId,
    p_limit: 10,
  });

  if (error) {
    throw new Error(`Failed to claim retry items: ${error.message}`);
  }

  if (!items || items.length === 0) {
    return { success: true, data: { processed: 0, message: 'No items to retry' } };
  }

  let succeeded = 0;
  let failed = 0;

  for (const item of items as RetryItem[]) {
    try {
      // Process based on operation type (implementation in Phase 6)
      // For now, just mark as resolved for testing

      await (supabase
        .from('retry_queue') as any)
        .update({
          status: 'resolved',
          worker_id: null,
        })
        .eq('id', item.id);

      succeeded++;
    } catch (err) {
      console.error(`Retry failed for item ${item.id}:`, err);

      // Calculate next retry time with exponential backoff
      const nextAttempt = item.attempts + 1;
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      const delay = Math.min(baseDelay * Math.pow(2, nextAttempt), maxDelay);
      const nextRetryAt = new Date(Date.now() + delay).toISOString();

      if (nextAttempt >= item.max_attempts) {
        // Mark as permanently failed
        await (supabase
          .from('retry_queue') as any)
          .update({
            status: 'failed',
            last_error: err instanceof Error ? err.message : 'Unknown error',
            worker_id: null,
          })
          .eq('id', item.id);

        // Send failure notification if 3+ attempts (per spec)
        if (nextAttempt >= 3) {
          // TODO: Send email notification
        }
      } else {
        // Schedule next retry
        await (supabase
          .from('retry_queue') as any)
          .update({
            status: 'pending',
            last_error: err instanceof Error ? err.message : 'Unknown error',
            next_retry_at: nextRetryAt,
            worker_id: null,
          })
          .eq('id', item.id);
      }

      failed++;
    }
  }

  return {
    success: true,
    data: {
      processed: items.length,
      succeeded,
      failed,
    },
  };
});
