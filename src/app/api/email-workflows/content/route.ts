import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List all content library entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('template_id');
    const activeOnly = searchParams.get('active_only') !== 'false';

    let query = (supabase as any)
      .from('email_content_library')
      .select(`
        *,
        email_templates (
          id,
          name,
          flow_type,
          position
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (templateId) {
      query = query.eq('email_template_id', templateId);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: content, error } = await query;

    if (error) {
      console.error('Error fetching content library:', error);
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in GET /api/email-workflows/content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new content version
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email_template_id, subject, preview_text, body_content, variables } = body;

    if (!email_template_id || !subject || !body_content) {
      return NextResponse.json({
        error: 'Missing required fields: email_template_id, subject, body_content'
      }, { status: 400 });
    }

    // Verify the template belongs to this user
    const { data: template, error: templateError } = await (supabase as any)
      .from('email_templates')
      .select('id')
      .eq('id', email_template_id)
      .eq('user_id', user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get the next version number
    const { data: latestVersion } = await (supabase as any)
      .from('email_content_library')
      .select('version')
      .eq('email_template_id', email_template_id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Deactivate all previous versions for this template
    await (supabase as any)
      .from('email_content_library')
      .update({ is_active: false })
      .eq('email_template_id', email_template_id);

    // Create the new content version
    const { data: content, error } = await (supabase as any)
      .from('email_content_library')
      .insert({
        user_id: user.id,
        email_template_id,
        version: nextVersion,
        subject,
        preview_text,
        body_content,
        variables: variables || [],
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating content:', error);
      return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
    }

    return NextResponse.json({ content }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update content or activate a specific version
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, activate, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Content id is required' }, { status: 400 });
    }

    // Get the content entry
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('email_content_library')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // If activating, deactivate other versions first
    if (activate) {
      await (supabase as any)
        .from('email_content_library')
        .update({ is_active: false })
        .eq('email_template_id', existing.email_template_id);

      updates.is_active = true;
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id;
    delete updates.created_at;
    delete updates.created_by;
    delete updates.email_template_id;
    delete updates.version;

    const { data: content, error } = await (supabase as any)
      .from('email_content_library')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content:', error);
      return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in PATCH /api/email-workflows/content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a content version (not the active one)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Content id is required' }, { status: 400 });
    }

    // Check if this is the active version
    const { data: content } = await (supabase as any)
      .from('email_content_library')
      .select('is_active')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (content?.is_active) {
      return NextResponse.json({
        error: 'Cannot delete the active content version. Activate a different version first.'
      }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from('email_content_library')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting content:', error);
      return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/email-workflows/content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
