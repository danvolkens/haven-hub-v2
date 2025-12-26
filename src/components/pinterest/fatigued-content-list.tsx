'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatPercent, formatNumber, formatRelativeTime, cn } from '@/lib/utils';

interface CreativeHealthItem {
  id: string;
  content_type: 'pin' | 'ad_creative' | 'asset';
  content_id: string;
  fatigue_score: number;
  status: 'pending_baseline' | 'healthy' | 'declining' | 'fatigued' | 'critical';
  baseline_ctr: number | null;
  current_ctr: number | null;
  baseline_engagement_rate: number | null;
  current_engagement_rate: number | null;
  days_active: number;
  refresh_recommended: boolean;
  refresh_reason: string | null;
  last_refresh_at: string | null;
  refresh_count: number;
  updated_at: string;
  // Joined content data
  content?: {
    id: string;
    title: string;
    image_url: string;
    pinterest_pin_id?: string;
  };
}

interface FatiguedContentResponse {
  items: CreativeHealthItem[];
  total: number;
}

function FatigueProgressBar({ score }: { score: number }) {
  const getColor = () => {
    if (score <= 25) return 'bg-success';
    if (score <= 50) return 'bg-warning';
    if (score <= 75) return 'bg-orange-500';
    return 'bg-error';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-caption mb-1">
        <span className="text-[var(--color-text-secondary)]">Fatigue Score</span>
        <span className={cn(
          'font-medium',
          score <= 25 ? 'text-success' :
          score <= 50 ? 'text-warning' :
          score <= 75 ? 'text-orange-500' :
          'text-error'
        )}>
          {score}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getColor())}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CreativeHealthItem['status'] }) {
  const config = {
    pending_baseline: { variant: 'secondary' as const, label: 'Pending Baseline', icon: null },
    healthy: { variant: 'success' as const, label: 'Healthy', icon: CheckCircle2 },
    declining: { variant: 'warning' as const, label: 'Declining', icon: TrendingDown },
    fatigued: { variant: 'error' as const, label: 'Fatigued', icon: AlertTriangle },
    critical: { variant: 'error' as const, label: 'Critical', icon: AlertTriangle },
  };

  const { variant, label, icon: Icon } = config[status];

  return (
    <Badge variant={variant} size="sm">
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

export function FatiguedContentList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['fatigued-content'],
    queryFn: () => api.get<FatiguedContentResponse>('/pinterest/creative-health/fatigued'),
    refetchInterval: 300000, // 5 minutes
  });

  const markRefreshedMutation = useMutation({
    mutationFn: (item: CreativeHealthItem) =>
      api.post('/pinterest/creative-health/mark-refreshed', {
        content_type: item.content_type,
        content_id: item.content_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fatigued-content'] });
      queryClient.invalidateQueries({ queryKey: ['creative-health-summary'] });
    },
  });

  const items = data?.items || [];

  return (
    <Card>
      <CardHeader
        title="Fatigued Content"
        description="Content showing performance decline that may need refreshing"
      />
      <CardContent className="p-0">
        <div className="divide-y">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded bg-elevated shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-elevated" />
                    <div className="h-3 w-32 rounded bg-elevated" />
                    <div className="h-2 w-full rounded bg-elevated" />
                  </div>
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-3" />
              <p className="text-body font-medium">All content is healthy!</p>
              <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
                No pins or ads are showing fatigue signs
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Content preview */}
                  <div className="relative h-16 w-16 rounded overflow-hidden bg-elevated shrink-0">
                    {item.content?.image_url ? (
                      <Image
                        src={item.content.image_url}
                        alt={item.content.title || 'Content'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[var(--color-text-tertiary)]">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-body-sm font-medium truncate">
                          {item.content?.title || `${item.content_type} ${item.content_id.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={item.status} />
                          <span className="text-caption text-[var(--color-text-tertiary)]">
                            {item.days_active} days active
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.content?.pinterest_pin_id && (
                          <a
                            href={`https://pinterest.com/pin/${item.content.pinterest_pin_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon-sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => markRefreshedMutation.mutate(item)}
                          isLoading={markRefreshedMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Mark Refreshed
                        </Button>
                      </div>
                    </div>

                    {/* Fatigue progress bar */}
                    <FatigueProgressBar score={item.fatigue_score} />

                    {/* Metrics comparison */}
                    {item.baseline_ctr !== null && item.current_ctr !== null && (
                      <div className="flex items-center gap-4 mt-3 text-caption">
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">CTR: </span>
                          <span className="text-[var(--color-text-secondary)] line-through">
                            {formatPercent(item.baseline_ctr, 2)}
                          </span>
                          <span className="mx-1">→</span>
                          <span className={cn(
                            'font-medium',
                            item.current_ctr < item.baseline_ctr ? 'text-error' : 'text-success'
                          )}>
                            {formatPercent(item.current_ctr, 2)}
                          </span>
                        </div>
                        {item.baseline_engagement_rate !== null && item.current_engagement_rate !== null && (
                          <div>
                            <span className="text-[var(--color-text-tertiary)]">Engagement: </span>
                            <span className="text-[var(--color-text-secondary)] line-through">
                              {formatPercent(item.baseline_engagement_rate, 2)}
                            </span>
                            <span className="mx-1">→</span>
                            <span className={cn(
                              'font-medium',
                              item.current_engagement_rate < item.baseline_engagement_rate ? 'text-error' : 'text-success'
                            )}>
                              {formatPercent(item.current_engagement_rate, 2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Refresh info */}
                    {item.refresh_reason && (
                      <p className="text-caption text-warning mt-2">
                        {item.refresh_reason}
                      </p>
                    )}
                    {item.last_refresh_at && (
                      <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
                        Last refreshed: {formatRelativeTime(item.last_refresh_at)} (×{item.refresh_count})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
