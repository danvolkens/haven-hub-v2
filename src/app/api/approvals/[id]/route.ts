import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { invalidate, cacheKey, CACHE_PREFIX } from '@/lib/cache/cache-utils';
import { triggerAutoMockupQueue } from '@/lib/trigger/client';

const actionSchema = z.object({
  action: z.enum(['approve', 'reject', 'skip']),
  reason: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
    const { id } = await params;

    const { data, error } = await (supabase as any)
      .from('approval_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
    const { id } = await params;
    const body = await request.json();

    const { action, reason } = actionSchema.parse(body);

    // Map action to status
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      skip: 'skipped',
    };

    const { data, error } = await (supabase as any)
      .from('approval_items')
      .update({
        status: statusMap[action],
        processed_at: new Date().toISOString(),
        processed_by: 'user',
        rejection_reason: action === 'reject' ? reason : null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Item not found or already processed' },
        { status: 404 }
      );
    }

    // Invalidate counts cache
    await invalidate(cacheKey(CACHE_PREFIX.APPROVAL_COUNTS, userId));

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: action === 'approve' ? `${data.type}_approved` : `${data.type}_rejected`,
      p_details: { itemId: id, reason },
      p_executed: true,
      p_module: data.type,
      p_reference_id: data.reference_id,
      p_reference_table: data.reference_table,
    });

    // Trigger downstream actions based on approval
    if (action === 'approve') {
      // If asset approved: queue for auto mockup generation
      if (data.type === 'asset' && data.reference_id) {
        // Update the asset status to approved
        await (supabase as any)
          .from('assets')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          .eq('id', data.reference_id)
          .eq('user_id', userId);

        // Trigger auto-mockup generation (will check settings internally)
        try {
          await triggerAutoMockupQueue({
            userId,
            assetIds: [data.reference_id],
            quoteId: data.payload?.quoteId,
            source: 'asset_approval',
          });
        } catch (err) {
          // Don't fail the approval if auto-mockup fails
          console.error('Auto-mockup trigger failed:', err);
        }
      }

      // If mockup approved: update mockup status
      if (data.type === 'mockup' && data.reference_id) {
        await (supabase as any)
          .from('mockups')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.reference_id)
          .eq('user_id', userId);
      }
    }

    return NextResponse.json({ success: true, item: data });
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
