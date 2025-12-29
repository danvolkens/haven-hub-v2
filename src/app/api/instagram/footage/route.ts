import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/instagram/footage - Get stock footage
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
    const sortBy = searchParams.get('sort') || 'created_at';
    const portraitOnly = searchParams.get('portrait') !== 'false';

    let query = (supabase as any)
      .from('stock_footage')
      .select('*')
      .eq('user_id', user.id);

    if (collection && collection !== 'all') {
      query = query.eq('collection', collection);
    }

    if (mood) {
      query = query.contains('mood_tags', [mood]);
    }

    if (portraitOnly) {
      query = query.eq('orientation', 'portrait');
    }

    // Sort
    if (sortBy === 'least_used') {
      query = query.order('usage_count', { ascending: true });
    } else if (sortBy === 'most_used') {
      query = query.order('usage_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching footage:', error);
      return NextResponse.json({ error: 'Failed to fetch footage' }, { status: 500 });
    }

    // Get pool health stats
    const { data: poolStats } = await (supabase as any)
      .from('stock_footage')
      .select('collection, usage_count')
      .eq('user_id', user.id);

    const collections = ['grounding', 'wholeness', 'growth', 'general'];
    const poolHealth: Record<string, { count: number; unused: number; status: string }> = {};

    collections.forEach((col) => {
      const colFootage = poolStats?.filter((f: any) => f.collection === col) || [];
      const count = colFootage.length;
      const unused = colFootage.filter((f: any) => f.usage_count === 0).length;

      poolHealth[col] = {
        count,
        unused,
        status: count >= 20 ? 'good' : count >= 10 ? 'low' : 'critical',
      };
    });

    return NextResponse.json({
      footage: data || [],
      poolHealth,
    });
  } catch (error) {
    console.error('Error in footage API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/instagram/footage - Add new footage
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pexels_id, url, thumbnail_url, duration, width, height, collection, mood_tags, notes } = body;

    // Determine orientation
    const orientation = height > width ? 'portrait' : 'landscape';

    if (orientation === 'landscape') {
      return NextResponse.json({
        error: 'Landscape videos are not supported. Please use portrait videos only.',
      }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from('stock_footage')
      .insert({
        user_id: user.id,
        source: 'pexels',
        source_id: pexels_id,
        source_url: url, // Original Pexels URL
        video_url: url,  // Direct video URL (same as source for Pexels)
        url,             // Alias column
        thumbnail_url,
        duration,
        duration_seconds: duration, // Original column name
        width,
        height,
        orientation,
        collection,
        mood_tags: mood_tags || [],
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding footage:', error);
      return NextResponse.json({ error: 'Failed to add footage' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in footage POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
