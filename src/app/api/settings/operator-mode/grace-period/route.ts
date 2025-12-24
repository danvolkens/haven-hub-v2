import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';

const gracePeriodActionSchema = z.object({
  action: z.enum(['complete', 'cancel']),
});

interface UserSettingsData {
  global_mode: string;
  transitioning_to: string | null;
  transition_started_at: string | null;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    // Use 'as any' to avoid TypeScript inference issues
    const { data, error } = await (supabase
      .from('user_settings') as any)
      .select('global_mode, transitioning_to, transition_started_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = data as UserSettingsData | null;

    // Count pending operations
    const { count: pendingApprovals } = await (supabase
      .from('approval_items') as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'processing');

    const { count: publishingPins } = await (supabase
      .from('pins') as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'publishing');

    return NextResponse.json({
      isActive: !!settings?.transitioning_to,
      currentMode: settings?.global_mode,
      targetMode: settings?.transitioning_to,
      startedAt: settings?.transition_started_at,
      pendingCount: (pendingApprovals || 0) + (publishingPins || 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();

    const { action } = gracePeriodActionSchema.parse(body);

    // Get current state
    // Use 'as any' to avoid TypeScript inference issues
    const { data: settingsData, error: fetchError } = await (supabase
      .from('user_settings') as any)
      .select('global_mode, transitioning_to')
      .eq('user_id', userId)
      .single();

    const settings = settingsData as UserSettingsData | null;

    if (fetchError || !settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    if (!settings.transitioning_to) {
      return NextResponse.json({ error: 'No active grace period' }, { status: 400 });
    }

    if (action === 'complete') {
      // Force complete: switch to target mode
      const { error } = await (supabase
        .from('user_settings') as any)
        .update({
          global_mode: settings.transitioning_to,
          transitioning_to: null,
          transition_started_at: null,
        })
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity
      await (supabase as any).rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'mode_change',
        p_details: { forced: true, gracePeriod: true },
        p_executed: true,
        p_module: 'settings',
        p_previous_value: { mode: settings.global_mode },
        p_new_value: { mode: settings.transitioning_to },
      });
    } else {
      // Cancel: clear transition state
      const { error } = await (supabase
        .from('user_settings') as any)
        .update({
          transitioning_to: null,
          transition_started_at: null,
        })
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log cancellation
      await (supabase as any).rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'mode_change',
        p_details: { cancelled: true, targetWas: settings.transitioning_to },
        p_executed: false,
        p_module: 'settings',
      });
    }

    // Invalidate cache
    await invalidateUserCache(userId);

    return NextResponse.json({ success: true, action });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
