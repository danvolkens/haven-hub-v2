'use client';

import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { useContentMixData } from '@/hooks/use-content-pillars';
import { formatNumber, cn } from '@/lib/utils';

// Color palette for pillars
const PILLAR_COLORS: Record<string, string> = {
  quote_reveal: '#4F46E5',
  transformation: '#0891B2',
  educational: '#059669',
  lifestyle: '#D97706',
  behind_scenes: '#7C3AED',
  user_generated: '#DB2777',
};

function PerformanceIndicator({ value }: { value: number }) {
  if (value > 5) {
    return (
      <div className="flex items-center gap-1 text-success">
        <TrendingUp className="h-3 w-3" />
        <span className="text-caption font-medium">+{value.toFixed(0)}%</span>
      </div>
    );
  }
  if (value < -5) {
    return (
      <div className="flex items-center gap-1 text-error">
        <TrendingDown className="h-3 w-3" />
        <span className="text-caption font-medium">{value.toFixed(0)}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[var(--color-text-tertiary)]">
      <Minus className="h-3 w-3" />
      <span className="text-caption">On target</span>
    </div>
  );
}

export function PillarPerformanceTable() {
  const { performance, recommendations, pillars, isLoading, period } =
    useContentMixData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Performance by Pillar" />
        <CardContent>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse bg-elevated rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine performance data with recommendations
  const tableData = pillars
    .map((pillar) => {
      const perf = performance.find((p) => p.pillar_id === pillar.id);
      const rec = recommendations.find((r) => r.pillar_id === pillar.id);

      return {
        pillar,
        performance: perf,
        recommendation: rec,
        gap:
          (rec?.recommended_percentage || pillar.recommended_percentage) -
          (perf?.current_percentage || 0),
      };
    })
    .sort((a, b) => {
      // Sort by content count, then by pillar order
      const countA = a.performance?.content_count || 0;
      const countB = b.performance?.content_count || 0;
      if (countB !== countA) return countB - countA;
      return a.pillar.display_order - b.pillar.display_order;
    });

  const hasData = tableData.some((d) => d.performance?.content_count);

  return (
    <Card>
      <CardHeader
        title="Performance by Pillar"
        description={
          period
            ? `${period.type.charAt(0).toUpperCase() + period.type.slice(1)} starting ${new Date(period.start).toLocaleDateString()}`
            : 'No period data yet'
        }
      />
      <CardContent className="mt-4">
        {!hasData ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            <p>No pillar performance data yet</p>
            <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
              Tag your pins with content pillars to track performance
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)]">
                    Pillar
                  </th>
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)] text-right">
                    Content
                  </th>
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)] text-right">
                    Impressions
                  </th>
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)] text-right">
                    CTR
                  </th>
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)] text-right">
                    Save Rate
                  </th>
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)] text-right">
                    Winners
                  </th>
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)] text-right">
                    Mix %
                  </th>
                  <th className="pb-3 text-caption font-medium text-[var(--color-text-secondary)] text-right">
                    vs Target
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(({ pillar, performance: perf, recommendation: rec, gap }) => (
                  <tr
                    key={pillar.id}
                    className="border-b last:border-0 hover:bg-elevated/50"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor:
                              PILLAR_COLORS[pillar.id] || '#6B7280',
                          }}
                        />
                        <div>
                          <span className="text-body-sm font-medium">
                            {pillar.name}
                          </span>
                          {perf?.winner_percentage &&
                            perf.winner_percentage > 25 && (
                              <Trophy className="inline-block h-3.5 w-3.5 ml-1.5 text-warning" />
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right text-body-sm">
                      {perf?.content_count || 0}
                    </td>
                    <td className="py-3 text-right text-body-sm">
                      {formatNumber(perf?.impressions || 0)}
                    </td>
                    <td className="py-3 text-right text-body-sm">
                      {perf?.avg_ctr
                        ? `${(perf.avg_ctr * 100).toFixed(2)}%`
                        : '--'}
                    </td>
                    <td className="py-3 text-right text-body-sm">
                      {perf?.avg_save_rate
                        ? `${(perf.avg_save_rate * 100).toFixed(2)}%`
                        : '--'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-body-sm">
                          {perf?.winner_count || 0}
                        </span>
                        {perf?.winner_percentage ? (
                          <Badge
                            variant={
                              perf.winner_percentage > 25 ? 'success' : 'default'
                            }
                            className="text-xs"
                          >
                            {perf.winner_percentage.toFixed(0)}%
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={cn(
                            'text-body-sm font-medium',
                            (perf?.current_percentage || 0) > 0
                              ? 'text-charcoal'
                              : 'text-[var(--color-text-tertiary)]'
                          )}
                        >
                          {(perf?.current_percentage || 0).toFixed(0)}%
                        </span>
                        <span className="text-caption text-[var(--color-text-tertiary)]">
                          / {rec?.recommended_percentage || pillar.recommended_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <PerformanceIndicator value={-gap} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
