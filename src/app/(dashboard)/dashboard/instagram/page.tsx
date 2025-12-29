'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  buttonVariants,
  Badge,
  Progress,
} from '@/components/ui';
import {
  Instagram,
  Calendar,
  Plus,
  BarChart3,
  Image,
  Video,
  Layers,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Flame,
  ChevronRight,
  RefreshCw,
  Target,
  MessageCircle,
} from 'lucide-react';
import type { WeeklyBalance, BalanceStatus, ContentTypeBalance } from '@/lib/instagram/weekly-balance';

// ============================================================================
// Types
// ============================================================================

interface WeeklyStats {
  posts_published: number;
  total_reach: number;
  engagement_rate: number;
  engagement_trend: number;
  saves: number;
  profile_visits: number;
}

interface StreakData {
  current_streak: number;
  best_streak: number;
  last_14_days: { date: string; posted: boolean }[];
}

interface PillarBalance {
  pillar: string;
  label: string;
  actual: number;
  target: number;
  minimum: number;
  count: number;
  status: 'ok' | 'warning';
  suggestion: string | null;
}

interface UpcomingPost {
  id: string;
  scheduled_at: string;
  post_type: 'feed' | 'reel' | 'carousel' | 'story';
  content_pillar: string;
  caption: string;
  thumbnail_url?: string;
}

interface AttentionItem {
  type: 'pillar_warning' | 'missing_stories' | 'review_queue';
  message: string;
  action_url: string;
  count?: number;
}

// ============================================================================
// Main Component
// ============================================================================

