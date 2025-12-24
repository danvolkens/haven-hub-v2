import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { createProduct } from '@/lib/products/product-service';

const querySchema = z.object({
  status: z.string().optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  quoteId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(z.object({
    size: z.string(),
    frame_style: z.string().optional(),
    price: z.number().positive(),
    is_digital: z.boolean().optional(),
  })).min(1),
  imageIds: z.array(z.string().uuid()).optional(),
  publishImmediately: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, collection, search, limit, offset } = querySchema.parse(searchParams);

    let query = (supabase as any)
      .from('products')
      .select(`
        *,
        variants:product_variants(*),
        images:product_images(*)
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

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      products: data,
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
    const userId = await getApiUserId();
    const body = await request.json();

    const data = createSchema.parse(body);
    const result = await createProduct(userId, data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      product: result.product,
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
