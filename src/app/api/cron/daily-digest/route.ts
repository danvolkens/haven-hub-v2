import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerDigestEmail } from '@/lib/trigger/client';
import type { Database } from '@/types/supabase';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();

  // Find users whose digest should be sent this hour
  // User's send_hour is in their timezone, so we need to check
  const result = await supabase
    .from('user_settings')
    .select('user_id, timezone, digest_preferences')
    .eq('digest_preferences->enabled', true);

  const users = result.data as Pick<UserSettings, 'user_id' | 'timezone' | 'digest_preferences'>[] | null;
  const error = result.error;

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  if (!users || users.length === 0) {
    return { success: true, data: { sent: 0, message: 'No users with digest enabled' } };
  }

  let queued = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const user of users) {
    const prefs = user.digest_preferences as { enabled: boolean; send_hour: number; frequency: string };

    // Calculate user's local hour
    const userDate = new Date().toLocaleString('en-US', { timeZone: user.timezone || 'America/New_York' });
    const userHour = new Date(userDate).getHours();

    // Check if this is the right hour for this user
    if (userHour !== prefs.send_hour) {
      continue;
    }

    // Check frequency
    const dayOfWeek = new Date().getDay();
    if (prefs.frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }
    if (prefs.frequency === 'weekly' && dayOfWeek !== 1) { // Monday only
      continue;
    }

    // Queue digest email
    await triggerDigestEmail({
      userId: user.user_id,
      date: today,
    });

    queued++;
  }

  return {
    success: true,
    data: {
      checked: users.length,
      queued,
    },
  };
});
