import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  variant: z.string().default('a'),
  title_template: z.string().min(1).max(200),
  description_template: z.string().min(1).max(1000),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional().nullable(),
  mood: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  variant: z.string().optional(),
  title_template: z.string().min(1).max(200).optional(),
  description_template: z.string().min(1).max(1000).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional().nullable(),
  mood: z.string().max(50).optional().nullable(),
  is_active: z.boolean().optional(),
});

// GET - List all copy templates for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection');
    const activeOnly = searchParams.get('active') !== 'false';

    let query = (supabase as any)
      .from('pin_copy_templates')
      .select('*')
      .eq('user_id', userId)
      .order('avg_engagement_rate', { ascending: false, nullsFirst: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (collection) {
      query = query.eq('collection', collection);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching copy templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// POST - Create a new copy template
export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const body = await request.json();
    const data = createSchema.parse(body);

    const { data: template, error } = await (supabase as any)
      .from('pin_copy_templates')
      .insert({
        user_id: userId,
        name: data.name,
        variant: data.variant,
        title_template: data.title_template,
        description_template: data.description_template,
        collection: data.collection,
        mood: data.mood,
        is_active: data.is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating copy template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// PUT - Update a copy template
export async function PUT(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const body = await request.json();
    const { id, ...updateData } = updateSchema.parse(body);

    // Verify ownership
    const { data: existing } = await (supabase as any)
      .from('pin_copy_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { data: template, error } = await (supabase as any)
      .from('pin_copy_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating copy template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a copy template
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const body = await request.json();
    const { id } = z.object({ id: z.string().uuid() }).parse(body);

    // Verify ownership
    const { data: existing } = await (supabase as any)
      .from('pin_copy_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { error } = await (supabase as any)
      .from('pin_copy_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting copy template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
