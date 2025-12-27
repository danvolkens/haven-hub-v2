import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get user's base templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = (supabase as any)
      .from('email_base_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching base templates:', error);
      return NextResponse.json({ error: 'Failed to fetch base templates' }, { status: 500 });
    }

    return NextResponse.json({
      templates,
      active: templates?.find((t: any) => t.is_active) || null
    });
  } catch (error) {
    console.error('Error in GET /api/email-workflows/base-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new base template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, html_content, is_active = true } = body;

    if (!html_content) {
      return NextResponse.json({ error: 'html_content is required' }, { status: 400 });
    }

    // Validate placeholders exist in the HTML
    const requiredPlaceholders = ['{{CONTENT}}'];
    const missingPlaceholders = requiredPlaceholders.filter(p => !html_content.includes(p));

    if (missingPlaceholders.length > 0) {
      return NextResponse.json({
        error: `Missing required placeholders: ${missingPlaceholders.join(', ')}`,
        hint: 'Add {{CONTENT}} where you want the email body to appear. Optionally add {{BUTTON_TEXT}} and {{BUTTON_URL}} for the CTA button.'
      }, { status: 400 });
    }

    // Detect which placeholders are present
    const placeholders = ['CONTENT'];
    if (html_content.includes('{{BUTTON_TEXT}}')) placeholders.push('BUTTON_TEXT');
    if (html_content.includes('{{BUTTON_URL}}')) placeholders.push('BUTTON_URL');

    const { data: template, error } = await (supabase as any)
      .from('email_base_templates')
      .insert({
        user_id: user.id,
        name: name || 'Default Template',
        description,
        html_content,
        placeholders,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating base template:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create base template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/base-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a base template
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, html_content, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;

    if (html_content !== undefined) {
      // Validate placeholders
      if (!html_content.includes('{{CONTENT}}')) {
        return NextResponse.json({
          error: 'Missing required placeholder: {{CONTENT}}',
          hint: 'Add {{CONTENT}} where you want the email body to appear.'
        }, { status: 400 });
      }

      updates.html_content = html_content;

      // Update detected placeholders
      const placeholders = ['CONTENT'];
      if (html_content.includes('{{BUTTON_TEXT}}')) placeholders.push('BUTTON_TEXT');
      if (html_content.includes('{{BUTTON_URL}}')) placeholders.push('BUTTON_URL');
      updates.placeholders = placeholders;
    }

    const { data: template, error } = await (supabase as any)
      .from('email_base_templates')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating base template:', error);
      return NextResponse.json({ error: 'Failed to update base template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in PATCH /api/email-workflows/base-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a base template
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
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from('email_base_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting base template:', error);
      return NextResponse.json({ error: 'Failed to delete base template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/email-workflows/base-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
