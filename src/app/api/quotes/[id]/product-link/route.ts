import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getApiUserId();
    const { id: quoteId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get user's shop URL
    const { data: userSettings } = await (supabase as any)
      .from('user_settings')
      .select('shop_url')
      .eq('user_id', userId)
      .single();

    const shopUrl = userSettings?.shop_url || 'https://havenandhold.com';

    // Find product linked to this quote
    const { data: product } = await (supabase as any)
      .from('products')
      .select('id, shopify_handle, shopify_product_id')
      .eq('user_id', userId)
      .eq('quote_id', quoteId)
      .single();

    if (product?.shopify_handle) {
      const productLink = `${shopUrl.replace(/\/$/, '')}/products/${product.shopify_handle}`;
      return NextResponse.json({
        productLink,
        productId: product.id,
        shopifyHandle: product.shopify_handle,
      });
    }

    // No product found
    return NextResponse.json({ productLink: null });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching product link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
