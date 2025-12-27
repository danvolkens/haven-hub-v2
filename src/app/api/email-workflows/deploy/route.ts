import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

// Flow configurations
const FLOW_CONFIGS = {
  welcome: {
    name: 'Welcome Flow',
    trigger_type: 'list' as const,
    trigger_list_name: 'Haven Hub - All Leads',
    email_count: 4,
    delays: [0, 48, 96, 168], // hours
    subjects: [
      'Welcome to Haven & Hold',
      'Why Haven & Hold exists',
      'Three ways to hold yourself',
      'What customers are saying',
    ],
    preview_texts: [
      'Your space for quiet holding',
      'It started with a blank wall...',
      'Grounding, Wholeness, or Growth?',
      'Real walls, real words',
    ],
  },
  quiz_result: {
    name: 'Quiz Result Flow',
    trigger_type: 'metric' as const,
    trigger_metric: 'Quiz Completed',
    email_count: 4,
    delays: [0, 24, 72, 120], // hours
    subjects: [
      'Your Sanctuary Quiz results are in',
      'The story behind {{ quiz_result }}',
      'Where to hang your {{ quiz_result }} print',
      '20% off {{ quiz_result }} — just for you',
    ],
    preview_texts: [
      'We found your perfect collection',
      'Why these words matter',
      'Styling ideas for your space',
      'Expires in 48 hours',
    ],
  },
  cart_abandonment: {
    name: 'Cart Abandonment Flow',
    trigger_type: 'metric' as const,
    trigger_metric: 'Cart Abandoned',
    email_count: 3,
    delays: [1, 24, 72], // hours
    subjects: [
      'You left something behind',
      'Still thinking about it?',
      'A little something to help you decide',
    ],
    preview_texts: [
      'Your cart is still waiting',
      'No pressure, just checking in',
      '10% off, just for you',
    ],
  },
  post_purchase: {
    name: 'Post-Purchase Flow',
    trigger_type: 'metric' as const,
    trigger_metric: 'Placed Order',
    email_count: 4,
    delays: [0, 72, 168, 336], // hours
    subjects: [
      'Your sanctuary is on its way',
      'Getting the perfect print (quick guide)',
      "How's your print looking?",
      'Complete your sanctuary',
    ],
    preview_texts: [
      'Order confirmed',
      'Printing tips',
      'Share your space',
      'More for your walls',
    ],
  },
  win_back: {
    name: 'Win-Back Flow',
    trigger_type: 'metric' as const,
    trigger_metric: 'Win Back Started',
    email_count: 3,
    delays: [0, 72, 168], // hours
    subjects: [
      "It's been a while",
      'What you might have missed',
      'Last chance for 20% off',
    ],
    preview_texts: [
      'Special offer inside',
      'New arrivals',
      'Expires soon',
    ],
  },
};

