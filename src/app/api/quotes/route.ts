import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

const createQuoteSchema = z.object({
  text: z.string().min(1).max(500),
  attribution: z.string().max(100).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']),
  mood: z.enum(['calm', 'warm', 'hopeful', 'reflective', 'empowering']),
  temporal_tags: z.array(z.string()).default([]),
});

const querySchema = z.object({
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  mood: z.enum(['calm', 'warm', 'hopeful', 'reflective', 'empowering']).optional(),
  status: z.enum(['active', 'archived', 'generating']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(['created_at', 'updated_at', 'total_impressions']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { collection, mood, status, search, limit, offset, sort, order } = querySchema.parse(searchParams);

    let query = (supabase as any)
      .from('quotes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (collection) {
      query = query.eq('collection', collection);
    }

    if (mood) {
      query = query.eq('mood', mood);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'archived'); // Default: hide archived
    }

    if (search) {
      query = query.textSearch('text', search, { type: 'websearch' });
    }

    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      quotes: data,
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
    const body = await request.json();

    const validated = createQuoteSchema.parse(body);

    const { data, error } = await (supabase as any)
      .from('quotes')
      .insert({
        user_id: userId,
        ...validated,
        imported_from: 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('Quote creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Quote created successfully:', { id: data?.id, userId });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
