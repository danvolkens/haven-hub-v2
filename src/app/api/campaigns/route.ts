import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/campaigns
 * List campaigns with optional filters
 *
 * Query params:
 * - status: Filter by status (active, inactive, draft)
 * - limit: Number of results (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = (supabase as any)
      .from('campaigns')
      .select(`
        id,
        name,
        description,
        type,
        status,
        start_date,
        end_date,
        theme,
        hashtags,
        target_collections,
        has_offer,
        offer_type,
        offer_value,
        offer_code,
        channels,
        revenue,
        orders,
        leads,
        pins_published,
        emails_sent,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      // Table might not exist yet - return empty array
      console.error('Error fetching campaigns:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(campaigns || []);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, type, status, start_date, end_date, theme, hashtags } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const { data: campaign, error } = await (supabase as any)
      .from('campaigns')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        type,
        status: status || 'draft',
        start_date,
        end_date,
        theme: theme || null,
        hashtags: hashtags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
