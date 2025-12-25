import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const userId = await getApiUserId();
    const { provider } = await params;
    const supabase = await createServerSupabaseClient();

    // Update integration status to disconnected
    const { error } = await (supabase as any)
      .from('integrations')
      .update({
        status: 'disconnected',
        metadata: {},
        token_expires_at: null,
        connected_at: null,
      })
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) {
      console.error('Error disconnecting integration:', error);
      throw error;
    }

    // Update setup progress
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('setup_progress')
      .eq('user_id', userId)
      .single();

    if (settings?.setup_progress) {
      await (supabase as any)
        .from('user_settings')
        .update({
          setup_progress: { ...settings.setup_progress, [provider]: 'pending' },
        })
        .eq('user_id', userId);
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_disconnected',
      p_details: { provider },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
