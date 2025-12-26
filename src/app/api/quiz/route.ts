import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

interface CreateQuizRequest {
  title: string;
  description?: string;
  slug: string;
  requireEmail: boolean;
  questions: {
    text: string;
    type: 'single' | 'multiple';
    position: number;
    answers: {
      text: string;
      position: number;
      scores: { grounding: number; wholeness: number; growth: number };
    }[];
  }[];
  results: {
    collection: 'grounding' | 'wholeness' | 'growth';
    title: string;
    description: string;
    ctaText: string;
    ctaUrl: string;
  }[];
}

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await (supabase as any)
      .from('quizzes')
      .select('*, questions:quiz_questions(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quizzes: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body: CreateQuizRequest = await request.json();
    const supabase = await createServerSupabaseClient();

    // Check slug uniqueness
    const { data: existing } = await (supabase as any)
      .from('quizzes')
      .select('id')
      .eq('user_id', userId)
      .eq('slug', body.slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Quiz with this slug already exists' }, { status: 400 });
    }

    // Create quiz
    const { data: quiz, error: quizError } = await (supabase as any)
      .from('quizzes')
      .insert({
        user_id: userId,
        title: body.title,
        description: body.description || null,
        slug: body.slug,
        require_email: body.requireEmail,
        scoring_method: 'weighted',
        status: 'draft',
      })
      .select()
      .single();

    if (quizError) {
      return NextResponse.json({ error: quizError.message }, { status: 500 });
    }

    // Create questions and answers
    for (const question of body.questions) {
      const { data: q, error: qError } = await (supabase as any)
        .from('quiz_questions')
        .insert({
          quiz_id: quiz.id,
          user_id: userId,
          question_text: question.text,
          question_type: question.type,
          position: question.position,
          is_required: true,
        })
        .select()
        .single();

      if (qError) {
        console.error('Error creating question:', qError);
        continue;
      }

      // Create answers
      for (const answer of question.answers) {
        await (supabase as any)
          .from('quiz_answers')
          .insert({
            question_id: q.id,
            user_id: userId,
            answer_text: answer.text,
            position: answer.position,
            scores: answer.scores,
          });
      }
    }

    // Create result definitions
    for (const result of body.results) {
      await (supabase as any)
        .from('quiz_results')
        .insert({
          quiz_id: quiz.id,
          user_id: userId,
          collection: result.collection,
          title: result.title,
          description: result.description,
          cta_text: result.ctaText,
          cta_url: result.ctaUrl,
        });
    }

    return NextResponse.json({ success: true, quiz });
  } catch (error) {
    console.error('Quiz creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
