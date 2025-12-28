'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Select,
} from '@/components/ui';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface OverviewData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  pinterestRevenue: number;
  pinterestOrders: number;
  pinterestOrganic: { revenue: number; orders: number };
  pinterestPaid: { revenue: number; orders: number };
}

interface SourceData {
  source: string;
  revenue: number;
  orders: number;
  percentage: number;
}

interface CampaignData {
  campaign: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

interface PinData {
  id: string;
  title: string;
  collection: string;
  copyVariant: string;
  publishedAt: string;
  pinterestPinId: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

interface CollectionData {
  collection: string;
  orders: number;
  revenue: number;
  pins: number;
  avgRevenuePerPin: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    pinterest: 'bg-red-500',
    email: 'bg-blue-500',
    klaviyo: 'bg-blue-500',
    direct: 'bg-gray-500',
    google: 'bg-yellow-500',
    facebook: 'bg-indigo-500',
    instagram: 'bg-pink-500',
  };
  return colors[source.toLowerCase()] || 'bg-sage';
}

function getSourceIcon(source: string): string {
  const icons: Record<string, string> = {
    pinterest: 'P',
    email: '@',
    klaviyo: 'K',
    direct: 'D',
    google: 'G',
    facebook: 'f',
    instagram: 'IG',
  };
  return icons[source.toLowerCase()] || source.charAt(0).toUpperCase();
}

// ============================================================================
// Components
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-sage/10">
            <Icon className="h-5 w-5 text-sage" />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center mt-3 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            )}
            {Math.abs(trend.value)}% vs previous period
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SourceBreakdown({ data }: { data: SourceData[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-sage" />
          <h3 className="font-semibold">Revenue by Source</h3>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No attribution data yet. Orders will appear here once customers purchase via tracked links.
          </p>
        ) : (
          <div className="space-y-4">
            {data.map((source) => (
              <div key={source.source}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${getSourceColor(source.source)} flex items-center justify-center text-white text-xs font-bold`}>
                      {getSourceIcon(source.source)}
                    </div>
                    <span className="font-medium capitalize">{source.source}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{formatCurrency(source.revenue)}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      ({source.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getSourceColor(source.source)} transition-all duration-500`}
                    style={{ width: `${(source.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(source.orders)} orders
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignTable({ data }: { data: CampaignData[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-sage" />
          <h3 className="font-semibold">Top Campaigns (Collections)</h3>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No campaign data yet. Pin collections will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Campaign</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Orders</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">AOV</th>
                </tr>
              </thead>
              <tbody>
                {data.map((campaign) => (
                  <tr key={campaign.campaign} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <span className="font-medium capitalize">{campaign.campaign.replace(/-/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      {formatCurrency(campaign.revenue)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatNumber(campaign.orders)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatCurrency(campaign.avgOrderValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopPinsTable({ data }: { data: PinData[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-sage" />
          <h3 className="font-semibold">Top Performing Pins</h3>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No pin attribution data yet. Pins will appear here after they drive sales.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Pin</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Collection</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Orders</th>
                  <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground">View</th>
                </tr>
              </thead>
              <tbody>
                {data.map((pin) => (
                  <tr key={pin.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <p className="font-medium line-clamp-1">{pin.title}</p>
                      {pin.copyVariant && (
                        <Badge size="sm" variant="secondary" className="mt-1">
                          v{pin.copyVariant}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-muted-foreground capitalize">{pin.collection || '-'}</span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-green-600">
                      {formatCurrency(pin.revenue)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatNumber(pin.orders)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {pin.pinterestPinId ? (
                        <a
                          href={`https://pinterest.com/pin/${pin.pinterestPinId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sage hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollectionsTable({ data }: { data: CollectionData[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-sage" />
          <h3 className="font-semibold">Collection Performance</h3>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No collection data yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Collection</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Pins</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Rev/Pin</th>
                </tr>
              </thead>
              <tbody>
                {data.map((collection) => (
                  <tr key={collection.collection} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <span className="font-medium capitalize">{collection.collection}</span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-green-600">
                      {formatCurrency(collection.revenue)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatNumber(collection.pins)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatCurrency(collection.avgRevenuePerPin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AttributionPage() {
  const [days, setDays] = useState(30);

  // Fetch attribution overview
  const { data: attributionData, isLoading: loadingAttribution } = useQuery({
    queryKey: ['attribution', days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/attribution?days=${days}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Fetch pin-level data
  const { data: pinData, isLoading: loadingPins } = useQuery({
    queryKey: ['attribution-pins', days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/attribution/pins?days=${days}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const isLoading = loadingAttribution || loadingPins;
  const overview: OverviewData | null = attributionData?.overview || null;
  const bySource: SourceData[] = attributionData?.bySource || [];
  const byCampaign: CampaignData[] = attributionData?.byCampaign || [];
  const topPins: PinData[] = pinData?.topPins || [];
  const topCollections: CollectionData[] = pinData?.topCollections || [];

  return (
    <PageContainer
      title="Attribution Analytics"
      description="Track which pins, collections, and campaigns drive revenue"
    >
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Select
              value={String(days)}
              onChange={(v) => setDays(parseInt(v as string))}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '14', label: 'Last 14 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '60', label: 'Last 60 days' },
                { value: '90', label: 'Last 90 days' },
              ]}
            />
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(overview?.totalRevenue || 0)}
            subtitle={`${formatNumber(overview?.totalOrders || 0)} orders`}
            icon={DollarSign}
          />
          <StatCard
            title="Pinterest Revenue"
            value={formatCurrency(overview?.pinterestRevenue || 0)}
            subtitle={`${formatNumber(overview?.pinterestOrders || 0)} orders`}
            icon={TrendingUp}
          />
          <StatCard
            title="Organic Pinterest"
            value={formatCurrency(overview?.pinterestOrganic?.revenue || 0)}
            subtitle={`${formatNumber(overview?.pinterestOrganic?.orders || 0)} orders`}
            icon={BarChart3}
          />
          <StatCard
            title="Avg Order Value"
            value={formatCurrency(overview?.avgOrderValue || 0)}
            icon={ShoppingCart}
          />
        </div>

        {/* Pinterest Breakdown */}
        {overview && overview.pinterestRevenue > 0 && (
          <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
                  P
                </div>
                <div>
                  <h3 className="font-semibold">Pinterest Performance</h3>
                  <p className="text-sm text-muted-foreground">
                    {((overview.pinterestRevenue / (overview.totalRevenue || 1)) * 100).toFixed(1)}% of total revenue
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Organic Traffic</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(overview.pinterestOrganic?.revenue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(overview.pinterestOrganic?.orders || 0)} orders
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Paid Ads</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(overview.pinterestPaid?.revenue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(overview.pinterestPaid?.orders || 0)} orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Source & Campaign Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">
          <SourceBreakdown data={bySource} />
          <CampaignTable data={byCampaign} />
        </div>

        {/* Pin-level Attribution */}
        <div className="grid lg:grid-cols-2 gap-6">
          <TopPinsTable data={topPins} />
          <CollectionsTable data={topCollections} />
        </div>

        {/* Empty State */}
        {!isLoading && (!overview || overview.totalOrders === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Attribution Data Yet</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Attribution data will appear here once customers purchase through your tracked Pinterest links.
                Make sure your pins have destination links that go to your Shopify store.
              </p>
              <div className="bg-muted rounded-lg p-4 text-left max-w-md">
                <p className="text-sm font-medium mb-2">How it works:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Publish pins with destination links to your store</li>
                  <li>Links automatically include UTM tracking</li>
                  <li>When customers purchase, Shopify sends order data</li>
                  <li>Haven Hub attributes revenue to the source pin</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
