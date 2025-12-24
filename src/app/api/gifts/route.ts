import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGift } from '@/lib/gifts/gift-service';

// GET /api/gifts - List gifts
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  let query = (supabase as any)
    .from('gifts')
    .select(`
      *,
      sender:customers!sender_customer_id(email, first_name, last_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: gifts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ gifts });
}

// POST /api/gifts - Create gift
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    // Find customer if exists
    const { data: customer } = await (supabase as any)
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', body.sender_email)
      .single();

    const gift = await createGift(user.id, customer?.id || null, body);
    return NextResponse.json({ gift }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create gift' },
      { status: 500 }
    );
  }
}
