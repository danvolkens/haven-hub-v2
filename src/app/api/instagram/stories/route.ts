import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get stories for the specified date
    const { data: stories, error } = await (supabase as any)
      .from('instagram_stories')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_for', `${date}T00:00:00`)
      .lte('scheduled_for', `${date}T23:59:59`)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error fetching stories:', error);
      return NextResponse.json({ stories: [] });
    }

    return NextResponse.json({ stories: stories || [] });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      template_id,
      scheduled_for,
      media_url,
      overlay_text,
      link_url,
      is_auto_generated,
    } = body;

    const { data: story, error } = await (supabase as any)
      .from('instagram_stories')
      .insert({
        user_id: user.id,
        template_id,
        scheduled_for,
        media_url,
        overlay_text,
        link_url,
        is_auto_generated: is_auto_generated || false,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating story:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
