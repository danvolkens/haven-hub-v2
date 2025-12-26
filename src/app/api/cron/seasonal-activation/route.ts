import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import {
  getActiveSeasons,
  processAllUsersSeasonalActivation,
} from '@/lib/seasonal/seasonal-service';

// Runs daily to check seasonal content activations
export const GET = cronHandler(async (_request: NextRequest) => {
  const today = new Date();
  const activeSeasons = getActiveSeasons(today);

  // Process all users
  const results = await processAllUsersSeasonalActivation(today);

  return {
    success: true,
    data: {
      date: today.toISOString().split('T')[0],
      activeSeasons: activeSeasons.map(s => ({
        id: s.id,
        name: s.name,
        tags: s.tags,
      })),
      usersProcessed: results.usersProcessed,
      pinsActivated: results.totalPinsActivated,
      pinsDeactivated: results.totalPinsDeactivated,
      campaignsActivated: results.totalCampaignsActivated,
      campaignsPaused: results.totalCampaignsPaused,
      approvalsCreated: results.totalApprovalsCreated,
      errors: results.errors.slice(0, 10), // Limit errors in response
    },
  };
});
