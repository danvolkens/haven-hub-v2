import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';

interface Pin {
  id: string;
  status: string;
  scheduled_time: string;
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Get all scheduled pins ready to publish
  const now = new Date().toISOString();

  // Use 'as any' to avoid TypeScript inference issues
  const { data: pins, error } = await (supabase
    .from('pins') as any)
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_time', now)
    .order('scheduled_time', { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch scheduled pins: ${error.message}`);
  }

  if (!pins || pins.length === 0) {
    return { success: true, data: { published: 0, message: 'No pins to publish' } };
  }

  // Process pins (implementation will be completed in Phase 12)
  let published = 0;
  let failed = 0;

  for (const pin of pins as Pin[]) {
    try {
      // Mark as publishing
      await (supabase
        .from('pins') as any)
        .update({ status: 'publishing' })
        .eq('id', pin.id);

      // Publish to Pinterest (implementation in Phase 12)
      // For now, just mark as published for testing

      await (supabase
        .from('pins') as any)
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', pin.id);

      published++;
    } catch (err) {
      console.error(`Failed to publish pin ${pin.id}:`, err);

      await (supabase
        .from('pins') as any)
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        })
        .eq('id', pin.id);

      failed++;
    }
  }

  return {
    success: true,
    data: {
      processed: pins.length,
      published,
      failed,
    },
  };
});
