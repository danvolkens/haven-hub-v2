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
        id,
        user_id,
        quote_id,
        template_id,
        content_pillar,
        primary_asset_id,
        additional_assets,
        video_asset_id,
        thumbnail_asset_id,
        post_type,
        caption,
        hashtags,
        alt_text,
        product_id,
        include_shopping_tag,
        location_id,
        location_name,
        crosspost_to_facebook,
        scheduled_at,
        timezone,
        status,
        published_at,
        instagram_media_id,
        facebook_media_id,
        requires_review,
        reviewed_at,
        campaign_tag,
        error_message,
        retry_count,
        created_at,
        updated_at,
        quotes:quote_id (
          text,
          attribution,
          collection
        ),
        instagram_templates:template_id (
          name
        ),
        primary_asset:primary_asset_id (
          file_url,
          thumbnail_url
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
      // Return error response so frontend can handle it properly
      return NextResponse.json({ error: error.message, posts: [] }, { status: 500 });
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
      alt_text: post.alt_text,
      asset_url: post.primary_asset?.file_url,
      thumbnail_url: post.primary_asset?.thumbnail_url || post.primary_asset?.file_url,
      primary_asset_id: post.primary_asset_id,
      additional_assets: post.additional_assets || [],
      product_id: post.product_id,
      include_shopping_tag: post.include_shopping_tag,
      campaign_tag: post.campaign_tag,
      crosspost_to_facebook: post.crosspost_to_facebook,
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
      alt_text,
      product_id,
      include_shopping_tag,
      campaign_tag,
      crosspost_to_facebook,
      primary_asset_id,
      additional_assets,
      video_asset_id,
      thumbnail_asset_id,
      location_id,
      location_name,
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
        quote_id: quote_id || null,
        template_id: template_id || null,
        post_type: post_type || 'feed',
        content_pillar: content_pillar || 'product_showcase',
        caption,
        hashtags: hashtags || [],
        alt_text: alt_text || null,
        product_id: product_id || null,
        include_shopping_tag: include_shopping_tag ?? true,
        campaign_tag: campaign_tag || null,
        crosspost_to_facebook: crosspost_to_facebook ?? true,
        primary_asset_id: primary_asset_id || null,
        additional_assets: additional_assets || [],
        video_asset_id: video_asset_id || null,
        thumbnail_asset_id: thumbnail_asset_id || null,
        location_id: location_id || null,
        location_name: location_name || null,
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
