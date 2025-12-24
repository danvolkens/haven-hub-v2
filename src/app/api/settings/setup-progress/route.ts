import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Check integration status
    const { data: integrations } = await (supabase as any)
      .from('integrations')
      .select('provider, status')
      .eq('user_id', userId);

    const integrationMap = new Map(
      integrations?.map((i: any) => [i.provider, i.status]) || []
    );

    // Check for quotes
    const { count: quotesCount } = await (supabase as any)
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Check for design rules
    const { count: rulesCount } = await (supabase as any)
      .from('design_rules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const steps = [
      {
        id: 'shopify',
        name: 'Connect Shopify',
        completed: integrationMap.get('shopify') === 'connected',
        required: true,
      },
      {
        id: 'pinterest',
        name: 'Connect Pinterest',
        completed: integrationMap.get('pinterest') === 'connected',
        required: true,
      },
      {
        id: 'quotes',
        name: 'Import Quotes',
        completed: (quotesCount || 0) > 0,
        required: true,
      },
      {
        id: 'design_rules',
        name: 'Configure Design Rules',
        completed: (rulesCount || 0) > 0,
        required: false,
      },
      {
        id: 'klaviyo',
        name: 'Connect Klaviyo',
        completed: integrationMap.get('klaviyo') === 'connected',
        required: false,
      },
    ];

    const completedSteps = steps.filter((s) => s.completed).length;
    const totalSteps = steps.length;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    return NextResponse.json({
      steps,
      completedSteps,
      totalSteps,
      progress,
      isComplete: steps.filter((s) => s.required).every((s) => s.completed),
    });
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
