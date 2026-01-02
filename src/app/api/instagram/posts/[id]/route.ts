import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/instagram/posts/[id] - Get a single post
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: post, error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .select(`
        *,
        quotes:quote_id (
          id,
          text,
          attribution,
          collection
        ),
        instagram_templates:template_id (
          id,
          name
        ),
        primary_asset:primary_asset_id (
          id,
          file_url,
          thumbnail_url,
          format
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Transform to expected format - include ALL fields for edit mode
    const transformedPost = {
      id: post.id,
      quote_id: post.quote_id,
      quote_text: post.quotes?.text || '',
      template_id: post.template_id,
      post_type: post.post_type || 'feed',
      content_pillar: post.content_pillar || 'product_showcase',
      status: post.status,
      scheduled_at: post.scheduled_at,
      caption: post.caption,
      caption_preview: post.caption?.substring(0, 100),
      hashtags: post.hashtags || [],
      hashtags_as_comment: post.hashtags_as_comment ?? true,
      alt_text: post.alt_text || '',
      product_id: post.product_id,
      campaign_tag: post.campaign_tag,
      crosspost_to_facebook: post.crosspost_to_facebook ?? false,
      primary_asset_id: post.primary_asset_id,
      additional_assets: post.additional_assets || [],
      asset_url: post.primary_asset?.file_url || post.media_urls?.[0],
      thumbnail_url: post.primary_asset?.thumbnail_url || post.primary_asset?.file_url || post.media_urls?.[0],
      requires_review: post.requires_review,
      created_at: post.created_at,
      quotes: post.quotes ? {
        id: post.quotes.id,
        text: post.quotes.text,
        author: post.quotes.attribution,
        collection: post.quotes.collection,
      } : null,
      instagram_templates: post.instagram_templates,
      primary_asset: post.primary_asset ? {
        id: post.primary_asset.id,
        url: post.primary_asset.file_url,
        thumbnail_url: post.primary_asset.thumbnail_url,
        // Assets from quotes table are always images; format is the platform format (instagram_post, etc.)
        type: 'image',
        format: post.primary_asset.format,
      } : null,
    };

    return NextResponse.json(transformedPost);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/instagram/posts/[id] - Update a post
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      quote_id,
      template_id,
      caption,
      post_type,
      content_pillar,
      hashtags,
      hashtags_as_comment,
      alt_text,
      product_id,
      campaign_tag,
      crosspost_to_facebook,
      primary_asset_id,
      additional_assets,
      scheduled_at,
      scheduled_for,  // Accept from frontend
      media_urls,
      requires_review,
      status,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (quote_id !== undefined) updateData.quote_id = quote_id || null;
    if (template_id !== undefined) updateData.template_id = template_id || null;
    if (caption !== undefined) updateData.caption = caption;
    if (post_type !== undefined) updateData.post_type = post_type;
    if (content_pillar !== undefined) updateData.content_pillar = content_pillar;
    if (hashtags !== undefined) updateData.hashtags = hashtags;
    if (hashtags_as_comment !== undefined) updateData.hashtags_as_comment = hashtags_as_comment;
    if (alt_text !== undefined) updateData.alt_text = alt_text || null;
    if (product_id !== undefined) updateData.product_id = product_id || null;
    if (campaign_tag !== undefined) updateData.campaign_tag = campaign_tag || null;
    if (crosspost_to_facebook !== undefined) updateData.crosspost_to_facebook = crosspost_to_facebook;
    if (primary_asset_id !== undefined) updateData.primary_asset_id = primary_asset_id || null;
    if (additional_assets !== undefined) updateData.additional_assets = additional_assets;
    if (media_urls !== undefined) updateData.media_urls = media_urls;
    if (requires_review !== undefined) updateData.requires_review = requires_review;
    if (status !== undefined) updateData.status = status;
    if (scheduled_at !== undefined || scheduled_for !== undefined) {
      updateData.scheduled_at = scheduled_at || scheduled_for;
    }

    const { data: post, error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/instagram/posts/[id] - Delete a post
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
