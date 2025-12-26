'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { HelpCircle, Plus, ExternalLink, BarChart3, Edit, Eye } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  starts: number;
  completions: number;
  completion_rate: number;
  created_at: string;
}

export default function QuizPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const res = await fetch('/api/quiz');
      if (!res.ok) throw new Error('Failed to fetch quizzes');
      return res.json();
    },
  });

  const quizzes: Quiz[] = data?.quizzes || [];

  return (
    <PageContainer
      title="Quiz Builder"
      description="Create personality quizzes to capture leads and recommend products"
      actions={
        <Link href="/dashboard/leads/quiz/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Create Quiz</Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-elevated rounded w-1/2 mb-2" />
                <div className="h-4 bg-elevated rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <HelpCircle className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
            <h3 className="text-h3 mb-2">No Quizzes Yet</h3>
            <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
              Build interactive quizzes to help visitors discover their perfect
              collection and capture their email for future marketing.
            </p>
            <Link href="/dashboard/leads/quiz/new">
              <Button variant="primary">
                <Plus className="mr-2 h-4 w-4" /> Create Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{quiz.title}</h3>
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      /quiz/{quiz.slug}
                    </p>
                  </div>
                  <Badge variant={quiz.status === 'active' ? 'success' : 'secondary'}>
                    {quiz.status}
                  </Badge>
                </div>

                {quiz.description && (
                  <p className="text-body-sm text-[var(--color-text-secondary)] mb-4 line-clamp-2">
                    {quiz.description}
                  </p>
                )}

                <div className="flex gap-4 text-body-sm text-[var(--color-text-tertiary)] mb-4">
                  <span>{quiz.starts} starts</span>
                  <span>{quiz.completions} completions</span>
                  <span>{Math.round(quiz.completion_rate * 100)}% rate</span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/leads/quiz/${quiz.id}/edit`}>
                    <Button variant="secondary" size="sm" leftIcon={<Edit className="h-3 w-3" />}>
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/quiz/${quiz.slug}`} target="_blank">
                    <Button variant="ghost" size="sm" leftIcon={<Eye className="h-3 w-3" />}>
                      Preview
                    </Button>
                  </Link>
                  <Link href={`/dashboard/leads/quiz/${quiz.id}/analytics`}>
                    <Button variant="ghost" size="sm" leftIcon={<BarChart3 className="h-3 w-3" />}>
                      Analytics
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
