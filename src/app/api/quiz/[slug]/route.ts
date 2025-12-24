import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public endpoint - no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        slug,
        show_results_immediately,
        require_email,
        questions:quiz_questions(
          id,
          question_text,
          question_type,
          position,
          image_url,
          help_text,
          is_required,
          answers:quiz_answers(
            id,
            answer_text,
            position,
            image_url
          )
        )
      `)
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Sort questions and answers by position
    (quiz as any).questions.sort((a: any, b: any) => a.position - b.position);
    (quiz as any).questions.forEach((q: any) => {
      q.answers.sort((a: any, b: any) => a.position - b.position);
    });

    // Track quiz start
    await supabase.rpc('increment_quiz_starts', { quiz_id: quiz.id });

    return NextResponse.json({ quiz });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load quiz' },
      { status: 500 }
    );
  }
}
