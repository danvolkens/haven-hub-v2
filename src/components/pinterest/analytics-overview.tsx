'use client';

import { useQuery } from '@tanstack/react-query';
import { Eye, Heart, MousePointer, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber, formatPercent } from '@/lib/utils';

interface AnalyticsData {
  impressions: number;
  saves: number;
  clicks: number;
  engagementRate: number;
  publishedPins: number;
  topPerformers: number;
  underperformers: number;
  lastSynced: string | null;
}

export function AnalyticsOverview() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pinterest-analytics-overview'],
    queryFn: () => api.get<AnalyticsData>('/pinterest/analytics/overview'),
    refetchInterval: 300000, // 5 minutes
  });

  const handleSync = async () => {
    await api.post('/pinterest/analytics/sync');
    refetch();
  };

  const metrics = [
    {
      label: 'Total Impressions',
      value: data?.impressions || 0,
      icon: Eye,
      format: formatNumber,
    },
    {
      label: 'Total Saves',
      value: data?.saves || 0,
      icon: Heart,
      format: formatNumber,
    },
    {
      label: 'Total Clicks',
      value: data?.clicks || 0,
      icon: MousePointer,
      format: formatNumber,
    },
    {
      label: 'Engagement Rate',
      value: data?.engagementRate || 0,
      icon: TrendingUp,
      format: formatPercent,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-h2">Overview</h2>
          {data?.lastSynced && (
            <span className="text-caption text-[var(--color-text-tertiary)]">
              Last synced: {new Date(data.lastSynced).toLocaleString()}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSync}
          isLoading={isFetching}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Sync Now
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-sage-pale p-2">
                <metric.icon className="h-5 w-5 text-sage" />
              </div>
              <div>
                <p className="text-metric">
                  {isLoading ? '—' : metric.format(metric.value)}
                </p>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  {metric.label}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">Published Pins</p>
          <p className="text-metric mt-1">{data?.publishedPins || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-[var(--color-text-secondary)]">Top Performers</p>
            <Badge variant="success" size="sm">{data?.topPerformers || 0}</Badge>
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            &gt;2% engagement rate
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-[var(--color-text-secondary)]">Underperformers</p>
            <Badge variant="warning" size="sm">{data?.underperformers || 0}</Badge>
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            &lt;1% after 7 days
          </p>
        </Card>
      </div>
    </div>
  );
}
