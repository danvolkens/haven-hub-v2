'use client';

import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, Badge } from '@/components/ui';
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  TrendingUp,
  Trophy,
  AlertCircle,
  Loader2,
  Calendar,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

interface PerformanceSummary {
  period: string;
  total_views: number;
  total_posts: number;
  avg_views: number;
  avg_engagement_rate: number;
  avg_completion_rate: number | null;
  best_post: {
    id: string;
    title: string;
    views: number;
    content_pillar: string;
  } | null;
  worst_post: {
    id: string;
    title: string;
    views: number;
    content_pillar: string;
  } | null;
  pillar_performance: Record<string, {
    posts: number;
    avg_views: number;
    avg_engagement: number;
  }>;
  top_hooks: {
    hook_id: string;
    hook_text: string;
    avg_views: number;
    uses: number;
  }[];
}

interface TimeSlotPerformance {
  day: number;
  hour: number;
  avg_views: number;
  avg_engagement: number;
  post_count: number;
}

interface GrowthBenchmark {
  month: number;
  min_views: number;
  max_views: number;
  notes: string;
}

interface AnalyticsData {
  weekly: PerformanceSummary;
  bestTimes: TimeSlotPerformance[];
  benchmarks: GrowthBenchmark[];
}

// ============================================================================
// Main Component
// ============================================================================

export default function TikTokAnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tiktok-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/tiktok/metrics?action=full-analytics');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<AnalyticsData>;
    },
  });

  if (isLoading) {
    return (
      <PageContainer title="TikTok Analytics">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer title="TikTok Analytics">
        <Card className="p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load analytics</p>
        </Card>
      </PageContainer>
    );
  }

  const { weekly, bestTimes, benchmarks } = data;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <PageContainer title="TikTok Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">TikTok Analytics</h1>
          <p className="text-muted-foreground">
            Week of {weekly.period ? format(new Date(weekly.period), 'MMMM d, yyyy') : 'loading...'}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={<Eye className="h-5 w-5" />}
            label="Total Views"
            value={weekly.total_views.toLocaleString()}
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Avg Engagement"
            value={`${weekly.avg_engagement_rate}%`}
          />
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Avg Completion"
            value={weekly.avg_completion_rate ? `${weekly.avg_completion_rate}%` : 'N/A'}
          />
          <MetricCard
            icon={<Calendar className="h-5 w-5" />}
            label="Posts This Week"
            value={weekly.total_posts.toString()}
          />
        </div>

        {/* Best & Worst Posts */}
        <div className="grid gap-4 md:grid-cols-2">
          {weekly.best_post && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">Best Performer</span>
              </div>
              <div className="space-y-2">
                <div className="font-medium">{weekly.best_post.title || 'Untitled'}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{weekly.best_post.views.toLocaleString()} views</span>
                  <Badge variant="secondary" size="sm">
                    {weekly.best_post.content_pillar.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {weekly.worst_post && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Needs Improvement</span>
              </div>
              <div className="space-y-2">
                <div className="font-medium">{weekly.worst_post.title || 'Untitled'}</div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{weekly.worst_post.views.toLocaleString()} views</span>
                  <Badge variant="secondary" size="sm">
                    {weekly.worst_post.content_pillar.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Pillar Performance */}
        {Object.keys(weekly.pillar_performance).length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Performance by Pillar</h2>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {Object.entries(weekly.pillar_performance).map(([pillar, stats]) => (
                <div key={pillar} className="p-3 border rounded-lg">
                  <div className="font-medium capitalize mb-2">
                    {pillar.replace('_', ' ')}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Posts</span>
                      <span>{stats.posts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Views</span>
                      <span>{stats.avg_views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engagement</span>
                      <span>{stats.avg_engagement}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Top Hooks */}
        {weekly.top_hooks.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Top Performing Hooks</h2>
            <div className="space-y-3">
              {weekly.top_hooks.map((hook, index) => (
                <div
                  key={hook.hook_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-medium">&ldquo;{hook.hook_text}&rdquo;</div>
                      <div className="text-sm text-muted-foreground">
                        Used {hook.uses} time{hook.uses !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{hook.avg_views.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">avg views</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Best Posting Times */}
        {bestTimes.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Best Posting Times</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {bestTimes.slice(0, 6).map((slot, index) => (
                <div
                  key={`${slot.day}-${slot.hour}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{dayNames[slot.day]}</div>
                      <div className="text-sm text-muted-foreground">
                        {slot.hour}:00 - {slot.hour + 1}:00
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{slot.avg_views.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {slot.post_count} post{slot.post_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Growth Benchmarks */}
        {benchmarks.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Growth Benchmarks</h2>
            <div className="space-y-3">
              {benchmarks.map((benchmark) => (
                <div
                  key={benchmark.month}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">Month {benchmark.month}</div>
                    <div className="text-sm text-muted-foreground">{benchmark.notes}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {benchmark.min_views.toLocaleString()} - {benchmark.max_views.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">avg views target</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}
