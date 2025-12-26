'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  Mail,
  ShoppingCart,
  RefreshCw,
  ArrowRight,
  Percent,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowRevenue {
  name: string;
  flowCount: number;
  flows: string[];
  estimatedRevenue: number;
  sends: number;
  opens: number;
  clicks: number;
}

interface RevenueData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    estimatedEmailRevenue: number;
    emailAttributionRate: number;
    averageOrderValue: number;
  };
  flows: FlowRevenue[];
  liveFlowCount: number;
}

export default function KlaviyoRevenuePage() {
  const [period, setPeriod] = useState(30);

  const {
    data: revenueData,
    isLoading,
    refetch,
    error,
  } = useQuery<RevenueData>({
    queryKey: ['klaviyo-revenue', period],
    queryFn: async () => {
      const res = await fetch(`/api/klaviyo/revenue?days=${period}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch revenue data');
      }
      return res.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <PageContainer
      title="Email Revenue Attribution"
      description="Track revenue attributed to your email marketing efforts"
    >
      {/* Period Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant={period === days ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPeriod(days)}
            >
              {days} days
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {revenueData && (
            <span className="text-sm text-muted-foreground">
              {formatDate(revenueData.period.startDate)} -{' '}
              {formatDate(revenueData.period.endDate)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </p>
          <Button className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="text-muted-foreground">Loading revenue data...</div>
      ) : revenueData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-green-100 text-green-800">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(revenueData.summary.totalRevenue)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-100 text-blue-800">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Email Revenue (Est.)
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(revenueData.summary.estimatedEmailRevenue)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-purple-100 text-purple-800">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-semibold">
                    {revenueData.summary.totalOrders.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-amber-100 text-amber-800">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(revenueData.summary.averageOrderValue)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Attribution Rate */}
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Email Attribution Rate
                </h3>
                <p className="text-sm text-muted-foreground">
                  Estimated percentage of revenue driven by email marketing
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl font-bold text-sage">
                    {revenueData.summary.emailAttributionRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Industry avg: 20-30%
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-sage transition-all duration-500"
                style={{
                  width: `${Math.min(revenueData.summary.emailAttributionRate * 2, 100)}%`,
                }}
              />
            </div>
          </Card>

          {/* Flow Performance */}
          <h2 className="text-lg font-semibold mb-4">Revenue by Flow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {revenueData.flows.map((flow) => (
              <Card key={flow.name} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{flow.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {flow.flowCount} active flow
                      {flow.flowCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {flow.flowCount > 0 ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">Not Set Up</Badge>
                  )}
                </div>

                {flow.flows.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-3">
                    {flow.flows.slice(0, 2).join(', ')}
                    {flow.flows.length > 2 && ` +${flow.flows.length - 2} more`}
                  </div>
                )}

                {flow.flowCount === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Create this flow in Klaviyo to start tracking revenue
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* Active Flows Summary */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-sage" />
                <div>
                  <h3 className="font-medium">Active Flows</h3>
                  <p className="text-sm text-muted-foreground">
                    {revenueData.liveFlowCount} flows currently live in Klaviyo
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm">
                View in Klaviyo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>

          {/* Attribution Note */}
          <Card className="p-4 mt-6 bg-muted/50">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              About Email Attribution
            </h3>
            <p className="text-sm text-muted-foreground">
              Email revenue attribution shown here is an estimate based on
              industry averages. For precise click-based attribution and
              flow-level revenue reporting, access Klaviyo's Analytics
              dashboard directly. Full attribution data requires Klaviyo's
              Advanced or Enterprise plans.
            </p>
          </Card>
        </>
      ) : null}
    </PageContainer>
  );
}
