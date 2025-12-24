import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { invalidateUserCache } from '@/lib/cache/cache-utils';
import type { Guardrails } from '@/types/database';
import type { Json } from '@/types/supabase';

// Validation ranges per spec
const guardrailRanges: Record<keyof Guardrails, { min: number; max: number } | null> = {
  daily_pin_limit: { min: 1, max: 25 },
  weekly_ad_spend_cap: { min: 0, max: 10000 },
  monthly_ad_spend_cap: { min: 0, max: 50000 },
  annual_mockup_budget: { min: 100, max: 10000 },
  monthly_mockup_soft_limit: { min: 10, max: 1000 },
  auto_retire_days: { min: 3, max: 30 },
  abandonment_window_hours: { min: 1, max: 24 },
  duplicate_content_days: { min: 7, max: 90 },
};

const updateGuardrailSchema = z.object({
  key: z.string(),
  value: z.number().nullable(),
});

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Cast the data to the expected shape and return guardrails
    const settings = data as { guardrails: Guardrails };
    return NextResponse.json(settings.guardrails);
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

    const { key, value } = updateGuardrailSchema.parse(body);

    // Validate key is a valid guardrail
    if (!(key in guardrailRanges)) {
      return NextResponse.json({ error: 'Invalid guardrail key' }, { status: 400 });
    }

    // Validate value is within range (if not null)
    if (value !== null) {
      const range = guardrailRanges[key as keyof Guardrails];
      if (range && (value < range.min || value > range.max)) {
        return NextResponse.json(
          { error: `Value must be between ${range.min} and ${range.max}` },
          { status: 400 }
        );
      }
    }

    // Get current guardrails
    const { data: fetchData, error: fetchError } = await supabase
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!fetchData) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    // Type assertion to access guardrails property
    const settingsData = fetchData as unknown as { guardrails: Guardrails };
    const currentGuardrails = settingsData.guardrails;
    const previousValue = currentGuardrails[key as keyof Guardrails];

    // Update guardrails
    const newGuardrails = { ...currentGuardrails, [key]: value };

    // Use a direct update with the supabase client
    // Use 'as any' to avoid TypeScript inference issues
    const { error: updateError } = await (supabase
      .from('user_settings') as any)
      .update({ guardrails: newGuardrails })
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    // Use 'as any' to avoid TypeScript inference issues with rpc functions
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'guardrail_update',
      p_details: { guardrailKey: key },
      p_executed: true,
      p_module: 'settings',
      p_previous_value: { [key]: previousValue },
      p_new_value: { [key]: value },
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
