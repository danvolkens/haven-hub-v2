'use client';

import { RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui';
import {
  useContentMixData,
  useRegenerateMixRecommendations,
} from '@/hooks/use-content-pillars';
import { cn } from '@/lib/utils';

// Color palette for pillars
const PILLAR_COLORS: Record<string, string> = {
  quote_reveal: '#4F46E5', // Indigo
  transformation: '#0891B2', // Cyan
  educational: '#059669', // Emerald
  lifestyle: '#D97706', // Amber
  behind_scenes: '#7C3AED', // Violet
  user_generated: '#DB2777', // Pink
};

interface DonutChartProps {
  data: Array<{ id: string; name: string; percentage: number }>;
  title: string;
  centerLabel?: string;
}

function DonutChart({ data, title, centerLabel }: DonutChartProps) {
  // Calculate stroke dash array for each segment
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercentage = 0;

  const segments = data.map((item) => {
    const offset = circumference * (1 - cumulativePercentage / 100);
    const length = circumference * (item.percentage / 100);
    cumulativePercentage += item.percentage;

    return {
      ...item,
      offset,
      length,
      color: PILLAR_COLORS[item.id] || '#6B7280',
    };
  });

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-body-sm font-medium text-[var(--color-text-secondary)] mb-4">
        {title}
      </h4>
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="24"
          />
          {/* Segments */}
          {segments.map((segment, index) => (
            <circle
              key={segment.id}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="24"
              strokeDasharray={`${segment.length} ${circumference - segment.length}`}
              strokeDashoffset={segment.offset}
              transform="rotate(-90 100 100)"
              className="transition-all duration-500"
            />
          ))}
        </svg>
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-h3 text-charcoal">{centerLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartLegend({
  data,
}: {
  data: Array<{ id: string; name: string; percentage: number }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {data.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: PILLAR_COLORS[item.id] || '#6B7280' }}
          />
          <span className="text-caption text-[var(--color-text-secondary)] truncate">
            {item.name}
          </span>
          <span className="text-caption font-medium ml-auto">
            {item.percentage.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function ContentMixCharts() {
  const { performance, recommendations, isLoading, isExpired } =
    useContentMixData();
  const regenerateMutation = useRegenerateMixRecommendations();

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Content Mix Distribution" />
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-[var(--color-text-tertiary)]">
              Loading chart data...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare current mix data
  const currentMixData = performance
    .filter((p) => p.pillar && (p.current_percentage || 0) > 0)
    .map((p) => ({
      id: p.pillar_id,
      name: p.pillar?.name || 'Unknown',
      percentage: p.current_percentage || 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Prepare recommended mix data
  const recommendedMixData = recommendations
    .filter((r) => r.pillar && r.recommended_percentage > 0)
    .map((r) => ({
      id: r.pillar_id,
      name: r.pillar?.name || 'Unknown',
      percentage: r.recommended_percentage,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const hasCurrentData = currentMixData.length > 0;
  const hasRecommendations = recommendedMixData.length > 0;

  return (
    <Card>
      <CardHeader
        title="Content Mix Distribution"
        description="Compare your current content mix with AI recommendations"
        action={
          <div className="flex items-center gap-2">
            {isExpired && (
              <Badge variant="warning" className="text-caption">
                Recommendations expired
              </Badge>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4 mr-2',
                  regenerateMutation.isPending && 'animate-spin'
                )}
              />
              Refresh
            </Button>
          </div>
        }
      />
      <CardContent className="mt-4">
        {!hasCurrentData && !hasRecommendations ? (
          <div className="h-64 flex flex-col items-center justify-center text-[var(--color-text-secondary)]">
            <p className="text-body">No content mix data available</p>
            <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
              Start publishing content with pillar tags to see your mix analysis
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Current Mix */}
            <div>
              <DonutChart
                data={hasCurrentData ? currentMixData : recommendedMixData}
                title="Current Mix"
                centerLabel={hasCurrentData ? 'Now' : '--'}
              />
              <ChartLegend
                data={hasCurrentData ? currentMixData : recommendedMixData}
              />
              {!hasCurrentData && (
                <p className="text-caption text-center text-[var(--color-text-tertiary)] mt-2">
                  No published content yet
                </p>
              )}
            </div>

            {/* Recommended Mix */}
            <div>
              <DonutChart
                data={recommendedMixData}
                title="Recommended Mix"
                centerLabel="Target"
              />
              <ChartLegend data={recommendedMixData} />
              {recommendations.length > 0 && (
                <p className="text-caption text-center text-[var(--color-text-tertiary)] mt-2">
                  Based on your performance data
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
