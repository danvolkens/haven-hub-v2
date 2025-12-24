import { NextRequest } from 'next/server';
import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { triggerExportGenerator } from '@/lib/trigger/client';

interface ScheduledExport {
  id: string;
  user_id: string;
  export_type: string;
  format: 'csv' | 'json';
  date_range_type: string;
  frequency: string;
  field_selection: string[];
}

export const GET = cronHandler(async (_request: NextRequest) => {
  const supabase = getAdminClient();
  const now = new Date().toISOString();

  // Find scheduled exports due to run
  // Use 'as any' to avoid TypeScript inference issues
  const { data: exports, error } = await (supabase
    .from('scheduled_exports') as any)
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', now);

  if (error) {
    throw new Error(`Failed to fetch scheduled exports: ${error.message}`);
  }

  let triggered = 0;

  for (const exp of (exports || []) as ScheduledExport[]) {
    try {
      // Calculate date range based on type
      let dateRange: { start: string; end: string } | undefined;

      if (exp.date_range_type === 'last_week') {
        const end = new Date();
        const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateRange = {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      } else if (exp.date_range_type === 'last_month') {
        const end = new Date();
        const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateRange = {
          start: start.toISOString(),
          end: end.toISOString(),
        };
      }

      // Trigger export
      await triggerExportGenerator({
        userId: exp.user_id,
        exportType: exp.export_type,
        format: exp.format,
        dateRange,
        fields: exp.field_selection,
      });

      // Calculate next run time
      let nextRun: Date;
      if (exp.frequency === 'weekly') {
        nextRun = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else {
        nextRun = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      // Update scheduled export
      await (supabase
        .from('scheduled_exports') as any)
        .update({
          last_run_at: now,
          next_run_at: nextRun.toISOString(),
        })
        .eq('id', exp.id);

      triggered++;
    } catch (err) {
      console.error(`Failed to trigger export ${exp.id}:`, err);
    }
  }

  return {
    success: true,
    data: {
      checked: exports?.length || 0,
      triggered,
    },
  };
});
