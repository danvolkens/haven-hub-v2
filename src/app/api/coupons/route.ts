import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCoupon, getCouponStats } from '@/lib/coupons/coupon-service';

// GET /api/coupons - List coupons
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const includeStats = searchParams.get('stats') === 'true';

  let query = (supabase as any)
    .from('coupons')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: coupons, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: Record<string, unknown> = { coupons };

  if (includeStats) {
    response.stats = await getCouponStats(user.id);
  }

  return NextResponse.json(response);
}

// POST /api/coupons - Create coupon
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const coupon = await createCoupon(user.id, body);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
