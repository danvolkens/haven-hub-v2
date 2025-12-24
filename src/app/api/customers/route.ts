import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const querySchema = z.object({
  stage: z.string().optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { stage, collection, search, limit, offset } = querySchema.parse(searchParams);

    let query = (supabase as any)
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('lifetime_value', { ascending: false })
      .range(offset, offset + limit - 1);

    if (stage) {
      query = query.eq('stage', stage);
    }

    if (collection) {
      query = query.eq('primary_collection', collection);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      customers: data,
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
