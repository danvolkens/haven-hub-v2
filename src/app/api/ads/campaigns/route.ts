import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { createCampaign } from '@/lib/pinterest/ads-service';

const createSchema = z.object({
  adAccountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  objective: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSIONS', 'CATALOG_SALES']),
  dailySpendCap: z.number().positive().optional(),
  lifetimeSpendCap: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  isSeasonal: z.boolean().optional(),
  seasonalEvent: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = (supabase as any)
      .from('ad_campaigns')
      .select(`
        *,
        ad_groups (
          id,
          name,
          status,
          total_spend,
          impressions,
          clicks
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ campaigns: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();

    const data = createSchema.parse(body);
    const result = await createCampaign(userId, data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      campaign: result.campaign,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
