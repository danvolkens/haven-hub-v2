import { cronHandler } from '@/lib/cron/verify-cron';
import {
  getTestsForSignificanceCheck,
  calculateSignificance,
  declareWinner,
} from '@/lib/services/ab-testing';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Cron job to check running A/B tests for statistical significance
 * Runs every 6 hours to evaluate test results and auto-declare winners
 */
export const GET = cronHandler(async () => {
  const supabase = getAdminClient();

  // Get all running tests
  const tests = await getTestsForSignificanceCheck();

  if (tests.length === 0) {
    return {
      success: true,
      data: {
        message: 'No running tests to check',
        tests_checked: 0,
      },
    };
  }

  let testsChecked = 0;
  let testsSignificant = 0;
  let testsAutoDeclared = 0;
  const errors: string[] = [];

  for (const test of tests) {
    try {
      testsChecked++;

      // Calculate significance
      const { success, result, error } = await calculateSignificance(test.id);

      if (!success || !result) {
        if (error) errors.push(`Test ${test.id}: ${error}`);
        continue;
      }

      // Check if we should auto-declare a winner
      const shouldAutoDeclare =
        result.is_significant &&
        result.sample_size_met &&
        result.confidence >= test.confidence_threshold;

      if (shouldAutoDeclare) {
        testsSignificant++;

        // Get the winning variant ID
        const winnerVariantId =
          result.winner === 'control'
            ? test.control_variant_id
            : test.test_variant_ids[0];

        // Declare the winner
        const declareResult = await declareWinner(
          test.user_id,
          test.id,
          winnerVariantId,
          result.confidence
        );

        if (declareResult.success) {
          testsAutoDeclared++;

          // Create activity log entry
          await (supabase as any).from('activity_log').insert({
            user_id: test.user_id,
            action: 'ab_test_winner_declared',
            entity_type: 'ab_test',
            entity_id: test.id,
            details: {
              test_name: test.name,
              winner: result.winner,
              confidence: result.confidence,
              lift: result.lift,
              auto_declared: true,
            },
          });
        } else {
          errors.push(`Test ${test.id}: Failed to declare winner`);
        }
      }

      // Check if scheduled end date has passed
      if (test.scheduled_end_at) {
        const endDate = new Date(test.scheduled_end_at);
        if (endDate <= new Date()) {
          // Test has reached its scheduled end - complete it even without significance
          if (!shouldAutoDeclare) {
            // Update status to completed without a winner
            await (supabase as any)
              .from('ab_tests')
              .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
                results_summary: {
                  ended_reason: 'scheduled_end_reached',
                  significance_achieved: result.is_significant,
                  final_confidence: result.confidence,
                },
              })
              .eq('id', test.id);

            // Log the completion
            await (supabase as any).from('activity_log').insert({
              user_id: test.user_id,
              action: 'ab_test_ended',
              entity_type: 'ab_test',
              entity_id: test.id,
              details: {
                test_name: test.name,
                reason: 'scheduled_end_reached',
                significance_achieved: result.is_significant,
              },
            });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Test ${test.id}: ${message}`);
    }
  }

  return {
    success: errors.length === 0,
    data: {
      tests_checked: testsChecked,
      tests_significant: testsSignificant,
      tests_auto_declared: testsAutoDeclared,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    },
  };
});
