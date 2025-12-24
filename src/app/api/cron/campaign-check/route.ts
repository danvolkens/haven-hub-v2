import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

export const GET = cronHandler(async (request: NextRequest) => {
  const supabase = getAdminClient();

  const now = new Date().toISOString();

  // Auto-end campaigns that have passed their end date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: expiredCampaigns, error } = await (supabase
    .from('campaigns') as any)
    .update({ status: 'completed', ended_at: now })
    .eq('status', 'active')
    .lt('end_date', now)
    .select('id');

  if (error) {
    throw new Error(`Failed to update campaigns: ${error.message}`);
  }

  return {
    success: true,
    data: {
      ended: expiredCampaigns?.length || 0,
    },
  };
});
