import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get quiz details
    const { data: quiz, error: quizError } = await (supabase as any)
      .from('quizzes')
      .select('id, title, slug')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get response stats
    const { data: responses, error: responsesError } = await (supabase as any)
      .from('quiz_responses')
      .select('id, result_collection, created_at, completed_at')
      .eq('quiz_id', id);

    if (responsesError) throw responsesError;

    const totalResponses = responses?.length || 0;
    const completedResponses = responses?.filter((r: any) => r.completed_at) || [];
    const completionRate = totalResponses > 0
      ? Math.round((completedResponses.length / totalResponses) * 100)
      : 0;

    // Calculate average time to complete
    const completionTimes = completedResponses
      .map((r: any) => {
        const start = new Date(r.created_at).getTime();
        const end = new Date(r.completed_at).getTime();
        return (end - start) / 1000; // seconds
      })
      .filter((t: number) => t > 0 && t < 3600); // Filter outliers

    const avgTimeToComplete = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length)
      : 0;

    // Result distribution
    const resultDistribution = {
      grounding: completedResponses.filter((r: any) => r.result_collection === 'grounding').length,
      wholeness: completedResponses.filter((r: any) => r.result_collection === 'wholeness').length,
      growth: completedResponses.filter((r: any) => r.result_collection === 'growth').length,
    };

    // Responses by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const responsesByDay: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();

    completedResponses.forEach((r: any) => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    // Fill in all days in range
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      responsesByDay.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    return NextResponse.json({
      quiz,
      totalResponses,
      completionRate,
      avgTimeToComplete,
      resultDistribution,
      responsesByDay,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
