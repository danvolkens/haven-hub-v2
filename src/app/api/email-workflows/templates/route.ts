import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List all email templates for the user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const flowType = searchParams.get('flow_type');

    let query = (supabase as any)
      .from('email_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('flow_type')
      .order('position');

    if (flowType) {
      query = query.eq('flow_type', flowType);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error in GET /api/email-workflows/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new email template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, preview_text, html_content, flow_type, position, delay_hours } = body;

    if (!name || !subject || !html_content || !flow_type) {
      return NextResponse.json({
        error: 'Missing required fields: name, subject, html_content, flow_type'
      }, { status: 400 });
    }

    const validFlowTypes = ['welcome', 'quiz_result', 'cart_abandonment', 'post_purchase', 'win_back'];
    if (!validFlowTypes.includes(flow_type)) {
      return NextResponse.json({
        error: `Invalid flow_type. Must be one of: ${validFlowTypes.join(', ')}`
      }, { status: 400 });
    }

    const { data: template, error } = await (supabase as any)
      .from('email_templates')
      .insert({
        user_id: user.id,
        name,
        subject,
        preview_text,
        html_content,
        flow_type,
        position: position || 1,
        delay_hours: delay_hours || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'A template already exists for this flow type and position'
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update an existing template
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id;
    delete updates.created_at;
    delete updates.klaviyo_template_id;

    const { data: template, error } = await (supabase as any)
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in PATCH /api/email-workflows/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a template
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
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from('email_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/email-workflows/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
