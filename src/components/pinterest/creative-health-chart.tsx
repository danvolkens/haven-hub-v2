'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatPercent, cn } from '@/lib/utils';

interface TrendDataPoint {
  date: string;
  healthy: number;
  declining: number;
  fatigued: number;
  critical: number;
  avg_fatigue_score: number;
}

interface TrendResponse {
  trend: TrendDataPoint[];
  change_7d: number;
  change_30d: number;
}

export function CreativeHealthChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['creative-health-trend'],
    queryFn: () => api.get<TrendResponse>('/pinterest/creative-health/trend'),
    refetchInterval: 300000, // 5 minutes
  });

  const trend = data?.trend || [];
  const maxValue = Math.max(
    ...trend.map((d) => d.healthy + d.declining + d.fatigued + d.critical),
    1
  );

  // Calculate chart dimensions
  const chartHeight = 120;
  const barWidth = 100 / Math.max(trend.length, 1);

  return (
    <Card>
      <CardHeader
        title="Health Trend"
        description="Creative health distribution over time"
        action={
          <div className="flex items-center gap-3">
            {data && (
              <>
                <div className="flex items-center gap-1 text-caption">
                  {data.change_7d <= 0 ? (
                    <TrendingDown className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-error" />
                  )}
                  <span className={cn(
                    'font-medium',
                    data.change_7d <= 0 ? 'text-success' : 'text-error'
                  )}>
                    {data.change_7d > 0 ? '+' : ''}{data.change_7d.toFixed(1)}%
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">7d</span>
                </div>
                <div className="flex items-center gap-1 text-caption">
                  {data.change_30d <= 0 ? (
                    <TrendingDown className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-error" />
                  )}
                  <span className={cn(
                    'font-medium',
                    data.change_30d <= 0 ? 'text-success' : 'text-error'
                  )}>
                    {data.change_30d > 0 ? '+' : ''}{data.change_30d.toFixed(1)}%
                  </span>
                  <span className="text-[var(--color-text-tertiary)]">30d</span>
                </div>
              </>
            )}
          </div>
        }
      />
      <CardContent>
        {isLoading ? (
          <div className="h-[160px] flex items-center justify-center">
            <div className="animate-pulse">
              <Activity className="h-8 w-8 text-[var(--color-text-tertiary)]" />
            </div>
          </div>
        ) : trend.length === 0 ? (
          <div className="h-[160px] flex flex-col items-center justify-center text-[var(--color-text-secondary)]">
            <Activity className="h-8 w-8 mb-2" />
            <p className="text-body-sm">No trend data yet</p>
            <p className="text-caption text-[var(--color-text-tertiary)]">
              Data will appear after a few days of tracking
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stacked bar chart */}
            <div
              className="relative"
              style={{ height: chartHeight }}
            >
              <div className="absolute inset-0 flex items-end gap-px">
                {trend.map((day, i) => {
                  const total = day.healthy + day.declining + day.fatigued + day.critical;
                  const heightRatio = total / maxValue;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col justify-end group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-elevated-hover border rounded-md shadow-lg p-2 text-caption whitespace-nowrap">
                          <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                            <span className="text-success">Healthy: {day.healthy}</span>
                            <span className="text-warning">Declining: {day.declining}</span>
                            <span className="text-orange-500">Fatigued: {day.fatigued}</span>
                            <span className="text-error">Critical: {day.critical}</span>
                          </div>
                          <p className="mt-1 pt-1 border-t text-[var(--color-text-tertiary)]">
                            Avg fatigue: {day.avg_fatigue_score.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Stacked bars */}
                      <div
                        className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse"
                        style={{ height: `${heightRatio * 100}%` }}
                      >
                        {day.healthy > 0 && (
                          <div
                            className="bg-success transition-all"
                            style={{ height: `${(day.healthy / total) * 100}%` }}
                          />
                        )}
                        {day.declining > 0 && (
                          <div
                            className="bg-warning transition-all"
                            style={{ height: `${(day.declining / total) * 100}%` }}
                          />
                        )}
                        {day.fatigued > 0 && (
                          <div
                            className="bg-orange-500 transition-all"
                            style={{ height: `${(day.fatigued / total) * 100}%` }}
                          />
                        )}
                        {day.critical > 0 && (
                          <div
                            className="bg-error transition-all"
                            style={{ height: `${(day.critical / total) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border-b border-dashed border-[var(--color-border)]"
                    style={{ opacity: 0.5 }}
                  />
                ))}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-caption text-[var(--color-text-tertiary)]">
              {trend.length > 0 && (
                <>
                  <span>{new Date(trend[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(trend[trend.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-caption">
                <div className="h-2.5 w-2.5 rounded-sm bg-success" />
                <span className="text-[var(--color-text-secondary)]">Healthy</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption">
                <div className="h-2.5 w-2.5 rounded-sm bg-warning" />
                <span className="text-[var(--color-text-secondary)]">Declining</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption">
                <div className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
                <span className="text-[var(--color-text-secondary)]">Fatigued</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption">
                <div className="h-2.5 w-2.5 rounded-sm bg-error" />
                <span className="text-[var(--color-text-secondary)]">Critical</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
