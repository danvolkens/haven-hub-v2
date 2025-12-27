import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import type { MockupAutomationSettings } from '@/types/mockups';

// GET - Fetch mockup automation settings
export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await (supabase as any).rpc(
      'get_mockup_automation_settings',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error fetching mockup settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // RPC returns array, take first row
    const settings: MockupAutomationSettings = data?.[0] || {
      auto_generate: false,
      use_defaults: true,
      max_per_quote: 5,
      notify_on_complete: true,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in GET /api/settings/mockup-automation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  auto_generate: z.boolean().optional(),
  use_defaults: z.boolean().optional(),
  max_per_quote: z.number().min(1).max(20).optional(),
  notify_on_complete: z.boolean().optional(),
});

// PATCH - Update mockup automation settings
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const updates = updateSchema.parse(body);

    const { data: success, error } = await (supabase as any).rpc(
      'update_mockup_automation_settings',
      {
        p_user_id: userId,
        p_auto_generate: updates.auto_generate ?? null,
        p_use_defaults: updates.use_defaults ?? null,
        p_max_per_quote: updates.max_per_quote ?? null,
        p_notify_on_complete: updates.notify_on_complete ?? null,
      }
    );

    if (error) {
      console.error('Error updating mockup settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    // Fetch updated settings to return
    const { data: settingsData } = await (supabase as any).rpc(
      'get_mockup_automation_settings',
      { p_user_id: userId }
    );

    const settings: MockupAutomationSettings = settingsData?.[0] || {
      auto_generate: false,
      use_defaults: true,
      max_per_quote: 5,
      notify_on_complete: true,
    };

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    console.error('Error in PATCH /api/settings/mockup-automation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
