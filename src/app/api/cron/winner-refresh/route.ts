import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerWinnerRefresh } from '@/lib/trigger/client';

interface UserSetting {
  user_id: string;
  global_mode: string;
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Get all users with autopilot mode for winner refresh
  // Use 'as any' to avoid TypeScript inference issues
  const { data: users, error } = await (supabase
    .from('user_settings') as any)
    .select('user_id, global_mode')
    .in('global_mode', ['assisted', 'autopilot']);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  let queued = 0;

  for (const user of (users || []) as UserSetting[]) {
    await triggerWinnerRefresh({ userId: user.user_id });
    queued++;
  }

  return {
    success: true,
    data: {
      usersQueued: queued,
    },
  };
});
