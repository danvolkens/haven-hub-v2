import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyBudgetChange, pauseCampaign } from '@/lib/services/performance-engine';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const { data: actions, error } = await (supabase as any)
        .from('performance_actions')
        .select('*, performance_rules(name)')
        .eq('user_id', user.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ actions });
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json();
    const { action_id, decision, reason } = json;

    if (!action_id || !decision || !['approve', 'reject'].includes(decision)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data: action } = await (supabase as any)
        .from('performance_actions')
        .select('*')
        .eq('id', action_id)
        .eq('user_id', user.id)
        .single();

    if (!action) {
        return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    if (action.status !== 'pending') {
        return NextResponse.json({ error: 'Action is not pending' }, { status: 400 });
    }

    if (decision === 'reject') {
        await (supabase as any)
            .from('performance_actions')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                approved_by: user.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', action_id);

        return NextResponse.json({ success: true });
    }

    // Approve and Apply
    try {
        const { action_type, new_value, campaign_id } = action;
        const { data: campaign } = await supabase
            .from('ad_campaigns')
            .select('pinterest_campaign_id')
            .eq('id', campaign_id)
            .single();

        if (!campaign) throw new Error('Campaign not found');

        if (action_type === 'increase_budget' || action_type === 'decrease_budget') {
            const newBudget = new_value.daily_budget || new_value.daily_spend_cap;
            if (campaign.pinterest_campaign_id) {
                await applyBudgetChange(
                    user.id,
                    campaign.pinterest_campaign_id,
                    newBudget * 1000000
                );
            }

            await supabase
                .from('ad_campaigns')
                .update({ daily_spend_cap: newBudget })
                .eq('id', campaign_id);
        } else if (action_type === 'pause') {
            if (campaign.pinterest_campaign_id) {
                await pauseCampaign(user.id, campaign.pinterest_campaign_id);
            }

            await supabase
                .from('ad_campaigns')
                .update({ status: 'PAUSED' })
                .eq('id', campaign_id);
        }

        await (supabase as any)
            .from('performance_actions')
            .update({
                status: 'applied',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                executed_at: new Date().toISOString()
            })
            .eq('id', action_id);

        return NextResponse.json({ success: true });

    } catch (error) {
        await (supabase as any)
            .from('performance_actions')
            .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', action_id);

        return NextResponse.json({ error: 'Failed to apply action' }, { status: 500 });
    }
}
