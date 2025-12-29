/**
 * API Route: Quiz CTA Distribution
 * Get quiz CTAs and check/manage usage
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getQuizCTA,
  getQuizCTAUsage,
  shouldAppendQuizCTA,
  appendQuizCTA,
  getEveningQuizStory,
  getAllCTATemplates,
  type CTAType,
} from '@/lib/instagram/quiz-cta';

// GET - Get quiz CTA or usage stats
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
    const type = searchParams.get('type') as CTAType | null;

    switch (action) {
      case 'usage':
        const usage = await getQuizCTAUsage();
        return NextResponse.json(usage);

      case 'evening-story':
        const storyData = await getEveningQuizStory();
        return NextResponse.json(storyData);

      case 'templates':
        const templates = getAllCTATemplates();
        return NextResponse.json(templates);

      default:
        if (type && ['subtle', 'direct', 'story'].includes(type)) {
          const cta = await getQuizCTA(type);
          return NextResponse.json(cta);
        }
        // Return all templates by default
        return NextResponse.json(getAllCTATemplates());
    }
  } catch (error) {
    console.error('Quiz CTA API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz CTA' },
      { status: 500 }
    );
  }
}

// POST - Check if caption should have CTA or append CTA
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
    const { action, caption } = body as {
      action: 'check' | 'append';
      caption: string;
    };

    if (!caption) {
      return NextResponse.json(
        { error: 'Caption is required' },
        { status: 400 }
      );
    }

    if (action === 'check') {
      const shouldAppend = await shouldAppendQuizCTA(caption);
      return NextResponse.json({ shouldAppend });
    }

    if (action === 'append') {
      const updatedCaption = await appendQuizCTA(caption);
      return NextResponse.json({
        originalCaption: caption,
        updatedCaption,
        ctaAppended: updatedCaption !== caption,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check" or "append"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Quiz CTA append API error:', error);
    return NextResponse.json(
      { error: 'Failed to process caption' },
      { status: 500 }
    );
  }
}
