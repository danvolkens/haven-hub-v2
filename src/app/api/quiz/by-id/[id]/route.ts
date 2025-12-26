import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and delete (cascade will handle questions/answers/results)
    const { error } = await (supabase as any)
      .from('quizzes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: quiz, error } = await (supabase as any)
      .from('quizzes')
      .select(`
        *,
        questions:quiz_questions(
          id,
          text:question_text,
          type:question_type,
          position,
          answers:quiz_answers(
            id,
            text:answer_text,
            position,
            scores
          )
        ),
        results:quiz_results(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Sort questions and answers by position
    if (quiz.questions) {
      quiz.questions.sort((a: any, b: any) => a.position - b.position);
      quiz.questions.forEach((q: any) => {
        if (q.answers) {
          q.answers.sort((a: any, b: any) => a.position - b.position);
        }
      });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json({ error: 'Failed to load quiz' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, slug, requireEmail, questions, results } = body;

    // Verify ownership
    const { data: existingQuiz } = await (supabase as any)
      .from('quizzes')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Update quiz
    const { error: updateError } = await (supabase as any)
      .from('quizzes')
      .update({
        title,
        description,
        slug,
        require_email: requireEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Delete old questions (cascade deletes answers)
    await (supabase as any)
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', id);

    // Delete old results
    await (supabase as any)
      .from('quiz_results')
      .delete()
      .eq('quiz_id', id);

    // Insert new questions
    if (questions && questions.length > 0) {
      for (const [qi, q] of questions.entries()) {
        const { data: questionData, error: questionError } = await (supabase as any)
          .from('quiz_questions')
          .insert({
            quiz_id: id,
            question_text: q.text,
            question_type: q.type || 'single',
            position: qi,
          })
          .select('id')
          .single();

        if (questionError) throw questionError;

        // Insert answers
        if (q.answers && q.answers.length > 0) {
          const answersToInsert = q.answers.map((a: any, ai: number) => ({
            question_id: questionData.id,
            answer_text: a.text,
            position: ai,
            scores: a.scores || { grounding: 0, wholeness: 0, growth: 0 },
          }));

          const { error: answersError } = await (supabase as any)
            .from('quiz_answers')
            .insert(answersToInsert);

          if (answersError) throw answersError;
        }
      }
    }

    // Insert new results
    if (results && results.length > 0) {
      const resultsToInsert = results.map((r: any) => ({
        quiz_id: id,
        collection: r.collection,
        title: r.title,
        description: r.description,
        cta_text: r.ctaText,
        cta_url: r.ctaUrl,
      }));

      const { error: resultsError } = await (supabase as any)
        .from('quiz_results')
        .insert(resultsToInsert);

      if (resultsError) throw resultsError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}
