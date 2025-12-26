'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Target, TrendingUp, Clock } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button, Card, CardHeader, CardContent } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';

interface QuizAnalytics {
  quiz: {
    id: string;
    title: string;
    slug: string;
  };
  totalResponses: number;
  completionRate: number;
  avgTimeToComplete: number;
  resultDistribution: {
    grounding: number;
    wholeness: number;
    growth: number;
  };
  responsesByDay: { date: string; count: number }[];
}

export default function QuizAnalyticsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch(`/api/quiz/by-id/${params.id}/analytics`);
        if (!response.ok) throw new Error('Failed to load analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        toast('Failed to load analytics', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [params.id, toast]);

  if (isLoading) {
    return (
      <PageContainer title="Quiz Analytics" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      </PageContainer>
    );
  }

  if (!analytics) {
    return (
      <PageContainer title="Quiz Analytics" description="No data available">
        <div className="text-center py-12">
          <p className="text-[var(--color-text-secondary)]">No analytics data available yet.</p>
          <Link href="/dashboard/leads/quiz">
            <Button variant="secondary" className="mt-4">
              Back to Quizzes
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const totalDistribution =
    analytics.resultDistribution.grounding +
    analytics.resultDistribution.wholeness +
    analytics.resultDistribution.growth;

  const getPercentage = (value: number) =>
    totalDistribution > 0 ? Math.round((value / totalDistribution) * 100) : 0;

  return (
    <PageContainer
      title={`Analytics: ${analytics.quiz.title}`}
      description="View quiz performance and engagement metrics"
      actions={
        <Link href="/dashboard/leads/quiz">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Quizzes
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Total Responses</p>
                  <p className="text-2xl font-semibold">{analytics.totalResponses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Completion Rate</p>
                  <p className="text-2xl font-semibold">{analytics.completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Avg. Time</p>
                  <p className="text-2xl font-semibold">{analytics.avgTimeToComplete}s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">Leads Captured</p>
                  <p className="text-2xl font-semibold">{analytics.totalResponses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Result Distribution */}
        <Card>
          <CardHeader title="Result Distribution" description="How users scored across collections" />
          <CardContent>
            <div className="space-y-4">
              {/* Grounding */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-body-sm font-medium">Grounding</span>
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    {analytics.resultDistribution.grounding} ({getPercentage(analytics.resultDistribution.grounding)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${getPercentage(analytics.resultDistribution.grounding)}%`,
                      backgroundColor: '#786350',
                    }}
                  />
                </div>
              </div>

              {/* Wholeness */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-body-sm font-medium">Wholeness</span>
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    {analytics.resultDistribution.wholeness} ({getPercentage(analytics.resultDistribution.wholeness)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${getPercentage(analytics.resultDistribution.wholeness)}%`,
                      backgroundColor: '#7A9E7E',
                    }}
                  />
                </div>
              </div>

              {/* Growth */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-body-sm font-medium">Growth</span>
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    {analytics.resultDistribution.growth} ({getPercentage(analytics.resultDistribution.growth)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${getPercentage(analytics.resultDistribution.growth)}%`,
                      backgroundColor: '#5B7B8C',
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responses Over Time */}
        <Card>
          <CardHeader title="Responses Over Time" description="Daily quiz completions" />
          <CardContent>
            {analytics.responsesByDay.length > 0 ? (
              <div className="h-48 flex items-end gap-2">
                {analytics.responsesByDay.slice(-14).map((day, i) => {
                  const maxCount = Math.max(...analytics.responsesByDay.map(d => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-[var(--color-primary)] rounded-t transition-all duration-300"
                        style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                        title={`${day.date}: ${day.count} responses`}
                      />
                      <span className="text-[10px] text-[var(--color-text-tertiary)] rotate-45 origin-left">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-[var(--color-text-secondary)]">
                No response data yet. Share your quiz to start collecting responses!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
