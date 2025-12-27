import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

// GET - Fetch default templates for user
export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const { data: templates, error } = await (supabase as any).rpc(
      'get_default_mockup_templates',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error fetching default templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch default templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Error in GET /api/mockups/templates/defaults:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

const setDefaultSchema = z.object({
  templateId: z.string().uuid(),
  isDefault: z.boolean(),
});

// PATCH - Set/unset a template as default
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { templateId, isDefault } = setDefaultSchema.parse(body);

    const { data: success, error } = await (supabase as any).rpc(
      'set_template_default',
      {
        p_user_id: userId,
        p_template_id: templateId,
        p_is_default: isDefault,
      }
    );

    if (error) {
      console.error('Error setting template default:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    console.error('Error in PATCH /api/mockups/templates/defaults:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

const bulkSetSchema = z.object({
  templateIds: z.array(z.string().uuid()),
  isDefault: z.boolean(),
});

// POST - Bulk set defaults
export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { templateIds, isDefault } = bulkSetSchema.parse(body);

    // Update all templates in the list
    const { error } = await (supabase as any)
      .from('mockup_scene_templates')
      .update({ is_default: isDefault, updated_at: new Date().toISOString() })
      .in('id', templateIds)
      .or(`user_id.eq.${userId},is_system.eq.true`);

    if (error) {
      console.error('Error bulk setting defaults:', error);
      return NextResponse.json(
        { error: 'Failed to update templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: templateIds.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    console.error('Error in POST /api/mockups/templates/defaults:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
