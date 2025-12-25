import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { PinterestClient } from '@/lib/integrations/pinterest/client';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const adminClient = getAdminClient();
    const supabase = await createServerSupabaseClient();

    // Get Pinterest access token from vault first
    let accessToken: string | null = null;

    try {
      const { data } = await (adminClient as any).rpc('get_credential', {
        p_user_id: userId,
        p_provider: 'pinterest',
        p_credential_type: 'access_token',
      });
      accessToken = data;
    } catch (err) {
      console.log('Vault not available for Pinterest token');
    }

    // Fallback to integration metadata (for local dev when vault is unavailable)
    if (!accessToken) {
      const { data: integration } = await (supabase as any)
        .from('integrations')
        .select('metadata')
        .eq('user_id', userId)
        .eq('provider', 'pinterest')
        .single();

      if (integration?.metadata?._access_token) {
        accessToken = integration.metadata._access_token;
        console.log('Using access token from integration metadata fallback');
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Pinterest not connected. Please reconnect your Pinterest account.' },
        { status: 400 }
      );
    }

    // Fetch ad accounts from Pinterest
    const client = new PinterestClient({ accessToken });
    const { items: adAccounts } = await client.getAdAccounts();

    return NextResponse.json({
      ad_accounts: adAccounts || [],
    });
  } catch (error) {
    console.error('Pinterest ad accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad accounts', ad_accounts: [] },
      { status: 200 } // Return 200 with empty array to avoid breaking UI
    );
  }
}
