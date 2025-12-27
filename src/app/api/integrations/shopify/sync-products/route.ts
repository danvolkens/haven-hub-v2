import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { importProductsFromShopify } from '@/lib/integrations/shopify/product-sync';
import { getCredential } from '@/lib/integrations/credentials';

export async function POST() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get integration
    const { data: integration, error: integrationError } = await (supabase as any)
      .from('integrations')
      .select('metadata, status')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .single();

    if (integrationError || !integration || integration.status !== 'connected') {
      console.error('Shopify integration check failed:', { integrationError, status: integration?.status });
      return NextResponse.json(
        { error: 'Shopify not connected', details: integrationError?.message },
        { status: 400 }
      );
    }

    // Get access token (tries Vault first, falls back to metadata)
    const accessToken = await getCredential(userId, 'shopify', 'access_token');

    if (!accessToken) {
      console.error('Shopify access token not found for user:', userId);
      return NextResponse.json(
        { error: 'Access token not found. Please reconnect Shopify.' },
        { status: 400 }
      );
    }

    // Import products
    const result = await importProductsFromShopify(
      userId,
      accessToken,
      integration.metadata.shop_domain
    );

    return NextResponse.json({
      success: true,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Product sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
