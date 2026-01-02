import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateUTMParams,
  generateTrackingUrl,
  generateLinkInBioUrls,
  recordAttribution,
  recordConversion,
  updateSessionPages,
  getConversionFunnel,
  getTopConvertingPosts,
  getPillarConversions,
} from '@/lib/tiktok/attribution';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'funnel';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '10');

    switch (action) {
      case 'funnel': {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const funnel = await getConversionFunnel(start, end);
        return NextResponse.json(funnel);
      }

      case 'top-posts': {
        const posts = await getTopConvertingPosts(limit);
        return NextResponse.json(posts);
      }

      case 'pillars': {
        const pillars = await getPillarConversions();
        return NextResponse.json(pillars);
      }

      case 'full-dashboard': {
        // Get all attribution data for dashboard
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const [funnel, topPosts, pillars] = await Promise.all([
          getConversionFunnel(start, end),
          getTopConvertingPosts(limit),
          getPillarConversions(),
        ]);

        return NextResponse.json({
          funnel,
          topPosts,
          pillars,
        });
      }

      case 'generate-utm': {
        const postId = searchParams.get('post_id');
        const pillar = searchParams.get('pillar');

        if (!postId || !pillar) {
          return NextResponse.json(
            { error: 'post_id and pillar are required' },
            { status: 400 }
          );
        }

        const params = generateUTMParams(postId, pillar);
        return NextResponse.json(params);
      }

      case 'generate-url': {
        const postId = searchParams.get('post_id');
        const pillar = searchParams.get('pillar');
        const baseUrl = searchParams.get('base_url');

        if (!postId || !pillar || !baseUrl) {
          return NextResponse.json(
            { error: 'post_id, pillar, and base_url are required' },
            { status: 400 }
          );
        }

        const url = generateTrackingUrl(baseUrl, postId, pillar);
        return NextResponse.json({ url });
      }

      case 'generate-link-in-bio': {
        const postId = searchParams.get('post_id');
        const pillar = searchParams.get('pillar');
        const baseUrl = searchParams.get('base_url');

        if (!postId || !pillar || !baseUrl) {
          return NextResponse.json(
            { error: 'post_id, pillar, and base_url are required' },
            { status: 400 }
          );
        }

        const urls = generateLinkInBioUrls(baseUrl, postId, pillar);
        return NextResponse.json(urls);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in attribution API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, event, session_id, pages } = body;

    switch (action) {
      case 'record-session': {
        if (!event || !event.session_id) {
          return NextResponse.json(
            { error: 'event with session_id is required' },
            { status: 400 }
          );
        }

        const id = await recordAttribution(event);

        if (!id) {
          return NextResponse.json(
            { error: 'Failed to record attribution' },
            { status: 500 }
          );
        }

        return NextResponse.json({ id });
      }

      case 'record-conversion': {
        if (!event || !event.session_id || !event.event_type) {
          return NextResponse.json(
            { error: 'event with session_id and event_type is required' },
            { status: 400 }
          );
        }

        const success = await recordConversion(event);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to record conversion' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case 'update-pages': {
        if (!session_id || !pages) {
          return NextResponse.json(
            { error: 'session_id and pages are required' },
            { status: 400 }
          );
        }

        const success = await updateSessionPages(session_id, pages);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to update pages' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in attribution API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
