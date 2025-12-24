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

    // Check for design rules
    const { count: rulesCount } = await (supabase as any)
      .from('design_rules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Check user settings for operator mode
    const { data: userSettings } = await (supabase as any)
      .from('user_settings')
      .select('global_mode')
      .eq('user_id', userId)
      .single();

    // Build setup_progress object matching page expectations
    const getStatus = (connected: boolean) => connected ? 'completed' : 'pending';

    const setup_progress = {
      shopify: getStatus(integrationMap.get('shopify') === 'connected'),
      pinterest: getStatus(integrationMap.get('pinterest') === 'connected'),
      klaviyo: getStatus(integrationMap.get('klaviyo') === 'connected'),
      dynamic_mockups: getStatus(integrationMap.get('dynamic_mockups') === 'connected'),
      resend: getStatus(integrationMap.get('resend') === 'connected'),
      design_rules: getStatus((rulesCount || 0) > 0),
      operator_mode: getStatus(userSettings?.global_mode !== 'supervised'),
      import: 'pending', // Will be completed when quotes are imported
    };

    return NextResponse.json({ setup_progress });
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
