'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber, formatPercent } from '@/lib/utils';
import type { Pin } from '@/types/pinterest';

export function TopPinsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['top-pins'],
    queryFn: () => api.get<{ pins: Pin[] }>('/pinterest/analytics/top-pins'),
  });

  const pins = data?.pins || [];

  return (
    <Card>
      <CardHeader
        title="Top Performing Pins"
        description="Your best performing content in the last 30 days"
      />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-elevated">
                <th className="px-4 py-3 text-left text-caption font-medium text-[var(--color-text-secondary)]">
                  Pin
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Impressions
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Saves
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Clicks
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Engagement
                </th>
                <th className="px-4 py-3 text-center text-caption font-medium text-[var(--color-text-secondary)]">
                  Tier
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded bg-elevated" />
                        <div className="h-4 w-32 rounded bg-elevated" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-4 w-16 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 mx-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-8 rounded bg-elevated" /></td>
                  </tr>
                ))
              ) : pins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    No published pins yet
                  </td>
                </tr>
              ) : (
                pins.map((pin) => (
                  <tr key={pin.id} className="hover:bg-elevated/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded overflow-hidden bg-elevated shrink-0">
                          <Image
                            src={pin.image_url}
                            alt={pin.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-sm font-medium truncate max-w-[200px]">
                            {pin.title}
                          </p>
                          {pin.collection && (
                            <Badge
                              variant={pin.collection as 'grounding' | 'wholeness' | 'growth'}
                              size="sm"
                            >
                              {pin.collection}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-body-sm">
                      {formatNumber(pin.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-body-sm">
                      {formatNumber(pin.saves)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-body-sm">
                      {formatNumber(pin.clicks)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pin.engagement_rate !== null && pin.engagement_rate >= 0.02 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-warning" />
                        )}
                        <span className="font-mono text-body-sm">
                          {formatPercent(pin.engagement_rate || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          pin.performance_tier === 'top' ? 'success' :
                          pin.performance_tier === 'good' ? 'info' :
                          pin.performance_tier === 'average' ? 'secondary' :
                          'warning'
                        }
                        size="sm"
                      >
                        {pin.performance_tier || 'pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {pin.pinterest_pin_id && (
                        <a
                          href={`https://pinterest.com/pin/${pin.pinterest_pin_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon-sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
