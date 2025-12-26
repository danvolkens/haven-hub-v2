'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
} from 'lucide-react';

interface SalesStats {
  today: { orders: number; revenue: number };
  thisWeek: { orders: number; revenue: number };
  thisMonth: { orders: number; revenue: number };
  topProducts: Array<{
    title: string;
    revenue: number;
    orders: number;
  }>;
  comparisonToLastWeek: number; // percentage change
}

export function ShopifySalesWidget() {
  const { data: stats, isLoading } = useQuery<SalesStats>({
    queryKey: ['shopify-sales-stats'],
    queryFn: () => fetch('/api/integrations/shopify/sales-stats').then((r) => r.json()),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Shopify Sales" />
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[var(--color-bg-secondary)] rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const trendColor = stats.comparisonToLastWeek >= 0
    ? 'text-[var(--color-success)]'
    : 'text-[var(--color-error)]';
  const TrendIcon = stats.comparisonToLastWeek >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <h3 className="text-h3">Shopify Sales</h3>
            <div className="flex items-center gap-1 text-body-sm">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={trendColor}>
                {stats.comparisonToLastWeek >= 0 ? '+' : ''}
                {stats.comparisonToLastWeek.toFixed(1)}%
              </span>
              <span className="text-[var(--color-text-secondary)]">vs last week</span>
            </div>
          </div>
          <DollarSign className="h-5 w-5 text-[var(--color-text-secondary)]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Time Period Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-body-sm text-[var(--color-text-secondary)]">Today</p>
              <p className="text-h2">{formatCurrency(stats.today.revenue)}</p>
              <p className="text-caption text-[var(--color-text-secondary)] flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {stats.today.orders} orders
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-body-sm text-[var(--color-text-secondary)]">This Week</p>
              <p className="text-h2">{formatCurrency(stats.thisWeek.revenue)}</p>
              <p className="text-caption text-[var(--color-text-secondary)] flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {stats.thisWeek.orders} orders
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-body-sm text-[var(--color-text-secondary)]">This Month</p>
              <p className="text-h2">{formatCurrency(stats.thisMonth.revenue)}</p>
              <p className="text-caption text-[var(--color-text-secondary)] flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {stats.thisMonth.orders} orders
              </p>
            </div>
          </div>

          {/* Top Products */}
          {stats.topProducts && stats.topProducts.length > 0 && (
            <div className="space-y-3">
              <p className="text-body-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Top Products
              </p>
              <div className="space-y-2">
                {stats.topProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-[var(--color-bg-secondary)] rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium truncate">{product.title}</p>
                      <p className="text-caption text-[var(--color-text-secondary)]">
                        {product.orders} orders
                      </p>
                    </div>
                    <p className="text-body-sm font-medium">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
