import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';

const updateModuleSchema = z.object({
  module: z.string(),
  mode: z.enum(['supervised', 'assisted', 'autopilot']).nullable(),
});

interface ModuleOverrides {
  [key: string]: string | null;
}

interface UserSettings {
  module_overrides: ModuleOverrides | null;
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();

    const { module, mode } = updateModuleSchema.parse(body);

    // Get current overrides
    // Use 'as any' to avoid TypeScript inference issues
    const { data: settingsData, error: fetchError } = await (supabase
      .from('user_settings') as any)
      .select('module_overrides')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const settings = settingsData as UserSettings | null;
    const currentOverrides = settings?.module_overrides || {};
    const previousValue = currentOverrides[module];

    // Update overrides
    let newOverrides: Record<string, string | null>;
    if (mode === null) {
      // Remove override (use global mode)
      const { [module]: _, ...rest } = currentOverrides;
      newOverrides = rest;
    } else {
      newOverrides = { ...currentOverrides, [module]: mode };
    }

    const { error } = await (supabase
      .from('user_settings') as any)
      .update({ module_overrides: newOverrides })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'mode_change',
      p_details: { module, isModuleOverride: true },
      p_executed: true,
      p_module: 'settings',
      p_previous_value: previousValue ? { [module]: previousValue } : null,
      p_new_value: mode ? { [module]: mode } : null,
    });

    // Invalidate cache
    await invalidateUserCache(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
