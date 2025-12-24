import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const retireSchema = z.object({
  reason: z.enum(['underperformer', 'manual', 'seasonal']).default('manual'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { reason } = retireSchema.parse(body);

    // Update local product
    const { data: product, error } = await (supabase as any)
      .from('products')
      .update({
        status: 'retired',
        retired_at: new Date().toISOString(),
        retire_reason: reason,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Update Shopify product status to archived

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'product_retired',
      p_details: { productId: id, reason },
      p_executed: true,
      p_module: 'products',
      p_reference_id: id,
      p_reference_table: 'products',
    });

    return NextResponse.json({
      success: true,
      product,
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
