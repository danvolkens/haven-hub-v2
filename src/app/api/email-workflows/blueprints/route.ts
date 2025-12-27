import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List all flow blueprints (system-defined templates for flows)
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
      .from('flow_blueprints')
      .select('*')
      .order('created_at');

    if (flowType) {
      query = query.eq('flow_type', flowType);
    }

    const { data: blueprints, error } = await query;

    if (error) {
      console.error('Error fetching blueprints:', error);
      return NextResponse.json({ error: 'Failed to fetch blueprints' }, { status: 500 });
    }

    // Also get the user's deployment status for each blueprint
    const { data: deployments } = await (supabase as any)
      .from('flow_deployments')
      .select('*')
      .eq('user_id', user.id);

    // Merge deployment status with blueprints
    const blueprintsWithStatus = blueprints.map((blueprint: any) => {
      const deployment = deployments?.find((d: any) => d.flow_type === blueprint.flow_type);
      return {
        ...blueprint,
        deployment: deployment || null,
        is_deployed: !!deployment?.klaviyo_flow_id,
        deployment_status: deployment?.status || 'not_created',
      };
    });

    return NextResponse.json({ blueprints: blueprintsWithStatus });
  } catch (error) {
    console.error('Error in GET /api/email-workflows/blueprints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET flow-specific email content requirements
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { flow_type } = body;

    if (!flow_type) {
      return NextResponse.json({ error: 'flow_type is required' }, { status: 400 });
    }

    // Get the blueprint
    const { data: blueprint, error } = await (supabase as any)
      .from('flow_blueprints')
      .select('*')
      .eq('flow_type', flow_type)
      .single();

    if (error || !blueprint) {
      return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 });
    }

    // Get user's templates for this flow
    const { data: templates } = await (supabase as any)
      .from('email_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('flow_type', flow_type)
      .eq('is_active', true)
      .order('position');

    // Define expected email count per flow
    const emailCounts: Record<string, number> = {
      welcome: 4,
      quiz_result: 4,
      cart_abandonment: 3,
      post_purchase: 4,
      win_back: 3,
    };

    const expectedCount = emailCounts[flow_type] || 4;
    const existingPositions = templates?.map((t: any) => t.position) || [];
    const missingPositions = Array.from({ length: expectedCount }, (_, i) => i + 1)
      .filter(pos => !existingPositions.includes(pos));

    // Check which templates are synced to Klaviyo
    const syncedTemplates = templates?.filter((t: any) => t.klaviyo_template_id) || [];
    const unsyncedTemplates = templates?.filter((t: any) => !t.klaviyo_template_id) || [];

    return NextResponse.json({
      blueprint,
      templates: templates || [],
      readiness: {
        expected_emails: expectedCount,
        existing_emails: templates?.length || 0,
        missing_positions: missingPositions,
        synced_to_klaviyo: syncedTemplates.length,
        unsynced: unsyncedTemplates.length,
        is_ready: missingPositions.length === 0 && unsyncedTemplates.length === 0,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/blueprints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