// POST - Deploy a flow to Klaviyo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { flow_type, from_email, from_label } = body;

    if (!flow_type || !from_email || !from_label) {
      return NextResponse.json({
        error: 'Missing required fields: flow_type, from_email, from_label'
      }, { status: 400 });
    }

    const config = FLOW_CONFIGS[flow_type as keyof typeof FLOW_CONFIGS];
    if (!config) {
      return NextResponse.json({ error: 'Invalid flow_type' }, { status: 400 });
    }

    // Get Klaviyo client
    const klaviyo = await getKlaviyoClient(user.id);

    if (!klaviyo) {
      return NextResponse.json({
        error: 'Klaviyo integration not configured. Please add your API key in Settings.'
      }, { status: 400 });
    }

    // Get user's templates for this flow (must be synced to Klaviyo)
    const { data: templates, error: templateError } = await (supabase as any)
      .from('email_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('flow_type', flow_type)
      .eq('is_active', true)
      .not('klaviyo_template_id', 'is', null)
      .order('position');

    if (templateError) {
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    if (!templates || templates.length < config.email_count) {
      return NextResponse.json({
        error: `This flow requires ${config.email_count} synced templates. You have ${templates?.length || 0}. Please create and sync all templates first.`
      }, { status: 400 });
    }

    // Get template IDs in order
    const templateIds = templates
      .sort((a: any, b: any) => a.position - b.position)
      .map((t: any) => t.klaviyo_template_id);

    // Build flow definition based on trigger type
    let flowDefinition;

    if (config.trigger_type === 'list') {
      // Get or create the trigger list
      const lists = await klaviyo.getLists();
      let triggerList = lists.find(l =>
        l.name.toLowerCase().includes('all leads') ||
        l.name.toLowerCase() === config.trigger_list_name?.toLowerCase()
      );

      if (!triggerList) {
        // Create the list if it doesn't exist
        triggerList = await klaviyo.createList(config.trigger_list_name || 'Haven Hub - All Leads');
      }

      flowDefinition = klaviyo.buildWelcomeFlowDefinition({
        listId: triggerList.id,
        templateIds,
        fromEmail: from_email,
        fromLabel: from_label,
        subjects: templates.map((t: any) => t.subject),
        previewTexts: templates.map((t: any) => t.preview_text || ''),
        delayHours: config.delays,
      });
    } else {
      flowDefinition = klaviyo.buildMetricFlowDefinition({
        metricName: config.trigger_metric || config.name,
        templateIds,
        fromEmail: from_email,
        fromLabel: from_label,
        subjects: templates.map((t: any) => t.subject),
        previewTexts: templates.map((t: any) => t.preview_text || ''),
        delayHours: config.delays,
      });
    }

    // Create the flow in Klaviyo
    const flow = await klaviyo.createFlow({
      name: `Haven Hub - ${config.name}`,
      status: 'draft',
      definition: flowDefinition,
    });

    // Record the deployment
    const { data: deployment, error: deployError } = await (supabase as any)
      .from('flow_deployments')
      .upsert({
        user_id: user.id,
        flow_type,
        klaviyo_flow_id: flow.id,
        status: 'draft',
        deployed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,flow_type',
      })
      .select()
      .single();

    if (deployError) {
      console.error('Error recording deployment:', deployError);
      // Flow was created, just failed to record - don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: `${config.name} created in Klaviyo (Draft status)`,
      flow: {
        id: flow.id,
        name: flow.name,
        status: flow.status,
      },
      deployment,
      klaviyo_url: `https://www.klaviyo.com/flows/${flow.id}`,
    });
  } catch (error) {
    console.error('Error in POST /api/email-workflows/deploy:', error);

    // Update deployment status to error if we have the flow_type
    try {
      const body = await request.clone().json();
      if (body.flow_type) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any)
            .from('flow_deployments')
            .upsert({
              user_id: user.id,
              flow_type: body.flow_type,
              status: 'error',
              last_error: error instanceof Error ? error.message : 'Unknown error',
            }, {
              onConflict: 'user_id,flow_type',
            });
        }
      }
    } catch {
      // Ignore errors in error handling
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to deploy flow'
    }, { status: 500 });
  }
}

// GET - Get deployment status for all flows
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all deployments for this user
    const { data: deployments, error } = await (supabase as any)
      .from('flow_deployments')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
    }

    // Build status object for all flow types
    const flowTypes = Object.keys(FLOW_CONFIGS);
    const status = flowTypes.map(flowType => {
      const deployment = deployments?.find((d: any) => d.flow_type === flowType);
      const config = FLOW_CONFIGS[flowType as keyof typeof FLOW_CONFIGS];

      return {
        flow_type: flowType,
        name: config.name,
        deployment: deployment || null,
        status: deployment?.status || 'not_created',
        klaviyo_flow_id: deployment?.klaviyo_flow_id || null,
        klaviyo_url: deployment?.klaviyo_flow_id
          ? `https://www.klaviyo.com/flows/${deployment.klaviyo_flow_id}`
          : null,
        deployed_at: deployment?.deployed_at || null,
        last_error: deployment?.last_error || null,
      };
    });

    return NextResponse.json({ deployments: status });
  } catch (error) {
    console.error('Error in GET /api/email-workflows/deploy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a deployed flow (from tracking, optionally from Klaviyo)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const flowType = searchParams.get('flow_type');
    const deleteFromKlaviyo = searchParams.get('delete_from_klaviyo') === 'true';

    if (!flowType) {
      return NextResponse.json({ error: 'flow_type is required' }, { status: 400 });
    }

    // Get the deployment
    const { data: deployment, error: fetchError } = await (supabase as any)
      .from('flow_deployments')
      .select('*')
      .eq('user_id', user.id)
      .eq('flow_type', flowType)
      .single();

    if (fetchError || !deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    // Optionally delete from Klaviyo
    if (deleteFromKlaviyo && deployment.klaviyo_flow_id) {
      const klaviyo = await getKlaviyoClient(user.id);
      if (klaviyo) {
        try {
          await klaviyo.deleteFlow(deployment.klaviyo_flow_id);
        } catch (error) {
          console.error('Error deleting flow from Klaviyo:', error);
          // Continue to delete local record even if Klaviyo delete fails
        }
      }
    }

    // Delete the deployment record
    await (supabase as any)
      .from('flow_deployments')
      .delete()
      .eq('id', deployment.id);

    return NextResponse.json({
      success: true,
      message: deleteFromKlaviyo
        ? 'Flow removed from Klaviyo and tracking'
        : 'Flow removed from tracking (still exists in Klaviyo)',
    });
  } catch (error) {
    console.error('Error in DELETE /api/email-workflows/deploy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
