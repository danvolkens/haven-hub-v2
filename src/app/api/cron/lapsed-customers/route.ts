import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { WINBACK_TIERS } from '@/lib/constants';

interface LapsedCustomer {
  id: string;
  email: string;
  last_order_at: string;
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  const now = new Date();
  const results = {
    tier1: 0,
    tier2: 0,
    tier3: 0,
  };

  // Check each tier
  for (const [tier, days] of Object.entries(WINBACK_TIERS)) {
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    // Find customers whose last order was exactly {days} ago (within 24h window)
    const windowStart = new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000).toISOString();

    // Use 'as any' to avoid TypeScript inference issues with dynamic column names
    const { data: customers, error } = await (supabase
      .from('customers') as any)
      .select('id, email, last_order_at')
      .lt('last_order_at', cutoffDate)
      .gte('last_order_at', windowStart)
      .is(`winback_${tier}_sent_at`, null)
      .limit(100);

    if (error) {
      console.error(`Failed to fetch ${tier} customers:`, error);
      continue;
    }

    for (const customer of (customers || []) as LapsedCustomer[]) {
      try {
        // Mark win-back as sent
        await (supabase
          .from('customers') as any)
          .update({ [`winback_${tier}_sent_at`]: now.toISOString() })
          .eq('id', customer.id);

        // Trigger Klaviyo win-back sequence (implementation in Phase 18)
        console.log(`Would trigger ${tier} win-back for customer ${customer.id}`);

        results[tier as keyof typeof results]++;
      } catch (err) {
        console.error(`Failed to process customer ${customer.id}:`, err);
      }
    }
  }

  return {
    success: true,
    data: {
      triggered: results,
      total: results.tier1 + results.tier2 + results.tier3,
    },
  };
});
