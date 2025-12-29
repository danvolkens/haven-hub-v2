import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get published pins that can be promoted
    const { data: pins, error } = await (supabase as any)
      .from('pins')
      .select(`
        id,
        pinterest_pin_id,
        title,
        description,
        status,
        assets:asset_id (
          file_url,
          thumbnail_url
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'published')
      .not('pinterest_pin_id', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching pins:', error);
      // Return empty array if table doesn't exist
      return NextResponse.json({ pins: [] });
    }

    // Transform to expected format
    const transformedPins = (pins || []).map((pin: any) => ({
      id: pin.id,
      pinterest_pin_id: pin.pinterest_pin_id,
      title: pin.title || 'Untitled Pin',
      image_url: pin.assets?.thumbnail_url || pin.assets?.file_url || '',
      status: pin.status,
    }));

    return NextResponse.json({ pins: transformedPins });
  } catch (error) {
    console.error('Error fetching pins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
