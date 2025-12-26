import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { importOrdersFromShopify, getOrderImportStatus } from '@/lib/integrations/shopify/order-import';

export async function GET() {
  try {
    const userId = await getApiUserId();

    const status = await getOrderImportStatus(userId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Order status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    // Parse options from body
    const body = await request.json().catch(() => ({}));
    const since = body.since ? new Date(body.since) : undefined;
    const limit = body.limit ? parseInt(body.limit, 10) : undefined;

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

    // Import orders
    const result = await importOrdersFromShopify(
      userId,
      accessToken,
      integration.metadata.shop_domain,
      { since, limit }
    );

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Order sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
