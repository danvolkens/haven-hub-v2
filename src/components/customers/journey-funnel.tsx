'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, ShoppingBag, Repeat, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber, cn } from '@/lib/utils';

interface JourneyAnalytics {
  stageDistribution: Record<string, number>;
  collectionDistribution: Record<string, number>;
  conversionFunnel: {
    visitors: number;
    leads: number;
    customers: number;
    repeat: number;
  };
  atRiskCount: number;
  avgLifetimeValue: number;
}

export function JourneyFunnel() {
  const { data, isLoading } = useQuery({
    queryKey: ['journey-analytics'],
    queryFn: () => api.get<JourneyAnalytics>('/customers/analytics'),
  });

  const funnel = data?.conversionFunnel || { visitors: 0, leads: 0, customers: 0, repeat: 0 };
  const maxValue = Math.max(funnel.visitors, 1);

  const stages = [
    { label: 'Visitors', value: funnel.visitors, icon: Users, color: 'bg-gray-400' },
    { label: 'Leads', value: funnel.leads, icon: UserPlus, color: 'bg-teal' },
    { label: 'Customers', value: funnel.customers, icon: ShoppingBag, color: 'bg-sage' },
    { label: 'Repeat', value: funnel.repeat, icon: Repeat, color: 'bg-terracotta' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader
          title="Customer Journey Funnel"
          description="Conversion through lifecycle stages"
        />
        <CardContent className="p-6 pt-0">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Customer Journey Funnel"
        description="Conversion through lifecycle stages"
      />
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const width = (stage.value / maxValue) * 100;
            const conversionRate = index > 0 && stages[index - 1].value > 0
              ? (stage.value / stages[index - 1].value) * 100
              : null;

            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <stage.icon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                    <span className="text-body-sm font-medium">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-mono">{formatNumber(stage.value)}</span>
                    {conversionRate !== null && (
                      <Badge variant="secondary" size="sm">
                        {conversionRate.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-elevated rounded-md overflow-hidden">
                  <div
                    className={cn('h-full rounded-md transition-all', stage.color)}
                    style={{ width: `${Math.max(width, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* At-risk alert */}
        {data && data.atRiskCount > 0 && (
          <div className="mt-6 p-3 rounded-md bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-body-sm">
                <strong>{data.atRiskCount}</strong> customers at risk of churning
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
