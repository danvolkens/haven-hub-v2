import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const category = searchParams.get('category');

  let query = (supabase as any)
    .from('design_templates')
    .select('*')
    .eq('is_active', true)
    .order('is_system', { ascending: false })
    .order('usage_count', { ascending: false });

  // Include system templates + user's templates
  if (user) {
    query = query.or(`is_system.eq.true,user_id.eq.${user.id}`);
  } else {
    query = query.eq('is_system', true);
  }

  if (type) query = query.eq('type', type);
  if (category) query = query.eq('category', category);

  const { data: templates, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: template, error } = await (supabase as any)
    .from('design_templates')
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description,
      type: body.type || 'quote',
      category: body.category,
      layout: body.layout || {},
      typography: body.typography || {},
      colors: body.colors || {},
      decorations: body.decorations || {},
      compatible_formats: body.compatible_formats || [],
      compatible_moods: body.compatible_moods || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
