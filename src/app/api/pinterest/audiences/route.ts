import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = getAdminClient();

    // Check Pinterest connection - just check if connected, don't require ad_account_id
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('status, metadata')
      .eq('user_id', userId)
      .eq('provider', 'pinterest')
      .single();

    // User is connected if status is 'connected' - don't require ad_account_id in metadata
    const pinterestConnected = integration?.status === 'connected';

    // Get audiences
    const { data: audiences, error } = await (supabase as any)
      .from('audience_exports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      audiences: audiences || [],
      pinterestConnected,
    });
  } catch (error) {
    console.error('Error fetching audiences:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audiences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = getAdminClient();
    const body = await request.json();

    const { name, description, segment_criteria = {} } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create audience
    const { data: audience, error } = await (supabase as any)
      .from('audience_exports')
      .insert({
        user_id: userId,
        name,
        description,
        segment_criteria,
        status: 'draft',
        total_profiles: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ audience });
  } catch (error) {
    console.error('Error creating audience:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create audience' },
      { status: 500 }
    );
  }
}
