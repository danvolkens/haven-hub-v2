import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rules, error } = await (supabase as any)
        .from('performance_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const {
        name, description, metric, comparison,
        threshold_value, threshold_min, threshold_max,
        action_type, action_config,
        min_spend, min_days_active, min_conversions,
        priority, applies_to, campaign_ids
    } = json;

    const { data: rule, error } = await (supabase as any)
        .from('performance_rules')
        .insert({
            user_id: user.id,
            name,
            description,
            metric,
            comparison,
            threshold_value,
            threshold_min,
            threshold_max,
            action_type,
            action_config,
            min_spend: min_spend || 50,
            min_days_active: min_days_active || 7,
            min_conversions: min_conversions || 3,
            priority: priority || 10,
            applies_to: applies_to || 'all',
            campaign_ids: campaign_ids || [],
            is_active: true
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rule });
}

export async function PUT(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const { id, ...updates } = json;

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data: rule, error } = await (supabase as any)
        .from('performance_rules')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rule });
}

export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await (supabase as any)
        .from('performance_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
