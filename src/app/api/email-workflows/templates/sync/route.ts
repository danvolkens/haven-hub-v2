import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { KlaviyoClient } from '@/lib/integrations/klaviyo/client';

// POST - Sync a template to Klaviyo (creates or updates)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, sync_all } = body;

    // Get Klaviyo API key from integrations
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('credentials')
      .eq('user_id', user.id)
      .eq('provider', 'klaviyo')
      .single();

    if (!integration?.credentials?.api_key) {
      return NextResponse.json({
        error: 'Klaviyo integration not configured. Please add your API key in Settings.'
      }, { status: 400 });
    }

    const klaviyo = new KlaviyoClient({ apiKey: integration.credentials.api_key });

    // Get templates to sync
    let query = (supabase as any)
      .from('email_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!sync_all && template_id) {
      query = query.eq('id', template_id);
    }

    const { data: templates, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ error: 'No templates found to sync' }, { status: 404 });
    }

    const results: Array<{
      id: string;
      name: string;
      klaviyo_template_id: string | null;
      status: 'created' | 'updated' | 'error';
      error?: string;
    }> = [];

    for (const template of templates) {
      try {
        let klaviyoTemplateId = template.klaviyo_template_id;

        if (klaviyoTemplateId) {
          // Update existing template in Klaviyo
          await klaviyo.updateTemplate(klaviyoTemplateId, {
            name: `Haven Hub - ${template.name}`,
            html: template.html_content,
          });

          results.push({
            id: template.id,
            name: template.name,
            klaviyo_template_id: klaviyoTemplateId,
            status: 'updated',
          });
        } else {
          // Create new template in Klaviyo
          const klaviyoTemplate = await klaviyo.createTemplate({
            name: `Haven Hub - ${template.name}`,
            html: template.html_content,
          });

          klaviyoTemplateId = klaviyoTemplate.id;

          // Update local record with Klaviyo ID
          await (supabase as any)
            .from('email_templates')
            .update({ klaviyo_template_id: klaviyoTemplateId })
            .eq('id', template.id);

          results.push({
            id: template.id,
            name: template.name,
            klaviyo_template_id: klaviyoTemplateId,
            status: 'created',
          });
        }
      } catch (error) {
        console.error(`Error syncing template ${template.id}:`, error);
        results.push({
          id: template.id,
          name: template.name,
          klaviyo_template_id: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.status !== 'error').length;
    const failed = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Synced ${successful} templates${failed > 0 ? `, ${failed} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/templates/sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove template from Klaviyo (but keep local copy)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('template_id');

    if (!templateId) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 });
    }

    // Get the template
    const { data: template, error: fetchError } = await (supabase as any)
      .from('email_templates')
      .select('klaviyo_template_id')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!template.klaviyo_template_id) {
      return NextResponse.json({ error: 'Template is not synced to Klaviyo' }, { status: 400 });
    }

    // Get Klaviyo API key
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('credentials')
      .eq('user_id', user.id)
      .eq('provider', 'klaviyo')
      .single();

    if (!integration?.credentials?.api_key) {
      return NextResponse.json({ error: 'Klaviyo integration not configured' }, { status: 400 });
    }

    const klaviyo = new KlaviyoClient({ apiKey: integration.credentials.api_key });

    try {
      // Delete from Klaviyo
      await klaviyo.deleteTemplate(template.klaviyo_template_id);

      // Clear the Klaviyo ID from local record
      await (supabase as any)
        .from('email_templates')
        .update({ klaviyo_template_id: null })
        .eq('id', templateId);

      return NextResponse.json({ success: true, message: 'Template removed from Klaviyo' });
    } catch (error) {
      console.error('Error deleting template from Klaviyo:', error);
      return NextResponse.json({
        error: 'Failed to delete template from Klaviyo'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/email-workflows/templates/sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
