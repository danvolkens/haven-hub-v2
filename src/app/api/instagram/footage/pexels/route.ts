import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/instagram/footage/pexels - Fetch Pexels video metadata
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || !url.includes('pexels.com')) {
      return NextResponse.json({ error: 'Invalid Pexels URL' }, { status: 400 });
    }

    // Extract video ID from URL
    const videoIdMatch = url.match(/\/video\/[^/]+-(\d+)\/?/) || url.match(/\/video\/(\d+)\/?/);
    if (!videoIdMatch) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    const videoId = videoIdMatch[1];

    // Get Pexels API key from vault
    let apiKey = '';
    try {
      const { data } = await (supabase as any).rpc('get_credential', {
        p_user_id: user.id,
        p_provider: 'pexels',
        p_credential_type: 'api_key',
      });
      apiKey = data;
    } catch {
      return NextResponse.json({ error: 'Pexels API key not configured' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Pexels API key not configured' }, { status: 400 });
    }

    // Fetch video metadata from Pexels
    const response = await fetch(`https://api.pexels.com/videos/videos/${videoId}`, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch video from Pexels' }, { status: 400 });
    }

    const video = await response.json();

    // Find best quality video file
    const videoFiles = video.video_files || [];
    const bestFile = videoFiles.reduce((best: any, file: any) => {
      if (!best || (file.height > best.height && file.quality === 'hd')) {
        return file;
      }
      return best;
    }, null);

    if (!bestFile) {
      return NextResponse.json({ error: 'No suitable video file found' }, { status: 400 });
    }

    const orientation = bestFile.height > bestFile.width ? 'portrait' : 'landscape';

    return NextResponse.json({
      pexels_id: video.id,
      url: bestFile.link,
      thumbnail_url: video.image,
      duration: video.duration,
      width: bestFile.width,
      height: bestFile.height,
      orientation,
      photographer: video.user?.name,
    });
  } catch (error) {
    console.error('Error fetching Pexels video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
