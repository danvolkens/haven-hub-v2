import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const { data: product, error } = await (supabase as any)
      .from('products')
      .select(`
        *,
        variants:product_variants(*),
        images:product_images(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
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
    const { id } = await params;
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // Only allow updating certain fields
    const allowedFields = ['title', 'description', 'collection', 'tags', 'status'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: product, error } = await (supabase as any)
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const { error } = await (supabase as any)
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
