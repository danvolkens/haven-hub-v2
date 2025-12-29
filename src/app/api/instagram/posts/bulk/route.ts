import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { posts } = body;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: 'No posts provided' }, { status: 400 });
    }

    // Get user settings to check operator mode
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', user.id)
      .single();

    const operatorMode = settings?.guardrails?.operator_mode || 'supervised';
    const shouldRequireReview = operatorMode !== 'autopilot';

    // Prepare posts for bulk insert
    const postsToInsert = await Promise.all(posts.map(async (post: any) => {
      // Get quote details if quote_id provided
      let quoteData = null;
      if (post.quote_id) {
        const { data } = await (supabase as any)
          .from('quotes')
          .select('text, attribution, collection')
          .eq('id', post.quote_id)
          .single();
        quoteData = data;
      }

      // Get asset for the quote if needed
      let primaryAssetId = null;
      if (post.quote_id) {
        const { data: assets } = await (supabase as any)
          .from('assets')
          .select('id')
          .eq('quote_id', post.quote_id)
          .eq('status', 'approved')
          .limit(1);

        if (assets && assets.length > 0) {
          primaryAssetId = assets[0].id;
        }
      }

      // Generate caption from template if using auto
      let caption = post.caption || '';
      if (!caption && quoteData) {
        caption = `"${quoteData.text}"`;
        if (quoteData.attribution) {
          caption += `\n\n— ${quoteData.attribution}`;
        }
      }

      // Generate hashtags if auto_hashtags is true
      let hashtags: string[] = [];
      if (post.auto_hashtags && quoteData?.collection) {
        const collectionHashtags: Record<string, string[]> = {
          grounding: ['#grounding', '#innerpeace', '#mindfulness', '#presence'],
          wholeness: ['#wholeness', '#healing', '#selfcare', '#wellness'],
          growth: ['#growth', '#personaldevelopment', '#motivation', '#inspiration'],
          general: ['#quotes', '#wisdom', '#dailyinspiration'],
        };
        hashtags = collectionHashtags[quoteData.collection] || collectionHashtags.general;
      }

      return {
        user_id: user.id,
        quote_id: post.quote_id || null,
        template_id: post.template_id || null,
        post_type: post.post_type || 'feed',
        content_pillar: post.content_pillar || 'product_showcase',
        caption,
        hashtags,
        alt_text: post.auto_alt_text ? 'Alt text will be generated on publish' : null,
        product_id: null,
        include_shopping_tag: post.add_shopping_tags ?? false,
        campaign_tag: post.campaign_id || null,
        crosspost_to_facebook: post.cross_post_facebook ?? false,
        primary_asset_id: primaryAssetId,
        additional_assets: [],
        scheduled_at: post.scheduled_at,
        status: shouldRequireReview ? 'draft' : 'scheduled',
        requires_review: shouldRequireReview,
      };
    }));

    // Bulk insert
    const { data: createdPosts, error } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .insert(postsToInsert)
      .select();

    if (error) {
      console.error('Error bulk creating posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      posts: createdPosts,
      count: createdPosts?.length || 0,
    });
  } catch (error) {
    console.error('Error in bulk post creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
