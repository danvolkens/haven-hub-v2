import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/instagram/music - Get music tracks
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');
    const mood = searchParams.get('mood');
    const search = searchParams.get('search');

    let query = (supabase as any)
      .from('music_tracks')
      .select('*')
      .eq('user_id', user.id);

    if (collection && collection !== 'all') {
      query = query.eq('collection', collection);
    }

    if (mood) {
      query = query.contains('mood_tags', [mood]);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching music:', error);
      return NextResponse.json({ error: 'Failed to fetch music' }, { status: 500 });
    }

    // Get pool health stats
    const { data: poolStats } = await (supabase as any)
      .from('music_tracks')
      .select('collection, usage_count')
      .eq('user_id', user.id);

    const collections = ['grounding', 'wholeness', 'growth', 'general'];
    const poolHealth: Record<string, { count: number; unused: number; status: string }> = {};

    collections.forEach((col) => {
      const colTracks = poolStats?.filter((t: any) => t.collection === col) || [];
      const count = colTracks.length;
      const unused = colTracks.filter((t: any) => t.usage_count === 0).length;

      poolHealth[col] = {
        count,
        unused,
        status: count >= 15 ? 'good' : count >= 8 ? 'low' : 'critical',
      };
    });

    return NextResponse.json({
      tracks: data || [],
      poolHealth,
    });
  } catch (error) {
    console.error('Error in music API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/instagram/music - Add new music track
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, artist, url, duration, bpm, collection, mood_tags, notes, license_source } = body;

    if (!title || !url || !collection) {
      return NextResponse.json({ error: 'Title, URL, and collection are required' }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from('music_tracks')
      .insert({
        user_id: user.id,
        title,
        artist,
        url,
        duration: duration || 0,
        bpm: bpm || null,
        collection,
        mood_tags: mood_tags || [],
        notes,
        license_source,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding music:', error);
      return NextResponse.json({ error: 'Failed to add track' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in music POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
