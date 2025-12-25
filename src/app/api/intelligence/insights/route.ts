import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/intelligence/insights - Get insights for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'new';
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = (supabase as any)
      .from('insights')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      if (status === 'active') {
        query = query.in('status', ['new', 'viewed']);
      } else {
        query = query.eq('status', status);
      }
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    // Filter for valid insights
    const now = new Date().toISOString();
    query = query.lte('valid_from', now);
    query = query.or(`valid_until.is.null,valid_until.gt.${now}`);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      insights: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

// PATCH /api/intelligence/insights - Update insight status
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const { id, status, feedback } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Insight ID required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (status) {
      if (!['viewed', 'actioned', 'dismissed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;

      if (status === 'actioned') {
        updates.actioned_at = new Date().toISOString();
      }
    }

    if (feedback !== undefined) {
      updates.user_feedback = feedback;
    }

    const { data, error } = await (supabase as any)
      .from('insights')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update insight' },
      { status: 500 }
    );
  }
}
