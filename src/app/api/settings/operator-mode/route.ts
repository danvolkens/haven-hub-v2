import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';

const updateModeSchema = z.object({
  mode: z.enum(['supervised', 'assisted', 'autopilot']),
});

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    // Use 'as any' to avoid TypeScript inference issues
    const { data, error } = await (supabase as any)
      .from('user_settings')
      .select('global_mode, module_overrides, transitioning_to, transition_started_at, guardrails')
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();

    const { mode } = updateModeSchema.parse(body);

    // Check for in-flight operations
    const { count: pendingCount } = await (supabase as any)
      .from('approval_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'processing');

    const { count: publishingPins } = await (supabase as any)
      .from('pins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'publishing');

    const totalPending = (pendingCount || 0) + (publishingPins || 0);

    if (totalPending > 0) {
      // Start grace period
      const { error } = await (supabase as any)
        .from('user_settings')
        .update({
          transitioning_to: mode,
          transition_started_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity
      await (supabase as any).rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'mode_change',
        p_details: { from: 'current', to: mode, gracePeriod: true },
        p_executed: false,
        p_module: 'settings',
      });

      return NextResponse.json({
        success: true,
        gracePeriod: true,
        pendingCount: totalPending,
      });
    }

    // Get current mode for logging
    const { data: currentSettings } = await (supabase as any)
      .from('user_settings')
      .select('global_mode')
      .eq('user_id', userId)
      .single();

    // Immediate switch
    const { error } = await (supabase as any)
      .from('user_settings')
      .update({
        global_mode: mode,
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
      p_details: { gracePeriod: false },
      p_executed: true,
      p_module: 'settings',
      p_previous_value: { mode: currentSettings?.global_mode },
      p_new_value: { mode },
    });

    // Invalidate cache
    await invalidateUserCache(userId);

    return NextResponse.json({
      success: true,
      gracePeriod: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid mode value' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
