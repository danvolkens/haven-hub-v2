'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Select,
} from '@/components/ui';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Bookmark,
  Users,
  Calendar,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================

interface AnalyticsData {
  summary: {
    total_reach: number;
    avg_engagement_rate: number;
    total_saves: number;
    profile_views: number;
    follower_growth: number;
    followers_count: number;
  };
  engagement_over_time: {
    date: string;
    engagement_rate: number;
    reach: number;
  }[];
  top_posts: {
    id: string;
    engagement_rate: number;
    reach: number;
    likes: number;
    saves: number;
    post_type: string;
    caption: string;
    thumbnail: string;
    scheduled_for: string;
  }[];
  template_performance: {
    template_id: string;
    template_name: string;
    content_pillar: string;
    times_used: number;
    avg_engagement_rate: number;
    avg_saves: number;
  }[];
  hashtag_performance: {
    set_id: string;
    set_name: string;
    times_used: number;
    avg_engagement_rate: number;
    avg_reach: number;
  }[];
  optimal_times_heatmap: Record<number, Record<number, number>>;
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchAnalytics(days: number): Promise<AnalyticsData> {
  const res = await fetch(`/api/instagram/analytics?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

// ============================================================================
// Components
// ============================================================================

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  format: formatFn = (v) => v.toLocaleString(),
}: {
  label: string;
  value: number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: (v: number) => string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{formatFn(value)}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change >= 0 ? '+' : ''}{change.toLocaleString()}
              </div>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeatmapCell({ value, maxValue }: { value: number; maxValue: number }) {
  const intensity = maxValue > 0 ? value / maxValue : 0;
  const bgColor = intensity > 0
    ? `rgba(147, 51, 234, ${Math.max(0.1, intensity)})`
    : 'transparent';

  return (
    <div
      className="w-6 h-6 rounded-sm text-[9px] flex items-center justify-center"
      style={{ backgroundColor: bgColor }}
      title={`${(value * 100).toFixed(2)}% engagement`}
    >
      {intensity > 0.5 ? (value * 100).toFixed(0) : ''}
    </div>
  );
}

function OptimalTimesHeatmap({ data }: { data: Record<number, Record<number, number>> }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Find max value for color scaling
  let maxValue = 0;
  Object.values(data).forEach((hourData) => {
    Object.values(hourData).forEach((value) => {
      if (value > maxValue) maxValue = value;
    });
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex gap-1 mb-1">
          <div className="w-10" />
          {hours.map((hour) => (
            <div key={hour} className="w-6 text-[10px] text-center text-muted-foreground">
              {hour}
            </div>
          ))}
        </div>
        {days.map((day, dayIndex) => (
          <div key={day} className="flex gap-1 mb-1">
            <div className="w-10 text-xs text-muted-foreground flex items-center">
              {day}
            </div>
            {hours.map((hour) => (
              <HeatmapCell
                key={`${dayIndex}-${hour}`}
                value={data[dayIndex]?.[hour] || 0}
                maxValue={maxValue}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Low</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.5, 0.7, 1].map((intensity) => (
            <div
              key={intensity}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: `rgba(147, 51, 234, ${intensity})` }}
            />
          ))}
        </div>
        <span>High Engagement</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function InstagramAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['instagram-analytics', timeRange],
    queryFn: () => fetchAnalytics(parseInt(timeRange)),
  });

  return (
    <PageContainer title="Instagram Analytics">
      <div className="space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-end">
          <Select
            value={timeRange}
            onChange={(value) => setTimeRange(value as string)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            className="w-40"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !analytics ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No analytics data available yet. Data will appear after your first posts are published.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard
                label="Total Reach"
                value={analytics.summary.total_reach}
                icon={Eye}
              />
              <MetricCard
                label="Avg Engagement"
                value={analytics.summary.avg_engagement_rate}
                icon={Heart}
                format={(v) => `${(v * 100).toFixed(2)}%`}
              />
              <MetricCard
                label="Total Saves"
                value={analytics.summary.total_saves}
                icon={Bookmark}
              />
              <MetricCard
                label="Profile Views"
                value={analytics.summary.profile_views}
                icon={Users}
              />
              <MetricCard
                label="Follower Growth"
                value={analytics.summary.follower_growth}
                change={analytics.summary.follower_growth}
                icon={TrendingUp}
              />
            </div>

            {/* Engagement Chart */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Engagement Over Time</h2>
              </CardHeader>
              <CardContent>
                {analytics.engagement_over_time.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.engagement_over_time}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="date"
                        stroke="#888"
                        fontSize={12}
                        tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#888"
                        fontSize={12}
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#888"
                        fontSize={12}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
                        formatter={(value, name) => {
                          const numValue = typeof value === 'number' ? value : 0;
                          return name === 'engagement_rate'
                            ? [`${(numValue * 100).toFixed(2)}%`, 'Engagement']
                            : [numValue.toLocaleString(), 'Reach'];
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="engagement_rate"
                        stroke="#9333ea"
                        name="Engagement Rate"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="reach"
                        stroke="#3b82f6"
                        name="Reach"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No engagement data available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Performing Posts */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Top Performing Posts</h2>
                </CardHeader>
                <CardContent>
                  {analytics.top_posts?.length ? (
                    <div className="space-y-4">
                      {analytics.top_posts.map((post, index) => (
                        <div key={post.id} className="flex gap-3">
                          <div className="font-bold text-muted-foreground w-6">
                            #{index + 1}
                          </div>
                          {post.thumbnail && (
                            <img
                              src={post.thumbnail}
                              alt=""
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{post.caption || 'No caption'}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{(post.engagement_rate * 100).toFixed(2)}% eng</span>
                              <span>{post.reach.toLocaleString()} reach</span>
                              <span>{post.saves} saves</span>
                            </div>
                          </div>
                          <Badge variant="secondary" size="sm">
                            {post.post_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No posts with metrics yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Template Performance */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Template Performance</h2>
                </CardHeader>
                <CardContent>
                  {analytics.template_performance?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 font-medium">Template</th>
                            <th className="text-right py-2 font-medium">Used</th>
                            <th className="text-right py-2 font-medium">Avg Eng</th>
                            <th className="text-right py-2 font-medium">Saves</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.template_performance.map((template) => (
                            <tr key={template.template_id} className="border-b border-border/50">
                              <td className="py-2">
                                <div>{template.template_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {template.content_pillar}
                                </div>
                              </td>
                              <td className="text-right py-2">{template.times_used}</td>
                              <td className="text-right py-2">
                                {(template.avg_engagement_rate * 100).toFixed(2)}%
                              </td>
                              <td className="text-right py-2">{template.avg_saves}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No template data yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hashtag Performance */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Hashtag Set Performance</h2>
              </CardHeader>
              <CardContent>
                {analytics.hashtag_performance?.length ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.hashtag_performance.map((set) => (
                      <div
                        key={set.set_id}
                        className="p-4 rounded-lg border border-border"
                      >
                        <h3 className="font-medium">{set.set_name}</h3>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Used</p>
                            <p className="font-medium">{set.times_used}x</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Eng</p>
                            <p className="font-medium">
                              {(set.avg_engagement_rate * 100).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Reach</p>
                            <p className="font-medium">{set.avg_reach.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No hashtag data yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Optimal Times Heatmap */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Best Posting Times</h2>
                <p className="text-sm text-muted-foreground">
                  Based on your engagement data - darker colors indicate higher engagement
                </p>
              </CardHeader>
              <CardContent>
                <OptimalTimesHeatmap data={analytics.optimal_times_heatmap} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
