import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { triggerPinterestAnalyticsSync } from '@/lib/trigger/client';

// Runs daily at 6 AM UTC to sync Pinterest pin analytics
export const GET = cronHandler(async (_request: NextRequest) => {
  const handle = await triggerPinterestAnalyticsSync();

  return {
    success: true,
    data: {
      taskId: handle.id,
      message: 'Pinterest analytics sync triggered',
    },
  };
});
