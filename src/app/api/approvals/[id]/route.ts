import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidate, cacheKey, CACHE_PREFIX } from '@/lib/cache/cache-utils';

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
    const userId = await getUserId();
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
    const userId = await getUserId();
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

    // TODO: Trigger downstream actions based on approval
    // - If asset approved: queue for mockup generation
    // - If pin approved: queue for scheduling
    // - If product approved: publish to Shopify

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
