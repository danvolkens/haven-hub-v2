'use client';

import {
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { useContentMixData } from '@/hooks/use-content-pillars';
import { cn } from '@/lib/utils';

// Color palette for pillars
const PILLAR_COLORS: Record<string, string> = {
  quote_reveal: '#4F46E5',
  transformation: '#0891B2',
  educational: '#059669',
  lifestyle: '#D97706',
  behind_scenes: '#7C3AED',
  user_generated: '#DB2777',
};

export function ContentMixActions() {
  const { actions, recommendations, isLoading } = useContentMixData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Action Recommendations" />
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse bg-elevated rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to only show actionable items (not 'maintain')
  const actionableItems = actions.filter(
    (a) => a.action !== 'maintain' || a.priority === 'high'
  );

  const hasActions = actionableItems.length > 0;

  // Get reasoning from recommendations for context
  const getReasoningForPillar = (pillarId: string) => {
    const rec = recommendations.find((r) => r.pillar_id === pillarId);
    return rec?.reasoning;
  };

  return (
    <Card>
      <CardHeader
        title="Action Recommendations"
        description="Optimize your content mix based on performance data"
        action={
          hasActions && (
            <Badge
              variant={
                actionableItems.some((a) => a.priority === 'high')
                  ? 'warning'
                  : 'default'
              }
            >
              {actionableItems.length} action{actionableItems.length !== 1 ? 's' : ''}
            </Badge>
          )
        }
      />
      <CardContent className="mt-4">
        {!hasActions ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mb-3" />
            <p className="text-body font-medium text-charcoal">
              Your content mix is well balanced
            </p>
            <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
              Continue with your current strategy
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {actionableItems.map((item) => {
              const reasoning = getReasoningForPillar(item.pillar.id);

              return (
                <div
                  key={item.pillar.id}
                  className={cn(
                    'rounded-lg border p-4',
                    item.priority === 'high' && 'border-warning bg-warning/5',
                    item.priority === 'medium' && 'border-[var(--color-border)]',
                    item.priority === 'low' && 'border-[var(--color-border)] opacity-75'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Priority icon */}
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
                          item.action === 'increase' && 'bg-success/10',
                          item.action === 'decrease' && 'bg-error/10',
                          item.action === 'maintain' && 'bg-primary/10'
                        )}
                      >
                        {item.action === 'increase' && (
                          <ArrowUp className="h-4 w-4 text-success" />
                        )}
                        {item.action === 'decrease' && (
                          <ArrowDown className="h-4 w-4 text-error" />
                        )}
                        {item.action === 'maintain' && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{
                              backgroundColor:
                                PILLAR_COLORS[item.pillar.id] || '#6B7280',
                            }}
                          />
                          <span className="text-body font-medium">
                            {item.pillar.name}
                          </span>
                          <Badge
                            variant={
                              item.priority === 'high'
                                ? 'warning'
                                : item.priority === 'medium'
                                  ? 'secondary'
                                  : 'default'
                            }
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                        </div>

                        <p className="text-body-sm text-[var(--color-text-secondary)]">
                          {item.suggestion}
                        </p>

                        {/* Reasoning details */}
                        {reasoning && (
                          <div className="mt-2 flex items-start gap-2 text-caption text-[var(--color-text-tertiary)]">
                            <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">{reasoning.primary}</span>
                              {reasoning.factors && reasoning.factors.length > 0 && (
                                <ul className="mt-1 list-disc list-inside">
                                  {reasoning.factors.slice(0, 2).map((factor, i) => (
                                    <li key={i}>{factor}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gap indicator */}
                    <div className="text-right flex-shrink-0">
                      <span
                        className={cn(
                          'text-h3 font-bold',
                          item.gap > 0 ? 'text-success' : 'text-error'
                        )}
                      >
                        {item.gap > 0 ? '+' : ''}
                        {item.gap.toFixed(0)}%
                      </span>
                      <p className="text-caption text-[var(--color-text-tertiary)]">
                        gap
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Maintained pillars summary */}
            {actions.filter((a) => a.action === 'maintain' && a.priority !== 'high')
              .length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t text-caption text-[var(--color-text-tertiary)]">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>
                  {
                    actions.filter(
                      (a) => a.action === 'maintain' && a.priority !== 'high'
                    ).length
                  }{' '}
                  pillar(s) are on target - no action needed
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
