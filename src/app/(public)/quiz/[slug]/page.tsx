import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { QuizTemplate } from './template';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getQuiz(slug: string) {
  const supabase = await createClient();

  const { data: quiz, error } = await (supabase as any)
    .from('quizzes')
    .select(`
      *,
      questions:quiz_questions(
        *,
        answers:quiz_answers(*)
      ),
      results:quiz_results(*)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !quiz) {
    return null;
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

  return quiz;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const quiz = await getQuiz(slug);

  if (!quiz) {
    return { title: 'Quiz Not Found' };
  }

  return {
    title: quiz.title,
    description: quiz.description || `Take the ${quiz.title} quiz`,
  };
}

export default async function QuizPage({ params }: PageProps) {
  const { slug } = await params;
  const quiz = await getQuiz(slug);

  if (!quiz) {
    notFound();
  }

  return <QuizTemplate quiz={quiz} />;
}
