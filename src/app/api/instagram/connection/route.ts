import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/instagram/connection - Get Instagram connection status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get connection from integrations table
    const { data: connection, error } = await (supabase as any)
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'instagram')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching Instagram connection:', error);
      return NextResponse.json({ error: 'Failed to fetch connection' }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({
        status: 'disconnected',
      });
    }

    return NextResponse.json({
      status: connection.status === 'connected' ? 'connected' : 'disconnected',
      account_name: connection.metadata?.account_name || connection.metadata?.username,
      account_id: connection.metadata?.account_id || connection.metadata?.ig_user_id,
      profile_picture_url: connection.metadata?.profile_picture_url,
      followers_count: connection.metadata?.followers_count,
      connected_at: connection.created_at,
      token_expires_at: connection.token_expires_at,
      last_error: connection.last_error,
    });
  } catch (error) {
    console.error('Error in connection API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
