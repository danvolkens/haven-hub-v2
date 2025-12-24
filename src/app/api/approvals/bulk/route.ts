import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidate, cacheKey, CACHE_PREFIX } from '@/lib/cache/cache-utils';

const bulkActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  itemIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();

    const { action, itemIds, reason } = bulkActionSchema.parse(body);

    let count: number;

    if (action === 'approve') {
      const { data } = await (supabase as any).rpc('bulk_approve_items', {
        p_user_id: userId,
        p_item_ids: itemIds,
      });
      count = data || 0;
    } else {
      const { data } = await (supabase as any).rpc('bulk_reject_items', {
        p_user_id: userId,
        p_item_ids: itemIds,
        p_reason: reason,
      });
      count = data || 0;
    }

    // Invalidate counts cache
    await invalidate(cacheKey(CACHE_PREFIX.APPROVAL_COUNTS, userId));

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: `bulk_${action}`,
      p_details: { count, itemIds, reason },
      p_executed: true,
      p_module: 'approval_queue',
    });

    return NextResponse.json({
      success: true,
      processed: count,
      action,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
