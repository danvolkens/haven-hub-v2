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
    const status = searchParams.get('status');
    const requiresReview = searchParams.get('requires_review');
    const postType = searchParams.get('post_type');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = (supabase as any)
      .from('instagram_scheduled_posts')
      .select(`
        *,
        quotes:quote_id (
          text,
          attribution,
          collection
        ),
        instagram_templates:template_id (
          name
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (requiresReview === 'true') {
      query = query.eq('requires_review', true);
    }

    if (postType) {
      query = query.eq('post_type', postType);
    }

    // Date range filtering for calendar view
    if (start) {
      query = query.gte('scheduled_at', start);
    }
    if (end) {
      query = query.lte('scheduled_at', end);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to expected format for review page and calendar
    const transformedPosts = (posts || []).map((post: any) => ({
      id: post.id,
      quote_id: post.quote_id,
      quote_text: post.quotes?.text || '',
      post_type: post.post_type || 'feed',
      content_pillar: post.content_pillar || 'product_showcase',
      status: post.status,
      scheduled_at: post.scheduled_at,
      caption: post.caption,
      caption_preview: post.caption?.substring(0, 100),
      hashtags: post.hashtags || [],
      asset_url: post.media_urls?.[0],
      thumbnail_url: post.thumbnail_url || post.media_urls?.[0],
      requires_review: post.requires_review,
      created_at: post.created_at,
      quotes: post.quotes ? {
        text: post.quotes.text,
        author: post.quotes.attribution,
        collection: post.quotes.collection,
      } : null,
      instagram_templates: post.instagram_templates,
    }));

    return NextResponse.json(transformedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const {
      quote_id,
      template_id,
      post_type,
      content_pillar,
      caption,
      hashtags,
      media_urls,
      scheduled_for,  // Accept from frontend
      scheduled_at: scheduled_at_direct,  // Also accept scheduled_at directly
      requires_review,
    } = body;

    // Use scheduled_at if provided directly, otherwise use scheduled_for
    const scheduled_at = scheduled_at_direct || scheduled_for;

    // Get user settings to check operator mode
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', user.id)
      .single();

    const operatorMode = settings?.guardrails?.operator_mode || 'supervised';
    const shouldRequireReview = operatorMode !== 'autopilot' && (requires_review !== false);

    const { data: post, error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .insert({
        user_id: user.id,
        quote_id,
        template_id,
        post_type: post_type || 'feed',
        content_pillar: content_pillar || 'product_showcase',
        caption,
        hashtags: hashtags || [],
        media_urls: media_urls || [],
        scheduled_at,
        status: shouldRequireReview ? 'draft' : 'scheduled',
        requires_review: shouldRequireReview,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
