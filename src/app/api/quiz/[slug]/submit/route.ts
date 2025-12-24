import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitQuiz } from '@/lib/quiz/quiz-service';
import { createClient } from '@supabase/supabase-js';

const submitSchema = z.object({
  answers: z.record(z.string(), z.array(z.string())),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
});

// Public endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get quiz ID from slug
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, require_email')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = submitSchema.parse(body);

    // Validate email if required
    if ((quiz as any).require_email && !data.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await submitQuiz(
      {
        quizId: (quiz as any).id,
        answers: data.answers,
        email: data.email,
        firstName: data.firstName,
      },
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result: result.result,
      scores: result.response?.scores,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}
