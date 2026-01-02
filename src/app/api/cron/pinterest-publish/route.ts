import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { publishPin } from '@/lib/pinterest/pin-service';

/**
 * Fallback cron job to publish scheduled pins.
 * Runs every 15 minutes to catch any pins that weren't published by Trigger.dev.
 * Trigger.dev handles exact-time scheduling, but this ensures nothing slips through.
 */
export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();
  const now = new Date().toISOString();

  // Find scheduled pins that are due for publishing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: duePins, error } = await (supabase as any)
    .from('pins')
    .select('id, user_id, title')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(50); // Process in batches to avoid timeout

  if (error) {
    throw new Error(`Failed to fetch scheduled pins: ${error.message}`);
  }

  if (!duePins || duePins.length === 0) {
    return { success: true, data: { published: 0, message: 'No pins due for publishing' } };
  }

  let published = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const pin of duePins) {
    try {
      const result = await publishPin(pin.user_id, pin.id);
      if (result.success) {
        published++;
      } else {
        failed++;
        errors.push(`Pin ${pin.id}: ${result.error}`);
      }
    } catch (err) {
      failed++;
      errors.push(`Pin ${pin.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return {
    success: true,
    data: {
      checked: duePins.length,
      published,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Return first 5 errors
    },
  };
});
