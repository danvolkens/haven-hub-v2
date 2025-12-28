import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/instagram/disconnect - Disconnect Instagram account
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update integration status
    const { error } = await (supabase as any)
      .from('integrations')
      .update({
        status: 'disconnected',
        metadata: {},
        token_expires_at: null,
      })
      .eq('user_id', user.id)
      .eq('provider', 'instagram');

    if (error) {
      console.error('Error disconnecting Instagram:', error);
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    // Also clear from platform_connections if exists
    await (supabase as any)
      .from('platform_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'instagram');

    // Log activity
    await (supabase as any)
      .from('user_activity')
      .insert({
        user_id: user.id,
        activity_type: 'instagram_disconnected',
        metadata: {},
      })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in disconnect API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
