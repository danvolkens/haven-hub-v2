import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { importProductsFromShopify } from '@/lib/integrations/shopify/product-sync';

export async function POST() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    // Get integration
    const { data: integration, error: integrationError } = await (supabase as any)
      .from('integrations')
      .select('metadata, status')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .single();

    if (integrationError || !integration || integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 400 }
      );
    }

    // Get access token from vault
    const { data: accessToken } = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'shopify',
      p_credential_type: 'access_token',
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token not found' },
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
