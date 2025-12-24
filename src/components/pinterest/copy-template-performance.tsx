'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber, formatPercent } from '@/lib/utils';
import type { PinCopyTemplate } from '@/types/pinterest';

export function CopyTemplatePerformance() {
  const { data, isLoading } = useQuery({
    queryKey: ['copy-template-performance'],
    queryFn: () => api.get<{ templates: PinCopyTemplate[] }>('/pinterest/analytics/copy-templates'),
  });

  const templates = data?.templates || [];

  return (
    <Card>
      <CardHeader
        title="Copy Template Performance"
        description="See which templates drive engagement"
      />
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between p-3 rounded-lg bg-elevated">
              <div className="h-4 w-32 rounded bg-surface" />
              <div className="h-4 w-16 rounded bg-surface" />
            </div>
          ))
        ) : templates.length === 0 ? (
          <p className="text-center text-[var(--color-text-secondary)] py-4">
            No template data yet
          </p>
        ) : (
          templates.slice(0, 5).map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 rounded-lg bg-elevated"
            >
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium truncate">{template.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-caption text-[var(--color-text-tertiary)]">
                    {formatNumber(template.times_used)} uses
                  </span>
                  {template.collection && (
                    <Badge
                      variant={template.collection as 'grounding' | 'wholeness' | 'growth'}
                      size="sm"
                    >
                      {template.collection}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-body-sm font-medium">
                  {formatPercent(template.avg_engagement_rate || 0)}
                </p>
                <p className="text-caption text-[var(--color-text-tertiary)]">
                  engagement
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
