'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Select,
} from '@/components/ui';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Grid3x3,
  List,
  Image,
  Video,
  Film,
  Layers,
  Clock,
  Plus,
  Filter,
  Sparkles,
  Lightbulb,
  Target,
} from 'lucide-react';
import {
  getDayStrategy,
  getDayThemeSummary,
  getStorySchedule,
  type DayStrategy,
  type StoryScheduleItem,
} from '@/lib/instagram/day-strategy';

// ============================================================================
// Types
// ============================================================================

type PostType = 'feed' | 'reel' | 'story' | 'carousel';
type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
type ContentPillar = 'inspiration' | 'education' | 'engagement' | 'promotion';
type ViewMode = 'month' | 'week';

interface ScheduledPost {
  id: string;
  quote_id: string;
  quote_text: string;
  post_type: PostType;
  status: PostStatus;
  content_pillar: ContentPillar;
  scheduled_at: string;
  thumbnail_url?: string;
  caption_preview?: string;
}

interface OptimalTime {
  time: string;
  day: string;
  engagement_rate: number;
}

// ============================================================================
// Constants
// ============================================================================

const postTypeIcons: Record<PostType, React.ElementType> = {
  feed: Image,
  reel: Video,
  story: Film,
  carousel: Layers,
};

const postTypeColors: Record<PostType, string> = {
  feed: 'bg-blue-100 text-blue-700',
  reel: 'bg-purple-100 text-purple-700',
  story: 'bg-pink-100 text-pink-700',
  carousel: 'bg-green-100 text-green-700',
};

const statusColors: Record<PostStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const pillarColors: Record<ContentPillar, string> = {
  inspiration: 'grounding',
  education: 'wholeness',
  engagement: 'growth',
  promotion: 'primary',
} as const;

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// Mock Data Fallback
// ============================================================================

// Mock posts are generated client-side to avoid hydration mismatch
function getMockPosts(): ScheduledPost[] {
  const now = Date.now();
  return [
    {
      id: '1',
      quote_id: 'q1',
      quote_text: 'The only way to do great work is to love what you do.',
      post_type: 'feed',
      status: 'scheduled',
      content_pillar: 'inspiration',
      scheduled_at: new Date(now + 1000 * 60 * 60 * 3).toISOString(),
      caption_preview: 'Start your week with purpose...',
    },
    {
      id: '2',
      quote_id: 'q2',
      quote_text: 'In the middle of difficulty lies opportunity.',
      post_type: 'reel',
      status: 'scheduled',
      content_pillar: 'education',
      scheduled_at: new Date(now + 1000 * 60 * 60 * 27).toISOString(),
      caption_preview: 'When life gets hard...',
    },
    {
      id: '3',
      quote_id: 'q3',
      quote_text: 'You are braver than you believe.',
      post_type: 'carousel',
      status: 'draft',
      content_pillar: 'engagement',
      scheduled_at: new Date(now + 1000 * 60 * 60 * 51).toISOString(),
      caption_preview: 'Reminder for today...',
    },
    {
      id: '4',
      quote_id: 'q4',
      quote_text: 'Every moment is a fresh beginning.',
      post_type: 'story',
      status: 'scheduled',
      content_pillar: 'promotion',
      scheduled_at: new Date(now + 1000 * 60 * 60 * 75).toISOString(),
      caption_preview: 'Shop our new collection...',
    },
  ];
}

const mockOptimalTimes: OptimalTime[] = [
  { time: '9:00 AM', day: 'Monday', engagement_rate: 4.2 },
  { time: '12:00 PM', day: 'Wednesday', engagement_rate: 3.8 },
  { time: '6:00 PM', day: 'Friday', engagement_rate: 5.1 },
  { time: '10:00 AM', day: 'Sunday', engagement_rate: 4.5 },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }

  // Add all days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to complete the last week
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Go to Sunday

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push(date);
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ============================================================================
// Components
// ============================================================================

interface PostCardProps {
  post: ScheduledPost;
}

