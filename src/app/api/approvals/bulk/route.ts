import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { invalidate, cacheKey, CACHE_PREFIX } from '@/lib/cache/cache-utils';
import { triggerAutoMockupQueue } from '@/lib/trigger/client';

const bulkActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  itemIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
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

    // Trigger auto-mockup generation for approved assets
    if (action === 'approve') {
      // Get the approved items to find asset reference IDs
      const { data: approvedItems } = await (supabase as any)
        .from('approval_items')
        .select('type, reference_id, payload')
        .in('id', itemIds)
        .eq('type', 'asset');

      if (approvedItems && approvedItems.length > 0) {
        const assetIds = approvedItems.map((item: any) => item.reference_id);

        // Update asset statuses to approved
        await (supabase as any)
          .from('assets')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          .in('id', assetIds)
          .eq('user_id', userId);

        // Trigger auto-mockup generation (will check settings internally)
        try {
          await triggerAutoMockupQueue({
            userId,
            assetIds,
            source: 'asset_approval',
          });
        } catch (err) {
          console.error('Auto-mockup trigger failed:', err);
        }
      }

      // Update mockup statuses to approved
      const { data: approvedMockups } = await (supabase as any)
        .from('approval_items')
        .select('reference_id')
        .in('id', itemIds)
        .eq('type', 'mockup');

      if (approvedMockups && approvedMockups.length > 0) {
        const mockupIds = approvedMockups.map((item: any) => item.reference_id);
        await (supabase as any)
          .from('mockups')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .in('id', mockupIds)
          .eq('user_id', userId);
      }
    }

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
