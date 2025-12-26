import { cronHandler } from '@/lib/cron/verify-cron';
import { runAggregationForAllUsers } from '@/lib/services/content-pillars';

/**
 * Weekly cron job to aggregate content pillar performance
 * Schedule: 0 9 * * 1 (9:00 AM UTC every Monday)
 *
 * This job:
 * 1. Aggregates weekly pillar performance for all users
 * 2. Aggregates monthly performance (first week of month)
 * 3. Generates new content mix recommendations
 */
export const GET = cronHandler(async () => {
  console.log('[Content Pillar Aggregation] Starting weekly aggregation...');

  const result = await runAggregationForAllUsers();

  if (result.errors.length > 0) {
    console.warn('[Content Pillar Aggregation] Errors:', result.errors);
  }

  console.log(
    `[Content Pillar Aggregation] Completed. Processed ${result.usersProcessed} users.`
  );

  return {
    success: result.success,
    data: {
      users_processed: result.usersProcessed,
      errors: result.errors.length,
      error_details: result.errors.slice(0, 5), // Limit error details in response
    },
  };
});
