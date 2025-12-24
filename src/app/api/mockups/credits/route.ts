import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();

    const { data, error } = await (supabase as any).rpc('get_credit_usage', {
      p_user_id: userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0] || {
      total_used: 0,
      monthly_used: 0,
      annual_budget: 3500,
      monthly_soft_limit: 292,
      remaining_annual: 3500,
      remaining_monthly: 292,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
