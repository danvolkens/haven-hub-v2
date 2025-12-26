'use client';

import { BarChart3, TrendingUp, Eye, Layers } from 'lucide-react';
import { Card } from '@/components/ui';
import { usePillarPerformance } from '@/hooks/use-content-pillars';
import { formatNumber } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
}

function StatCard({ label, value, icon, subtext }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <div>
        <p className="text-caption text-[var(--color-text-secondary)]">{label}</p>
        <p className="text-h2 text-charcoal">{value}</p>
        {subtext && (
          <p className="text-caption text-[var(--color-text-tertiary)]">{subtext}</p>
        )}
      </div>
    </Card>
  );
}

export function ContentMixOverview() {
  const { data, isLoading } = usePillarPerformance();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-elevated" />
        ))}
      </div>
    );
  }

  const performance = data?.performance || [];
  const totalContent = data?.total_content || 0;
  const totalImpressions = data?.total_impressions || 0;

  // Calculate aggregate stats
  const activePillars = performance.filter((p) => p.content_count > 0).length;
  const avgEngagement =
    performance.length > 0
      ? performance.reduce((sum, p) => sum + (p.avg_save_rate || 0), 0) /
        performance.length
      : 0;
  const topPerformer = [...performance].sort(
    (a, b) => (b.winner_percentage || 0) - (a.winner_percentage || 0)
  )[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Content"
        value={totalContent}
        icon={<Layers className="h-6 w-6 text-primary" />}
        subtext={data?.period ? `This ${data.period.type}` : undefined}
      />
      <StatCard
        label="Total Impressions"
        value={formatNumber(totalImpressions)}
        icon={<Eye className="h-6 w-6 text-primary" />}
      />
      <StatCard
        label="Active Pillars"
        value={`${activePillars}/6`}
        icon={<BarChart3 className="h-6 w-6 text-primary" />}
      />
      <StatCard
        label="Top Performer"
        value={topPerformer?.pillar?.name || 'N/A'}
        icon={<TrendingUp className="h-6 w-6 text-primary" />}
        subtext={
          topPerformer?.winner_percentage
            ? `${topPerformer.winner_percentage.toFixed(0)}% winners`
            : undefined
        }
      />
    </div>
  );
}
