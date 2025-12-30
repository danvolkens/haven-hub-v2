import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

const querySchema = z.object({
  scene: z.string().optional(),
  status: z.string().optional(),
  assetId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  format: z.enum(['pinterest', 'instagram_post', 'instagram_story']).optional(),
  limit: z.coerce.number().min(1).max(500).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { scene, status, assetId, quoteId, collection, format, limit, offset } = querySchema.parse(searchParams);

    let query = (supabase as any)
      .from('mockups')
      .select(`
        *,
        assets!inner (
          id,
          file_url,
          format,
          quote_id,
          quotes (
            id,
            text,
            collection,
            mood
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scene) {
      query = query.eq('scene', scene);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    // Filter by quoteId through the assets relation
    if (quoteId) {
      query = query.eq('assets.quote_id', quoteId);
    }

    // Filter by collection through assets -> quotes relation
    if (collection) {
      query = query.eq('assets.quotes.collection', collection);
    }

    // Filter by format through assets relation
    if (format) {
      query = query.eq('assets.format', format);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      mockups: data,
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
