import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { sendAllPendingEvents } from '@/lib/integrations/pinterest/conversion-api';

// Runs every 5 minutes to batch send Pinterest conversion events
export const GET = cronHandler(async (_request: NextRequest) => {
  const result = await sendAllPendingEvents();

  return {
    success: true,
    data: {
      usersProcessed: result.usersProcessed,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      errors: result.errors.slice(0, 10), // Limit errors in response
    },
  };
});
