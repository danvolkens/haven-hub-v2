import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/popups - List popups
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  let query = (supabase as any)
    .from('popups')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: popups, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ popups });
}

// POST /api/popups - Create popup
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: popup, error } = await (supabase as any)
    .from('popups')
    .insert({
      user_id: user.id,
      name: body.name,
      trigger_type: body.trigger_type || 'exit_intent',
      trigger_config: body.trigger_config || {},
      content: body.content || { type: 'announcement' },
      targeting: body.targeting || {},
      frequency_cap: body.frequency_cap || { type: 'once_per_session' },
      position: body.position || 'center',
      animation: body.animation || 'fade',
      overlay_opacity: body.overlay_opacity ?? 50,
      close_on_overlay_click: body.close_on_overlay_click ?? true,
      show_close_button: body.show_close_button ?? true,
      style: body.style || {},
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ popup }, { status: 201 });
}
