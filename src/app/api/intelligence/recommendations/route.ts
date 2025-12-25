import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/intelligence/recommendations - Get recommendations for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = (supabase as any)
      .from('recommendations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('impact_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Filter for non-expired recommendations
    const now = new Date().toISOString();
    query = query.or(`expires_at.is.null,expires_at.gt.${now}`);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      recommendations: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

// PATCH /api/intelligence/recommendations - Update recommendation
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const { id, status, feedback, rating } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Recommendation ID required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (status) {
      if (!['accepted', 'rejected', 'implemented'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
    }

    if (feedback !== undefined) {
      updates.user_feedback = feedback;
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
      }
      updates.feedback_rating = rating;
    }

    const { data, error } = await (supabase as any)
      .from('recommendations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: `recommendation_${status}`,
      p_details: {
        recommendationId: id,
        type: data.type,
        rating,
      },
      p_executed: true,
      p_module: 'intelligence',
      p_reference_id: id,
      p_reference_table: 'recommendations',
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update recommendation' },
      { status: 500 }
    );
  }
}
