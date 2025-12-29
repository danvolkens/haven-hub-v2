'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Heart, MousePointer, TrendingUp, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
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

interface SyncResult {
  success: boolean;
  synced: number;
  updated: number;
  totalPins?: number;
  pinsWithData?: number;
  errors?: string[];
  error?: string;
}

export function AnalyticsOverview() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pinterest-analytics-overview'],
    queryFn: () => api.get<AnalyticsData>('/pinterest/analytics/overview'),
    refetchInterval: 300000, // 5 minutes
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.post<SyncResult>('/pinterest/analytics/sync');
      setSyncResult(result);
      // Refresh all analytics queries
      queryClient.invalidateQueries({ queryKey: ['pinterest-analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['top-pins'] });
      queryClient.invalidateQueries({ queryKey: ['pinterest-chart'] });
    } catch (error) {
      setSyncResult({
        success: false,
        synced: 0,
        updated: 0,
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setIsSyncing(false);
    }
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
          isLoading={isSyncing}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />}
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Sync result feedback */}
      {syncResult && (
        <div className={`p-3 rounded-md ${
          syncResult.success && (syncResult.pinsWithData || 0) > 0
            ? 'bg-success/10 text-success'
            : syncResult.success
            ? 'bg-warning/10 text-warning'
            : 'bg-error/10 text-error'
        }`}>
          <div className="flex items-start gap-2">
            {syncResult.success ? (
              <>
                {(syncResult.pinsWithData || 0) > 0 ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="text-body-sm">
                    Synced {syncResult.synced}/{syncResult.totalPins || 0} pins.
                    {' '}{syncResult.pinsWithData || 0} had analytics data.
                  </span>
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-1 text-caption opacity-80">
                      {syncResult.errors.length} error(s): {syncResult.errors[0]}
                    </div>
                  )}
                  {syncResult.synced > 0 && (syncResult.pinsWithData || 0) === 0 && (
                    <div className="mt-1 text-caption opacity-80">
                      Pinterest may take 24-48 hours to report analytics for new pins.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="text-body-sm">{syncResult.error}</span>
              </>
            )}
            <button
              onClick={() => setSyncResult(null)}
              className="ml-auto text-caption hover:opacity-70 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
