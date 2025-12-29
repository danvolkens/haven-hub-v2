import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

// POST /api/instagram/disconnect - Disconnect Instagram account
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS (same issue as callback route)
    const adminClient = getAdminClient();

    // Update integration status
    const { error } = await (adminClient as any)
      .from('integrations')
      .update({
        status: 'disconnected',
        metadata: {},
        token_expires_at: null,
        connected_at: null,
      })
      .eq('user_id', user.id)
      .eq('provider', 'instagram');

    if (error) {
      console.error('Error disconnecting Instagram:', error);
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    // Also clear from platform_connections if exists
    await (adminClient as any)
      .from('platform_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'instagram');

    // Log activity (use regular client for activity log)
    await (supabase as any).rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: 'integration_disconnected',
      p_details: { provider: 'instagram' },
      p_executed: true,
      p_module: 'settings',
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in disconnect API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
