import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

const updateSchema = z.object({
  collection: z.enum(['grounding', 'wholeness', 'growth']).nullable().optional(),
  is_primary: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();

    const { data, error } = await (supabase as any)
      .from('pinterest_boards')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ boards: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
    const body = await request.json();

    const { boardId, ...updates } = body;
    const validatedUpdates = updateSchema.parse(updates);

    // If setting as primary, unset other primaries in same collection
    if (validatedUpdates.is_primary && validatedUpdates.collection) {
      await (supabase as any)
        .from('pinterest_boards')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('collection', validatedUpdates.collection);
    }

    const { data, error } = await (supabase as any)
      .from('pinterest_boards')
      .update(validatedUpdates)
      .eq('id', boardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ board: data });
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
