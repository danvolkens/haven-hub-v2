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
    const contentPillar = searchParams.get('content_pillar');
    const templateType = searchParams.get('template_type');

    // Get user's custom templates AND system templates
    let query = (supabase as any)
      .from('instagram_templates')
      .select('*')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .eq('is_active', true)
      .order('is_system', { ascending: true }) // User templates first
      .order('created_at', { ascending: false });

    if (contentPillar) {
      query = query.eq('content_pillar', contentPillar);
    }

    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    const { data: templates, error } = await query;

    if (error) {
      // Table might not exist - return default templates
      console.error('Error fetching templates:', error);
    }

    // If no templates found, return default hardcoded templates
    // Default templates use correct DB constraint values:
    // product_showcase, brand_story, educational, community
    if (!templates || templates.length === 0) {
      const defaultTemplates = [
        {
          id: 'default-inspiration',
          name: 'Inspiration Quote',
          template_type: 'feed',
          content_pillar: 'product_showcase',
          caption_template: '✨ {quote}\n\n{meaning}\n\nDouble tap if this resonates with you! 💫\n\n.',
          hashtag_group_ids: [],
          is_active: true,
          is_default: true,
        },
        {
          id: 'default-motivation',
          name: 'Monday Motivation',
          template_type: 'feed',
          content_pillar: 'brand_story',
          caption_template: '💪 Start your week with intention:\n\n"{quote}"\n— {author}\n\nWhat\'s your goal for this week? Share below! 👇\n\n.',
          hashtag_group_ids: [],
          is_active: true,
          is_default: true,
        },
        {
          id: 'default-education',
          name: 'Quote of the Day',
          template_type: 'feed',
          content_pillar: 'educational',
          caption_template: '📖 Today\'s wisdom:\n\n"{quote}"\n— {author}\n\n{cta}\n\n.',
          hashtag_group_ids: [],
          is_active: true,
          is_default: true,
        },
        {
          id: 'default-engagement',
          name: 'Engagement Ask',
          template_type: 'feed',
          content_pillar: 'community',
          caption_template: '💭 What does this quote mean to you?\n\n"{quote}"\n\nShare your thoughts in the comments! ⬇️\n\n.',
          hashtag_group_ids: [],
          is_active: true,
          is_default: true,
        },
        {
          id: 'default-reel',
          name: 'Reel Quote',
          template_type: 'reel',
          content_pillar: 'product_showcase',
          caption_template: '🎬 Words to live by:\n\n"{quote}"\n\nSave this for when you need a reminder 📌\n\n.',
          hashtag_group_ids: [],
          is_active: true,
          is_default: true,
        },
        {
          id: 'default-story',
          name: 'Story Quote',
          template_type: 'story',
          content_pillar: 'community',
          caption_template: 'Swipe up to shop this quote! ⬆️',
          hashtag_group_ids: [],
          is_active: true,
          is_default: true,
        },
      ];

      // Filter by content_pillar if specified
      let filtered = defaultTemplates;
      if (contentPillar) {
        filtered = filtered.filter(t => t.content_pillar === contentPillar);
      }
      if (templateType) {
        filtered = filtered.filter(t => t.template_type === templateType);
      }

      return NextResponse.json(filtered);
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
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
      name,
      template_type,
      content_pillar,
      caption_template,
      hashtag_group_ids,
    } = body;

    if (!name || !caption_template) {
      return NextResponse.json(
        { error: 'Name and caption template are required' },
        { status: 400 }
      );
    }

    const { data: template, error } = await (supabase as any)
      .from('instagram_templates')
      .insert({
        user_id: user.id,
        name,
        template_type: template_type || 'feed',
        content_pillar: content_pillar || 'inspiration',
        caption_template,
        hashtag_group_ids: hashtag_group_ids || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
