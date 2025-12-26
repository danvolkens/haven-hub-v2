'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  Pause,
  ArrowRight,
  DollarSign,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignPerformanceWidgetProps {
  userId: string;
}

interface WinnerCampaign {
  id: string;
  name: string;
  cpa: number;
  roas: number;
  spend_7d: number;
  conversions_7d: number;
  status: 'scale' | 'maintain' | 'optimize' | 'pause';
  recommendation: string;
}

interface WinnersResponse {
  winners: WinnerCampaign[];
  total_count: number;
  scale_count: number;
  maintain_count: number;
  optimize_count: number;
  pause_count: number;
}

const statusConfig = {
  scale: {
    label: 'Winners',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Trophy,
  },
  maintain: {
    label: 'On Track',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: TrendingUp,
  },
  optimize: {
    label: 'Optimize',
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: AlertTriangle,
  },
  pause: {
    label: 'Review',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: Pause,
  },
};

export function CampaignPerformanceWidget({ userId }: CampaignPerformanceWidgetProps) {
  const { data, isLoading, error } = useQuery<WinnersResponse>({
    queryKey: ['campaign-winners', userId],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/campaigns/winners');
      if (!res.ok) throw new Error('Failed to fetch campaign performance');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-20" />
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silently fail - not critical
  }

  const topWinner = data.winners.find(w => w.status === 'scale');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-sage" />
          Campaign Performance
        </h3>
        <Link href="/dashboard/pinterest/ads?tab=budget">
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3 w-3" />}>
            View All
          </Button>
        </Link>
      </div>

      {/* 4-Quadrant Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(['scale', 'maintain', 'optimize', 'pause'] as const).map((status) => {
          const config = statusConfig[status];
          const count = data[`${status}_count` as keyof WinnersResponse] as number;
          const Icon = config.icon;

          return (
            <div
              key={status}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg border',
                config.bgColor,
                config.borderColor
              )}
            >
              <Icon className={cn('h-4 w-4 mb-1', config.textColor)} />
              <span className={cn('text-xl font-bold', config.textColor)}>{count}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Top Winner Highlight */}
      {topWinner ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Trophy className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{topWinner.name}</span>
                <Badge variant="success" size="sm">Top Performer</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  CPA: {formatCurrency(topWinner.cpa)}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  ROAS: {topWinner.roas.toFixed(1)}x
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1.5">
                {topWinner.recommendation}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-[var(--color-text-secondary)]">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No winners detected yet</p>
          <p className="text-xs mt-1">Campaigns need 7+ days of data</p>
        </div>
      )}

      {/* Scale Winners CTA */}
      {data.scale_count > 0 && (
        <div className="mt-3 pt-3 border-t">
          <Link href="/dashboard/pinterest/ads?tab=budget" className="block">
            <Button className="w-full" size="sm">
              <Trophy className="h-4 w-4 mr-2" />
              Scale {data.scale_count} Winner{data.scale_count !== 1 ? 's' : ''}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
