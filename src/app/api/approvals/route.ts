import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

const querySchema = z.object({
  type: z.enum(['asset', 'mockup', 'pin', 'ugc', 'product']).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'skipped', 'processing']).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  format: z.enum(['pinterest', 'instagram_post', 'instagram_story']).optional(),
  quoteId: z.string().uuid().optional(),
  flagged: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(500).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { type, status, collection, format, quoteId, flagged, limit, offset } = querySchema.parse(searchParams);

    let query = (supabase as any)
      .from('approval_items')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', status || 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: status === 'approved' ? false : true })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    if (collection) {
      query = query.eq('collection', collection);
    }

    if (format) {
      // Filter by format stored in payload.format
      query = query.filter('payload->>format', 'eq', format);
    }

    if (quoteId) {
      // Filter by quoteId stored in payload.quoteId or payload.quote_id
      query = query.or(`payload->>quoteId.eq.${quoteId},payload->>quote_id.eq.${quoteId}`);
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
