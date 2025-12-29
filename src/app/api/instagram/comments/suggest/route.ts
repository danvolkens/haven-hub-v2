/**
 * API Route: Comment Response Suggestions
 * Returns AI-assisted response suggestions for Instagram comments
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  suggestCommentResponse,
  detectCommentCategory,
  validateResponse,
  type PostContext,
} from '@/lib/instagram/comment-suggestions';

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
    const { comment, context } = body as {
      comment: string;
      context?: PostContext;
    };

    if (!comment || typeof comment !== 'string') {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    const analysis = suggestCommentResponse(comment, context);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Comment suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// Validate a response before posting
export async function PUT(request: Request) {
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
    const { response } = body as { response: string };

    if (!response || typeof response !== 'string') {
      return NextResponse.json(
        { error: 'Response text is required' },
        { status: 400 }
      );
    }

    const validation = validateResponse(response);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Validate response API error:', error);
    return NextResponse.json(
      { error: 'Failed to validate response' },
      { status: 500 }
    );
  }
}
