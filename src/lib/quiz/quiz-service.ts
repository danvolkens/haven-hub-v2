import { createServerSupabaseClient } from '@/lib/supabase/server';
import { syncLeadToKlaviyo } from '@/lib/integrations/klaviyo/lead-sync';
import type { Quiz, QuizResponse, QuizResult, SubmitQuizRequest, CollectionScores } from '@/types/quiz';

interface QuizSubmitResult {
  success: boolean;
  response?: QuizResponse;
  result?: QuizResult;
  error?: string;
}

export async function submitQuiz(
  request: SubmitQuizRequest,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<QuizSubmitResult> {
  const supabase = await createServerSupabaseClient();

  try {
    // Get quiz
    const { data: quiz } = await (supabase as any)
      .from('quizzes')
      .select('*, questions:quiz_questions(*, answers:quiz_answers(*))')
      .eq('id', request.quizId)
      .eq('status', 'active')
      .single();

    if (!quiz) {
      return { success: false, error: 'Quiz not found' };
    }

    // Calculate result
    const { data: calcResult } = await (supabase as any).rpc('calculate_quiz_result', {
      p_quiz_id: request.quizId,
      p_answers: request.answers,
    });

    if (!calcResult || calcResult.length === 0) {
      return { success: false, error: 'Failed to calculate result' };
    }

    const { result_collection, scores } = calcResult[0];

    // Create or update lead if email provided
    let leadId: string | null = null;

    if (request.email) {
      const { data: lead, error: leadError } = await (supabase as any)
        .from('leads')
        .upsert({
          user_id: quiz.user_id,
          email: request.email,
          first_name: request.firstName,
          source: 'quiz',
          quiz_id: quiz.id,
          quiz_results: {
            answers: request.answers,
            scores,
            recommendation: result_collection,
          },
          recommended_collection: result_collection,
        }, {
          onConflict: 'user_id,email',
        })
        .select()
        .single();

      if (lead) {
        leadId = lead.id;

        // Sync to Klaviyo with quiz segment
        const resultDef = await (supabase as any)
          .from('quiz_results')
          .select('klaviyo_segment_id')
          .eq('quiz_id', quiz.id)
          .eq('collection', result_collection)
          .single();

        if (resultDef.data?.klaviyo_segment_id) {
          await syncLeadToKlaviyo(quiz.user_id, lead, {
            listId: resultDef.data.klaviyo_segment_id,
            tags: [`quiz-${result_collection}`, `quiz-${quiz.slug}`],
          });
        }
      }
    }

    // Create quiz response
    const { data: response, error: responseError } = await (supabase as any)
      .from('quiz_responses')
      .insert({
        quiz_id: request.quizId,
        user_id: quiz.user_id,
        lead_id: leadId,
        answers: request.answers,
        scores,
        result_collection,
        completed_at: new Date().toISOString(),
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
      })
      .select()
      .single();

    if (responseError) {
      throw new Error(responseError.message);
    }

    // Update quiz completion count
    await (supabase as any)
      .from('quizzes')
      .update({ completions: quiz.completions + 1 })
      .eq('id', quiz.id);

    // Get result definition
    const { data: result } = await (supabase as any)
      .from('quiz_results')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('collection', result_collection)
      .single();

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: quiz.user_id,
      p_action_type: 'quiz_completed',
      p_details: {
        quizId: quiz.id,
        responseId: response.id,
        result: result_collection,
        leadId,
      },
      p_executed: true,
      p_module: 'quiz',
      p_reference_id: response.id,
      p_reference_table: 'quiz_responses',
    });

    return {
      success: true,
      response: response as QuizResponse,
      result: result as QuizResult,
    };
  } catch (error) {
    console.error('Quiz submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getQuizAnalytics(
  userId: string,
  quizId: string
): Promise<{
  totalResponses: number;
  collectionBreakdown: Record<string, number>;
  averageTimeSeconds: number;
  conversionRate: number;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: responses } = await (supabase as any)
    .from('quiz_responses')
    .select('result_collection, time_spent_seconds, lead_id')
    .eq('quiz_id', quizId)
    .eq('user_id', userId);

  if (!responses || responses.length === 0) {
    return {
      totalResponses: 0,
      collectionBreakdown: { grounding: 0, wholeness: 0, growth: 0 },
      averageTimeSeconds: 0,
      conversionRate: 0,
    };
  }

  const collectionBreakdown = {
    grounding: responses.filter((r: any) => r.result_collection === 'grounding').length,
    wholeness: responses.filter((r: any) => r.result_collection === 'wholeness').length,
    growth: responses.filter((r: any) => r.result_collection === 'growth').length,
  };

  const times = responses
    .filter((r: any) => r.time_spent_seconds !== null)
    .map((r: any) => r.time_spent_seconds as number);

  const averageTimeSeconds = times.length > 0
    ? times.reduce((a: number, b: number) => a + b, 0) / times.length
    : 0;

  const withLead = responses.filter((r: any) => r.lead_id !== null).length;
  const conversionRate = responses.length > 0 ? withLead / responses.length : 0;

  return {
    totalResponses: responses.length,
    collectionBreakdown,
    averageTimeSeconds,
    conversionRate,
  };
}
