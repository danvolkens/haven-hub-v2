import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/layout/page-container';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { PendingApprovals } from '@/components/dashboard/pending-approvals';
import { PerformanceActionsWidget } from '@/components/dashboard/performance-actions';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { TodaysTasks } from '@/components/dashboard/todays-tasks';
import { TopPerformers } from '@/components/dashboard/top-performers';
import { AIInsights } from '@/components/dashboard/ai-insights';
import { Skeleton } from '@/components/ui/skeleton';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user settings for greeting
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('first_name')
    .eq('user_id', user.id)
    .single();

  const greeting = getGreeting();
  const name = settings?.first_name || 'there';

  return (
    <PageContainer
      title={`${greeting}, ${name}!`}
      description="Here's what's happening with your business today"
    >
      <div className="grid gap-6">
        {/* Stats Row */}
        <Suspense fallback={<StatsSkeletons />}>
          <DashboardStats userId={user.id} />
        </Suspense>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Insights */}
            <Suspense fallback={<CardSkeleton title="AI Insights" />}>
              <AIInsights userId={user.id} />
            </Suspense>

            {/* Today's Tasks */}
            <Suspense fallback={<CardSkeleton title="Today's Tasks" />}>
              <TodaysTasks userId={user.id} />
            </Suspense>

            {/* Top Performers */}
            <Suspense fallback={<CardSkeleton title="Top Performers" />}>
              <TopPerformers userId={user.id} />
            </Suspense>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions />

            {/* Performance Actions */}
            <Suspense fallback={<CardSkeleton title="Performance Actions" />}>
              <PerformanceActionsWidget userId={user.id} />
            </Suspense>

            {/* Pending Approvals */}
            <Suspense fallback={<CardSkeleton title="Pending Approvals" />}>
              <PendingApprovals userId={user.id} />
            </Suspense>

            {/* Recent Activity */}
            <Suspense fallback={<CardSkeleton title="Recent Activity" />}>
              <RecentActivity userId={user.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatsSkeletons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

function CardSkeleton({ title }: { title: string }) {
  return (
    <div className="border rounded-lg p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-40" />
    </div>
  );
}
