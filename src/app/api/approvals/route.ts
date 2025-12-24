import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

const querySchema = z.object({
  type: z.enum(['asset', 'mockup', 'pin', 'ugc', 'product']).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  flagged: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { type, collection, flagged, limit, offset } = querySchema.parse(searchParams);

    let query = (supabase as any)
      .from('approval_items')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    if (collection) {
      query = query.eq('collection', collection);
    }

    if (flagged) {
      query = query.not('flags', 'eq', '{}');
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
