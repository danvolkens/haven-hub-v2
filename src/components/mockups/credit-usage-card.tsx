'use client';

import { useQuery } from '@tanstack/react-query';
import { Coins, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import type { CreditUsage } from '@/types/mockups';

export function CreditUsageCard() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['mockup-credits'],
    queryFn: () => api.get<CreditUsage>('/mockups/credits'),
    refetchInterval: 60000,
  });

  if (isLoading || !usage) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-elevated rounded" />
        </CardContent>
      </Card>
    );
  }

  const annualPercent = (usage.total_used / usage.annual_budget) * 100;
  const monthlyPercent = (usage.monthly_used / usage.monthly_soft_limit) * 100;
  const isMonthlyWarning = monthlyPercent >= 80;
  const isAnnualWarning = annualPercent >= 80;

  return (
    <Card>
      <CardHeader
        title="Mockup Credits"
        description="Dynamic Mockups API usage"
        action={
          <Coins className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        }
      />
      <CardContent className="p-6 pt-0 space-y-4">
        {/* Annual budget */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-body-sm">Annual Budget</span>
            <div className="flex items-center gap-2">
              {isAnnualWarning && (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <span className="text-body-sm font-mono">
                {usage.remaining_annual.toLocaleString()} remaining
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                annualPercent >= 90 ? 'bg-error' :
                annualPercent >= 75 ? 'bg-warning' : 'bg-sage'
              )}
              style={{ width: `${Math.min(annualPercent, 100)}%` }}
            />
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            {usage.total_used.toLocaleString()} / {usage.annual_budget.toLocaleString()} used this year
          </p>
        </div>

        {/* Monthly usage */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-body-sm">Monthly Pace</span>
            <Badge variant={isMonthlyWarning ? 'warning' : 'secondary'} size="sm">
              {isMonthlyWarning ? 'Above target' : 'On track'}
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                monthlyPercent >= 100 ? 'bg-warning' : 'bg-teal'
              )}
              style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
            />
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            {usage.monthly_used} / {usage.monthly_soft_limit} soft limit
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
