/**
 * API Route: TikTok Caption Templates and Hashtags
 * Prompts J.1 and J.2
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateTikTokHashtags,
  getTikTokCaptionTemplates,
  getAllHashtagGroups,
  getHashtagsByTier,
  getSuggestedHashtagsForCollection,
  applyCaptionTemplate,
  type ContentType,
  type Collection,
  type HashtagTier,
} from '@/lib/tiktok/hashtag-generator';

// GET - Get caption templates or generate hashtags
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'templates': {
        // Get caption templates
        const contentPillar = searchParams.get('pillar') as ContentType | undefined;
        const templates = await getTikTokCaptionTemplates(
          contentPillar || undefined
        );
        return NextResponse.json(templates);
      }

      case 'generate-hashtags': {
        // Generate hashtags using 5-5-5 method
        const collection = (searchParams.get('collection') as Collection) || 'any';
        const contentType = (searchParams.get('content_type') as ContentType) || 'quote_reveal';

        const result = await generateTikTokHashtags(collection, contentType);
        return NextResponse.json(result);
      }

      case 'hashtag-groups': {
        // Get all hashtag groups
        const tier = searchParams.get('tier') as HashtagTier | undefined;
        const groups = tier
          ? await getHashtagsByTier(tier)
          : await getAllHashtagGroups();
        return NextResponse.json(groups);
      }

      case 'suggested-hashtags': {
        // Get suggested hashtags for a collection
        const collection = (searchParams.get('collection') as Collection) || 'any';
        const hashtags = await getSuggestedHashtagsForCollection(collection);
        return NextResponse.json({ hashtags });
      }

      default:
        // Return all templates by default
        const allTemplates = await getTikTokCaptionTemplates();
        return NextResponse.json(allTemplates);
    }
  } catch (error) {
    console.error('TikTok captions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST - Apply template or generate complete caption
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'apply-template': {
        // Apply variables to a template
        const { template, variables } = body as {
          template: string;
          variables: Record<string, string>;
        };

        if (!template) {
          return NextResponse.json(
            { error: 'Template required' },
            { status: 400 }
          );
        }

        // Generate hashtags if not provided
        let hashtags = variables.hashtags || '';
        if (!hashtags) {
          const collection = (variables.collection as Collection) || 'any';
          const contentType = (variables.content_type as ContentType) || 'quote_reveal';
          const generated = await generateTikTokHashtags(collection, contentType);
          hashtags = generated.formatted;
        }

        const applied = applyCaptionTemplate(template, {
          ...variables,
          hashtags,
        });

        return NextResponse.json({ caption: applied, hashtags });
      }

      case 'generate-full-caption': {
        // Generate a complete caption with template, hook, quote, and hashtags
        const {
          templateId,
          hookText,
          quoteText,
          collection,
          contentType,
          additionalVariables = {},
        } = body as {
          templateId: string;
          hookText: string;
          quoteText?: string;
          collection?: Collection;
          contentType?: ContentType;
          additionalVariables?: Record<string, string>;
        };

        // Get template
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: template } = await (supabase as any)
          .from('tiktok_caption_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (!template) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          );
        }

        // Generate hashtags
        const hashtags = await generateTikTokHashtags(
          collection || 'any',
          contentType || template.content_pillar
        );

        // Apply template
        const caption = applyCaptionTemplate(template.template_text, {
          hook_text: hookText,
          quote_text: quoteText || '',
          hashtags: hashtags.formatted,
          ...additionalVariables,
        });

        return NextResponse.json({
          caption,
          hashtags: hashtags.hashtags,
          hashtagsFormatted: hashtags.formatted,
          template: template.name,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('TikTok captions POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
