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
          text,
          attribution,
          collection
        ),
        instagram_templates:template_id (
          name
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Transform to expected format
    const transformedPost = {
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
      caption,
      post_type,
      content_pillar,
      hashtags,
      scheduled_at,
      scheduled_for,  // Accept from frontend
      media_urls,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (caption !== undefined) updateData.caption = caption;
    if (post_type !== undefined) updateData.post_type = post_type;
    if (content_pillar !== undefined) updateData.content_pillar = content_pillar;
    if (hashtags !== undefined) updateData.hashtags = hashtags;
    if (media_urls !== undefined) updateData.media_urls = media_urls;
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
