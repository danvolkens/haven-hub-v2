import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { createPin } from '@/lib/pinterest/pin-service';

const querySchema = z.object({
  status: z.string().optional(),
  collection: z.string().optional(),
  boardId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  assetId: z.string().uuid().optional(),
  mockupId: z.string().uuid().optional(),
  boardId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  link: z.string().url().optional(),
  scheduledFor: z.string().datetime().optional(),
  copyTemplateId: z.string().uuid().optional(),
}).refine((data) => data.assetId || data.mockupId, {
  message: 'Either assetId or mockupId is required',
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, collection, boardId, limit, offset } = querySchema.parse(searchParams);

    let query = (supabase as any)
      .from('pins')
      .select(`
        *,
        board:pinterest_boards(id, name, collection),
        asset:assets(id, file_url, thumbnail_url),
        mockup:mockups(id, file_url, thumbnail_url)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (collection) {
      query = query.eq('collection', collection);
    }

    if (boardId) {
      query = query.eq('board_id', boardId);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      pins: data,
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
    const userId = await getUserId();
    const body = await request.json();

    const data = createSchema.parse(body);
    const result = await createPin(userId, data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      pin: result.pin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
