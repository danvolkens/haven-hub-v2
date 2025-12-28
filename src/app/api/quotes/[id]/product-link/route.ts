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

    // First check if quote has direct product_link or product_id
    const { data: quote } = await (supabase as any)
      .from('quotes')
      .select('product_link, product_id')
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();

    // Priority 1: Direct product_link URL on quote
    if (quote?.product_link) {
      return NextResponse.json({
        productLink: quote.product_link,
        source: 'quote.product_link',
      });
    }

    // Priority 2: Quote's product_id -> lookup product
    if (quote?.product_id) {
      const { data: linkedProduct } = await (supabase as any)
        .from('products')
        .select('id, shopify_handle')
        .eq('id', quote.product_id)
        .eq('user_id', userId)
        .single();

      if (linkedProduct?.shopify_handle) {
        const productLink = `${shopUrl.replace(/\/$/, '')}/products/${linkedProduct.shopify_handle}`;
        return NextResponse.json({
          productLink,
          productId: linkedProduct.id,
          shopifyHandle: linkedProduct.shopify_handle,
          source: 'quote.product_id',
        });
      }
    }

    // Priority 3: Find product with quote_id pointing to this quote
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
        source: 'products.quote_id',
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
