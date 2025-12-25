'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, TrendingDown, RefreshCw } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';

interface HealthSummary {
  total_tracked: number;
  pending_baseline: number;
  healthy: number;
  declining: number;
  fatigued: number;
  critical: number;
  refresh_recommended: number;
  avg_fatigue_score: number;
}

export function CreativeHealthSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['creative-health-summary'],
    queryFn: () => api.get<HealthSummary>('/pinterest/creative-health/summary'),
    refetchInterval: 300000, // 5 minutes
  });

  const statusCards = [
    {
      label: 'Healthy',
      value: data?.healthy || 0,
      icon: CheckCircle2,
      variant: 'success' as const,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Declining',
      value: data?.declining || 0,
      icon: TrendingDown,
      variant: 'warning' as const,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Fatigued',
      value: data?.fatigued || 0,
      icon: AlertTriangle,
      variant: 'error' as const,
      color: 'text-error',
      bgColor: 'bg-error/10',
    },
    {
      label: 'Critical',
      value: data?.critical || 0,
      icon: Activity,
      variant: 'error' as const,
      color: 'text-error',
      bgColor: 'bg-error/20',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-sage" />
          <h2 className="text-h2">Creative Health</h2>
        </div>
        {data && data.refresh_recommended > 0 && (
          <Badge variant="warning" size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            {data.refresh_recommended} need refresh
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card) => (
          <Card key={card.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-md p-2', card.bgColor)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
              <div>
                <p className="text-metric">
                  {isLoading ? (
                    <span className="inline-block h-6 w-8 rounded bg-elevated animate-pulse" />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  {card.label}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Additional metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">Total Tracked</p>
          <p className="text-metric mt-1">
            {isLoading ? (
              <span className="inline-block h-6 w-12 rounded bg-elevated animate-pulse" />
            ) : (
              data?.total_tracked || 0
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">Pending Baseline</p>
          <p className="text-metric mt-1">
            {isLoading ? (
              <span className="inline-block h-6 w-12 rounded bg-elevated animate-pulse" />
            ) : (
              data?.pending_baseline || 0
            )}
          </p>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            Need 7 days / 1K impressions
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">Avg Fatigue Score</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-metric">
              {isLoading ? (
                <span className="inline-block h-6 w-12 rounded bg-elevated animate-pulse" />
              ) : (
                `${Math.round(data?.avg_fatigue_score || 0)}%`
              )}
            </p>
            {!isLoading && data && (
              <Badge
                variant={
                  data.avg_fatigue_score <= 25 ? 'success' :
                  data.avg_fatigue_score <= 50 ? 'warning' :
                  'error'
                }
                size="sm"
              >
                {data.avg_fatigue_score <= 25 ? 'Good' :
                 data.avg_fatigue_score <= 50 ? 'Watch' :
                 'Action Needed'}
              </Badge>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