function PostCard({ post }: PostCardProps) {
  const Icon = postTypeIcons[post.post_type];
  const time = new Date(post.scheduled_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Link
      href={`/dashboard/instagram/posts/${post.id}`}
      className={`group flex items-center gap-2 p-1.5 rounded text-xs hover:bg-muted transition-colors ${postTypeColors[post.post_type]}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{time}</span>
    </Link>
  );
}

interface DayCellProps {
  date: Date;
  posts: ScheduledPost[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onDayClick: (date: Date) => void;
}

function DayCell({ date, posts, isCurrentMonth, isToday, onDayClick }: DayCellProps) {
  return (
    <div
      className={`min-h-[100px] border-b border-r p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
        !isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''
      } ${isToday ? 'bg-sage/5 border-sage' : ''}`}
      onClick={() => onDayClick(date)}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-sm font-medium ${
            isToday ? 'bg-sage text-white w-6 h-6 rounded-full flex items-center justify-center' : ''
          }`}
        >
          {date.getDate()}
        </span>
        {posts.length > 0 && (
          <Badge size="sm" variant="secondary">
            {posts.length}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        {posts.slice(0, 3).map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length > 3 && (
          <p className="text-xs text-muted-foreground">+{posts.length - 3} more</p>
        )}
      </div>
    </div>
  );
}

interface WeekDayCellProps {
  date: Date;
  posts: ScheduledPost[];
  isToday: boolean;
  onDayClick: (date: Date) => void;
}

function WeekDayCell({ date, posts, isToday, onDayClick }: WeekDayCellProps) {
  return (
    <div
      className={`flex-1 min-h-[200px] border-r p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
        isToday ? 'bg-sage/5 border-t-2 border-t-sage' : ''
      }`}
      onClick={() => onDayClick(date)}
    >
      <div className="text-center mb-3">
        <p className="text-xs text-muted-foreground">{DAYS_OF_WEEK[date.getDay()]}</p>
        <p
          className={`text-lg font-medium ${
            isToday ? 'bg-sage text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : ''
          }`}
        >
          {date.getDate()}
        </p>
      </div>
      <div className="space-y-2">
        {posts.map((post) => {
          const Icon = postTypeIcons[post.post_type];
          const time = new Date(post.scheduled_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          return (
            <Link
              key={post.id}
              href={`/dashboard/instagram/posts/${post.id}`}
              className={`block p-2 rounded-lg text-xs ${postTypeColors[post.post_type]} hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3 w-3" />
                <span className="font-medium">{time}</span>
              </div>
              <p className="truncate text-gray-700">{post.caption_preview || post.quote_text}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingSidebar({
  posts,
  optimalTimes,
}: {
  posts: ScheduledPost[];
  optimalTimes: OptimalTime[];
}) {
  const upcomingPosts = posts
    .filter((p) => p.status === 'scheduled' || p.status === 'draft')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Upcoming Posts */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">Upcoming Posts</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming posts</p>
          ) : (
            upcomingPosts.map((post) => {
              const Icon = postTypeIcons[post.post_type];
              const date = new Date(post.scheduled_at);
              return (
                <Link
                  key={post.id}
                  href={`/dashboard/instagram/posts/${post.id}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className={`p-2 rounded ${postTypeColors[post.post_type]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{post.quote_text.slice(0, 40)}...</p>
                    <p className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <Badge size="sm" variant={post.status === 'draft' ? 'warning' : 'success'}>
                      {post.status}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Optimal Times */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sage" />
            <h3 className="font-semibold text-sm">Best Times to Post</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {optimalTimes.map((slot, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{slot.day}</span>
                <span className="text-muted-foreground ml-2">{slot.time}</span>
              </div>
              <Badge size="sm" variant="success">
                {slot.engagement_rate}%
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">Legend</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          {(Object.entries(postTypeIcons) as [PostType, React.ElementType][]).map(([type, Icon]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              <div className={`p-1.5 rounded ${postTypeColors[type]}`}>
                <Icon className="h-3 w-3" />
              </div>
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// C.1: Day Strategy Card Component
function DayStrategyCard({ date }: { date: Date }) {
  const strategy = getDayStrategy(date);
  const storySchedule = getStorySchedule(date);

  const postTypeIconMap: Record<string, React.ElementType> = {
    feed: Image,
    reel: Video,
    story: Film,
    carousel: Layers,
  };

  return (
    <Card className="border-sage/30 bg-sage/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-sage" />
          <h3 className="font-semibold text-sm">Today&apos;s Strategy</h3>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-2xl">{strategy.themeEmoji}</span>
          <div>
            <p className="font-medium">{strategy.dayName} — {strategy.theme}</p>
            <p className="text-xs text-muted-foreground">{strategy.themeDescription}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommended Content */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">RECOMMENDED CONTENT</p>
          <div className="space-y-2">
            {strategy.recommendedContent.map((content, idx) => {
              const ContentIcon = postTypeIconMap[content.type] || Image;
              return (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <ContentIcon className="h-4 w-4 text-sage" />
                  <span className="capitalize">{content.type}</span>
                  <Badge size="sm" variant="secondary" className="ml-auto">
                    {content.pillar.replace('_', ' ')}
                  </Badge>
                  {content.priority === 1 && (
                    <Badge size="sm" variant="success">Primary</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Optimal Post Times */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">OPTIMAL POST TIMES</p>
          <div className="flex flex-wrap gap-2">
            {strategy.postTimes.map((time, idx) => (
              <Badge key={idx} variant="secondary">{time}</Badge>
            ))}
          </div>
        </div>

        {/* Story Schedule */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">STORY SCHEDULE ({storySchedule.length} stories)</p>
          <div className="space-y-1.5">
            {storySchedule.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.time}</span>
                <span className="capitalize">{item.type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Add Button */}
        <Link
          href={`/dashboard/instagram/new?date=${date.toISOString()}&type=${strategy.recommendedContent[0]?.type || 'feed'}&pillar=${strategy.recommendedContent[0]?.pillar || 'product_showcase'}`}
          className={buttonVariants({ size: 'sm', className: 'w-full' })}
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          Add {strategy.recommendedContent[0]?.type || 'post'} (recommended)
        </Link>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function InstagramCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState({
    postType: 'all',
    status: 'all',
    pillar: 'all',
  });
  const [mockPosts, setMockPosts] = useState<ScheduledPost[]>([]);

  // Initialize date on client-side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date());
    setMockPosts(getMockPosts());
  }, []);

  // Fetch posts
  const { data: posts = mockPosts, isLoading } = useQuery({
    queryKey: ['instagram-calendar-posts', currentDate?.getMonth(), currentDate?.getFullYear()],
    queryFn: async () => {
      if (!currentDate) return [];
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const res = await fetch(
        `/api/instagram/posts?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`
      );
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    },
    enabled: !!currentDate,
  });

  // Fetch optimal times
  const { data: optimalTimes = mockOptimalTimes } = useQuery({
    queryKey: ['instagram-optimal-times'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/optimal-times');
      if (!res.ok) throw new Error('Failed to fetch optimal times');
      return res.json();
    },
  });

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post: ScheduledPost) => {
      if (filters.postType !== 'all' && post.post_type !== filters.postType) return false;
      if (filters.status !== 'all' && post.status !== filters.status) return false;
      if (filters.pillar !== 'all' && post.content_pillar !== filters.pillar) return false;
      return true;
    });
  }, [posts, filters]);

  // Get posts for a specific day
  const getPostsForDay = (date: Date): ScheduledPost[] => {
    return filteredPosts.filter((post: ScheduledPost) =>
      isSameDay(new Date(post.scheduled_at), date)
    );
  };

  // Calendar days
  const calendarDays = useMemo(() => {
    if (!currentDate) return [];
    if (viewMode === 'month') {
      return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    } else {
      return getWeekDays(currentDate);
    }
  }, [currentDate, viewMode]);

  // Use currentDate for today comparison to ensure consistency
  const today = currentDate || new Date();

  // Navigation
  const goToPrevious = () => {
    if (!currentDate) return;
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (!currentDate) return;
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Show loading state until client-side hydration is complete
  if (!currentDate) {
    return (
      <PageContainer title="Calendar">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading calendar...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Calendar">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Calendar Area */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-6 w-6 text-sage" />
              <div>
                <h2 className="text-2xl font-bold">{formatDate(currentDate)}</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredPosts.length} posts scheduled
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={goToToday}>
                Today
              </Button>
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'month' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={goToPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Link href="/dashboard/instagram/new" className={buttonVariants({ size: 'sm' })}>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Link>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select
                  value={filters.postType}
                  onChange={(value) => setFilters((f) => ({ ...f, postType: value as string }))}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'feed', label: 'Feed Posts' },
                    { value: 'reel', label: 'Reels' },
                    { value: 'story', label: 'Stories' },
                    { value: 'carousel', label: 'Carousels' },
                  ]}
                  className="w-[140px]"
                />
                <Select
                  value={filters.status}
                  onChange={(value) => setFilters((f) => ({ ...f, status: value as string }))}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'draft', label: 'Drafts' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'published', label: 'Published' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                  className="w-[140px]"
                />
                <Select
                  value={filters.pillar}
                  onChange={(value) => setFilters((f) => ({ ...f, pillar: value as string }))}
                  options={[
                    { value: 'all', label: 'All Pillars' },
                    { value: 'inspiration', label: 'Inspiration' },
                    { value: 'education', label: 'Education' },
                    { value: 'engagement', label: 'Engagement' },
                    { value: 'promotion', label: 'Promotion' },
                  ]}
                  className="w-[140px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-0">
              {viewMode === 'month' ? (
                <>
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 border-b">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Day Cells */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((date, idx) => (
                      <DayCell
                        key={idx}
                        date={date}
                        posts={getPostsForDay(date)}
                        isCurrentMonth={date.getMonth() === currentDate.getMonth()}
                        isToday={isSameDay(date, today)}
                        onDayClick={handleDayClick}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex border-t">
                  {calendarDays.map((date, idx) => (
                    <WeekDayCell
                      key={idx}
                      date={date}
                      posts={getPostsForDay(date)}
                      isToday={isSameDay(date, today)}
                      onDayClick={handleDayClick}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Day Detail */}
          {selectedDate && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getDayThemeSummary(selectedDate).emoji}</span>
                    <div>
                      <h3 className="font-semibold">
                        {selectedDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </h3>
                      <p className="text-sm text-sage font-medium">
                        {getDayThemeSummary(selectedDate).theme} Day
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {getPostsForDay(selectedDate).length === 0 ? (
                  <div className="text-center py-6">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 text-sage" />
                    <p className="text-muted-foreground mb-1">No posts scheduled for this day</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Recommended: {getDayStrategy(selectedDate).recommendedContent[0]?.type} ({getDayStrategy(selectedDate).recommendedContent[0]?.pillar.replace('_', ' ')})
                    </p>
                    <Link
                      href={`/dashboard/instagram/new?date=${selectedDate.toISOString()}&type=${getDayStrategy(selectedDate).recommendedContent[0]?.type || 'feed'}`}
                      className={buttonVariants({ size: 'sm' })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Recommended Post
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getPostsForDay(selectedDate).map((post) => {
                      const Icon = postTypeIcons[post.post_type];
                      const time = new Date(post.scheduled_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      });
                      return (
                        <Link
                          key={post.id}
                          href={`/dashboard/instagram/posts/${post.id}`}
                          className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted transition-colors"
                        >
                          <div className={`p-3 rounded-lg ${postTypeColors[post.post_type]}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{time}</span>
                              <Badge size="sm" variant={statusColors[post.status].includes('green') ? 'success' : 'secondary'}>
                                {post.status}
                              </Badge>
                              <Badge size="sm" variant={pillarColors[post.content_pillar] as 'grounding' | 'wholeness' | 'growth' | 'primary'}>
                                {post.content_pillar}
                              </Badge>
                            </div>
                            <p className="text-sm truncate">{post.quote_text}</p>
                            {post.caption_preview && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {post.caption_preview}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          {/* C.1: Day Strategy Card */}
          <DayStrategyCard date={selectedDate || new Date()} />

          <UpcomingSidebar posts={filteredPosts} optimalTimes={optimalTimes} />
        </div>
      </div>
    </PageContainer>
  );
}
