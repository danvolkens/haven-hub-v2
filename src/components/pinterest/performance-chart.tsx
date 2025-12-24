'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber } from '@/lib/utils';

interface ChartDataPoint {
  date: string;
  impressions: number;
  saves: number;
  clicks: number;
}

export function PerformanceChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['pinterest-performance-chart'],
    queryFn: () => api.get<{ data: ChartDataPoint[] }>('/pinterest/analytics/chart'),
  });

  const chartData = data?.data || [];
  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.impressions, d.saves * 10, d.clicks * 10)),
    100
  );

  return (
    <Card>
      <CardHeader
        title="Performance Trends"
        description="Last 30 days of pin metrics"
      />
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse h-32 w-full bg-elevated rounded" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[var(--color-text-secondary)]">
            No performance data yet
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple bar chart visualization */}
            <div className="flex items-end gap-1 h-32">
              {chartData.slice(-14).map((point, index) => {
                const height = (point.impressions / maxValue) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-sage/20 hover:bg-sage/40 transition-colors rounded-t relative group"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-charcoal text-white text-caption rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatNumber(point.impressions)} impressions
                      <br />
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-caption">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-sage/40" />
                <span className="text-[var(--color-text-secondary)]">Impressions</span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-h3">
                  {formatNumber(chartData.reduce((sum, d) => sum + d.impressions, 0))}
                </p>
                <p className="text-caption text-[var(--color-text-tertiary)]">
                  Total Impressions
                </p>
              </div>
              <div className="text-center">
                <p className="text-h3">
                  {formatNumber(chartData.reduce((sum, d) => sum + d.saves, 0))}
                </p>
                <p className="text-caption text-[var(--color-text-tertiary)]">
                  Total Saves
                </p>
              </div>
              <div className="text-center">
                <p className="text-h3">
                  {formatNumber(chartData.reduce((sum, d) => sum + d.clicks, 0))}
                </p>
                <p className="text-caption text-[var(--color-text-tertiary)]">
                  Total Clicks
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