export default function InstagramDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch weekly stats
  const { data: weeklyStats, isLoading: loadingStats } = useQuery<WeeklyStats>({
    queryKey: ['instagram', 'weekly-stats', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/instagram/stats/weekly');
      if (!res.ok) {
        // Return mock data if API not ready
        return {
          posts_published: 7,
          total_reach: 12500,
          engagement_rate: 4.2,
          engagement_trend: 0.5,
          saves: 89,
          profile_visits: 234,
        };
      }
      return res.json();
    },
  });

  // Fetch posting streak
  const { data: streakData } = useQuery<StreakData>({
    queryKey: ['instagram', 'streak', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/instagram/stats/streak');
      if (!res.ok) {
        // Generate mock 14-day data
        const days = [];
        for (let i = 13; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          days.push({
            date: date.toISOString().split('T')[0],
            posted: i !== 3 && i !== 10, // Skip a couple days for realism
          });
        }
        return {
          current_streak: 5,
          best_streak: 12,
          last_14_days: days,
        };
      }
      return res.json();
    },
  });

  // Fetch pillar balance
  const { data: pillarData } = useQuery<{ balance: PillarBalance[]; isHealthy: boolean }>({
    queryKey: ['instagram', 'pillar-balance', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/instagram/pillar-balance');
      if (!res.ok) {
        return {
          balance: [
            { pillar: 'product_showcase', label: 'Product Showcase', actual: 40, target: 40, minimum: 30, count: 4, status: 'ok', suggestion: null },
            { pillar: 'brand_story', label: 'Brand Story', actual: 20, target: 20, minimum: 15, count: 2, status: 'ok', suggestion: null },
            { pillar: 'educational', label: 'Educational', actual: 10, target: 20, minimum: 15, count: 1, status: 'warning', suggestion: 'Schedule a how-to carousel or tips post' },
            { pillar: 'community', label: 'Community', actual: 30, target: 20, minimum: 15, count: 3, status: 'ok', suggestion: null },
          ],
          isHealthy: false,
        };
      }
      return res.json();
    },
  });

  // Fetch upcoming posts
  const { data: upcomingPosts } = useQuery<UpcomingPost[]>({
    queryKey: ['instagram', 'upcoming', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/instagram/posts/upcoming');
      if (!res.ok) {
        return [];
      }
      return res.json();
    },
  });

  // Fetch attention items
  const { data: attentionItems } = useQuery<AttentionItem[]>({
    queryKey: ['instagram', 'attention', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/instagram/attention');
      if (!res.ok) {
        // Build from pillar data
        const items: AttentionItem[] = [];
        if (pillarData && !pillarData.isHealthy) {
          const warningPillars = pillarData.balance.filter(p => p.status === 'warning');
          warningPillars.forEach(p => {
            items.push({
              type: 'pillar_warning',
              message: p.suggestion || `${p.label} needs attention`,
              action_url: '/dashboard/instagram/calendar',
            });
          });
        }
        return items;
      }
      return res.json();
    },
  });

  // Fetch weekly content type balance
  const { data: weeklyBalance } = useQuery<WeeklyBalance>({
    queryKey: ['instagram', 'weekly-balance', refreshKey],
    queryFn: async () => {
      const res = await fetch('/api/instagram/weekly-balance');
      if (!res.ok) {
        // Return mock data if API not ready
        return null;
      }
      return res.json();
    },
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <PageContainer title="Instagram">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Instagram</h2>
              <p className="text-sm text-muted-foreground">Content scheduling & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link href="/dashboard/instagram/calendar" className={buttonVariants()}>
              <Calendar className="mr-2 h-4 w-4" />
              View Calendar
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-5">
          <WeeklyStatsCard stats={weeklyStats} loading={loadingStats} />
        </div>

        {/* Weekly Content Balance */}
        {weeklyBalance && <WeeklyBalanceWidget balance={weeklyBalance} />}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pillar Balance */}
            <PillarBalanceCard balance={pillarData?.balance} isHealthy={pillarData?.isHealthy} />

            {/* Upcoming Posts */}
            <UpcomingPostsCard posts={upcomingPosts || []} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Posting Streak */}
            <PostingStreakCard streak={streakData} />

            {/* Quick Actions */}
            <QuickActionsCard />

            {/* Needs Attention */}
            <AttentionCard items={attentionItems || []} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function WeeklyStatsCard({ stats, loading }: { stats?: WeeklyStats; loading: boolean }) {
  const statItems = [
    { label: 'Posts', value: stats?.posts_published || 0, icon: Image },
    { label: 'Reach', value: stats?.total_reach || 0, format: 'compact', icon: TrendingUp },
    { label: 'Engagement', value: stats?.engagement_rate || 0, format: 'percent', trend: stats?.engagement_trend, icon: BarChart3 },
    { label: 'Saves', value: stats?.saves || 0, icon: CheckCircle },
    { label: 'Profile Visits', value: stats?.profile_visits || 0, icon: Instagram },
  ];

  return (
    <>
      {statItems.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center justify-between">
            <stat.icon className="h-5 w-5 text-muted-foreground" />
            {stat.trend !== undefined && (
              <Badge variant={stat.trend >= 0 ? 'success' : 'error'} className="text-xs">
                {stat.trend >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {Math.abs(stat.trend)}%
              </Badge>
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">
              {loading ? '...' : formatValue(stat.value, stat.format)}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </Card>
      ))}
    </>
  );
}

function PostingStreakCard({ streak }: { streak?: StreakData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Posting Streak</h3>
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-5 w-5" />
            <span className="text-xl font-bold">{streak?.current_streak || 0}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {streak?.last_14_days?.slice(-14).map((day, i) => {
            const date = new Date(day.date);
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                    day.posted
                      ? 'bg-green-100 text-green-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {day.posted ? <CheckCircle className="h-3 w-3" /> : date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Best streak: {streak?.best_streak || 0} days
        </p>
      </CardContent>
    </Card>
  );
}

function PillarBalanceCard({ balance, isHealthy }: { balance?: PillarBalance[]; isHealthy?: boolean }) {
  const pillars = balance || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Content Pillar Balance</h3>
          <Badge variant={isHealthy ? 'default' : 'warning'}>
            {isHealthy ? 'Healthy Mix' : 'Needs Attention'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">This week&apos;s content distribution</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pillars.map((pillar) => (
            <div key={pillar.pillar} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {pillar.status === 'warning' && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  {pillar.label}
                </span>
                <span className="text-muted-foreground">
                  {pillar.count} posts ({pillar.actual}% / {pillar.target}%)
                </span>
              </div>
              <Progress
                value={pillar.actual}
                size="sm"
                variant={pillar.status === 'warning' ? 'warning' : 'default'}
              />
              {pillar.suggestion && (
                <p className="text-xs text-yellow-600">{pillar.suggestion}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="font-semibold">Quick Actions</h3>
      </CardHeader>
      <CardContent className="space-y-2">
        <Link href="/dashboard/instagram/new" className={buttonVariants({ className: 'w-full justify-start' })}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Post
        </Link>
        <Link href="/dashboard/instagram/bulk" className={buttonVariants({ variant: 'secondary', className: 'w-full justify-start' })}>
          <Layers className="mr-2 h-4 w-4" />
          Bulk Schedule
        </Link>
        <Link href="/dashboard/instagram/calendar" className={buttonVariants({ variant: 'secondary', className: 'w-full justify-start' })}>
          <Calendar className="mr-2 h-4 w-4" />
          View Calendar
        </Link>
        <Link href="/dashboard/instagram/analytics" className={buttonVariants({ variant: 'secondary', className: 'w-full justify-start' })}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </Link>
      </CardContent>
    </Card>
  );
}

function UpcomingPostsCard({ posts }: { posts: UpcomingPost[] }) {
  // Group posts by day
  const grouped = posts.reduce((acc, post) => {
    const date = new Date(post.scheduled_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {} as Record<string, UpcomingPost[]>);

  const postTypeIcons: Record<string, typeof Image> = {
    feed: Image,
    reel: Video,
    carousel: Layers,
    story: Clock,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Upcoming This Week</h3>
          <Link href="/dashboard/instagram/calendar" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="mx-auto h-8 w-8 mb-2" />
            <p>No posts scheduled this week</p>
            <Link href="/dashboard/instagram/new" className={buttonVariants({ size: 'sm', className: 'mt-2' })}>
              Schedule a Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).slice(0, 3).map(([date, dayPosts]) => (
              <div key={date}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
                <div className="space-y-2">
                  {dayPosts.map((post) => {
                    const Icon = postTypeIcons[post.post_type] || Image;
                    const time = new Date(post.scheduled_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                    return (
                      <Link
                        key={post.id}
                        href={`/dashboard/instagram/posts/${post.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{post.caption.substring(0, 50)}...</p>
                          <p className="text-xs text-muted-foreground">
                            {time} • {post.content_pillar.replace('_', ' ')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionCard({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold">Needs Attention</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm">Everything looks good!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <h3 className="font-semibold">Needs Attention</h3>
          <Badge variant="warning">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, i) => (
            <Link
              key={i}
              href={item.action_url}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors border border-yellow-200 bg-yellow-50"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <span className="text-sm flex-1">{item.message}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyBalanceWidget({ balance }: { balance: WeeklyBalance }) {
  const contentTypes: Array<{
    key: keyof WeeklyBalance['contentTypes'];
    label: string;
    icon: typeof Image;
  }> = [
    { key: 'feed', label: 'Feed Posts', icon: Image },
    { key: 'reel', label: 'Reels', icon: Video },
    { key: 'carousel', label: 'Carousels', icon: Layers },
    { key: 'story', label: 'Stories', icon: MessageCircle },
  ];

  const getStatusColor = (status: BalanceStatus) => {
    switch (status) {
      case 'ahead':
        return 'bg-green-500';
      case 'on_track':
        return 'bg-sage';
      case 'behind':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
    }
  };

  const getStatusBadge = (status: BalanceStatus) => {
    switch (status) {
      case 'ahead':
        return { variant: 'success' as const, label: 'Ahead' };
      case 'on_track':
        return { variant: 'success' as const, label: 'On Track' };
      case 'behind':
        return { variant: 'warning' as const, label: 'Behind' };
      case 'critical':
        return { variant: 'error' as const, label: 'Critical' };
    }
  };

  const weekDateRange = () => {
    const start = new Date(balance.weekStart);
    const end = new Date(balance.weekEnd);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Weekly Content Balance</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{weekDateRange()}</span>
            <Badge variant={balance.overallStatus === 'ahead' || balance.overallStatus === 'on_track' ? 'success' : balance.overallStatus === 'behind' ? 'warning' : 'error'}>
              {getStatusBadge(balance.overallStatus).label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Content Type Progress Bars */}
        <div className="grid gap-4 md:grid-cols-4">
          {contentTypes.map(({ key, label, icon: Icon }) => {
            const data = balance.contentTypes[key];
            const statusBadge = getStatusBadge(data.status);
            const progressWidth = Math.min(data.percentage, 100);

            return (
              <div key={key} className="space-y-2 p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant={statusBadge.variant} className="text-xs">
                    {statusBadge.label}
                  </Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStatusColor(data.status)} transition-all duration-300`}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{data.current} / {data.target} target</span>
                  <span className="text-xs">({data.min}-{data.max})</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Suggestions */}
        {balance.suggestions.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Suggestions</span>
            </div>
            <ul className="space-y-1">
              {balance.suggestions.map((suggestion, i) => (
                <li key={i} className="text-sm text-yellow-700 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-600" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Add Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {balance.contentTypes.feed.status === 'critical' || balance.contentTypes.feed.status === 'behind' ? (
            <Link href="/dashboard/instagram/new?type=feed" className={buttonVariants({ size: 'sm', variant: 'secondary' })}>
              <Plus className="mr-1 h-3 w-3" />
              Add Feed Post
            </Link>
          ) : null}
          {balance.contentTypes.reel.status === 'critical' || balance.contentTypes.reel.status === 'behind' ? (
            <Link href="/dashboard/instagram/new?type=reel" className={buttonVariants({ size: 'sm', variant: 'secondary' })}>
              <Plus className="mr-1 h-3 w-3" />
              Add Reel
            </Link>
          ) : null}
          {balance.contentTypes.carousel.status === 'critical' || balance.contentTypes.carousel.status === 'behind' ? (
            <Link href="/dashboard/instagram/new?type=carousel" className={buttonVariants({ size: 'sm', variant: 'secondary' })}>
              <Plus className="mr-1 h-3 w-3" />
              Add Carousel
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatValue(value: number, format?: string): string {
  if (format === 'compact') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  }
  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString();
}
