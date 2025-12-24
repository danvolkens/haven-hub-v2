import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addContent, getWinners, getUnadaptedWinners } from '@/lib/cross-platform/cross-platform-service';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const winnersOnly = searchParams.get('winners') === 'true';
  const unadaptedOnly = searchParams.get('unadapted') === 'true';

  if (unadaptedOnly) {
    const content = await getUnadaptedWinners(user.id);
    return NextResponse.json({ content });
  }

  if (winnersOnly) {
    const content = await getWinners(user.id);
    return NextResponse.json({ content });
  }

  const { data: content } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ content: content || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const content = await addContent(user.id, body);
    return NextResponse.json({ content }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add content' },
      { status: 500 }
    );
  }
}
