'use client';

import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, Badge } from '@/components/ui';
import {
  Users,
  MousePointer,
  ClipboardList,
  Mail,
  ShoppingCart,
  CreditCard,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
  ArrowRight,
  Video,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ConversionFunnel {
  total_sessions: number;
  profile_visits: number;
  link_clicks: number;
  quiz_starts: number;
  quiz_completions: number;
  email_captures: number;
  cart_adds: number;
  checkouts: number;
  purchases: number;
  total_revenue: number;
  conversion_rate: number;
}

interface TopConvertingPost {
  post_id: string;
  title: string;
  content_pillar: string;
  sessions: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
}

interface PillarConversion {
  pillar: string;
  sessions: number;
  views: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
}

interface AttributionData {
  funnel: ConversionFunnel;
  topPosts: TopConvertingPost[];
  pillars: PillarConversion[];
}

// ============================================================================
// Main Component
// ============================================================================

export default function TikTokAttributionPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tiktok-attribution'],
    queryFn: async () => {
      const res = await fetch('/api/tiktok/attribution?action=full-dashboard');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<AttributionData>;
    },
  });

  if (isLoading) {
    return (
      <PageContainer title="TikTok Attribution">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer title="TikTok Attribution">
        <Card className="p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load attribution data</p>
        </Card>
      </PageContainer>
    );
  }

  const { funnel, topPosts, pillars } = data;

  return (
    <PageContainer title="TikTok Attribution">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">TikTok → Shopify Attribution</h1>
          <p className="text-muted-foreground">
            Track conversions from TikTok content to Shopify purchases
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label="Total Sessions"
            value={funnel.total_sessions.toLocaleString()}
          />
          <MetricCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Purchases"
            value={funnel.purchases.toString()}
          />
          <MetricCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Revenue"
            value={`$${funnel.total_revenue.toLocaleString()}`}
            highlight
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Conversion Rate"
            value={`${funnel.conversion_rate}%`}
          />
        </div>

        {/* Conversion Funnel */}
        <Card className="p-6">
          <h2 className="font-semibold mb-6">Conversion Funnel</h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <FunnelStep
              icon={<Video className="h-4 w-4" />}
              label="Profile Visits"
              value={funnel.profile_visits}
              total={funnel.total_sessions}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
            <FunnelStep
              icon={<MousePointer className="h-4 w-4" />}
              label="Link Clicks"
              value={funnel.link_clicks}
              total={funnel.total_sessions}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
            <FunnelStep
              icon={<ClipboardList className="h-4 w-4" />}
              label="Quiz Starts"
              value={funnel.quiz_starts}
              total={funnel.total_sessions}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
            <FunnelStep
              icon={<Mail className="h-4 w-4" />}
              label="Emails Captured"
              value={funnel.email_captures}
              total={funnel.total_sessions}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
            <FunnelStep
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Cart Adds"
              value={funnel.cart_adds}
              total={funnel.total_sessions}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
            <FunnelStep
              icon={<CreditCard className="h-4 w-4" />}
              label="Purchases"
              value={funnel.purchases}
              total={funnel.total_sessions}
              highlight
            />
          </div>
        </Card>

        {/* Top Converting Posts */}
        {topPosts.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Top Converting Videos</h2>
            <div className="space-y-3">
              {topPosts.map((post, index) => (
                <div
                  key={post.post_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{post.title || 'Untitled'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="sm">
                          {post.content_pillar.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {post.sessions} sessions
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      ${post.revenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {post.purchases} sales • {post.conversion_rate}% conv
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Conversion by Pillar */}
        {pillars.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Conversion by Content Pillar</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar.pillar} className="p-4 border rounded-lg">
                  <div className="font-semibold capitalize mb-3">
                    {pillar.pillar.replace('_', ' ')}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Views</span>
                      <span>{pillar.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessions</span>
                      <span>{pillar.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchases</span>
                      <span>{pillar.purchases}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ${pillar.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conv Rate</span>
                      <span>{pillar.conversion_rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* UTM Setup Info */}
        <Card className="p-4 bg-muted/30">
          <h3 className="font-semibold mb-2">UTM Tracking Setup</h3>
          <p className="text-sm text-muted-foreground mb-3">
            All TikTok links should include these UTM parameters for proper tracking:
          </p>
          <div className="bg-background rounded-lg p-3 font-mono text-xs">
            <div><span className="text-muted-foreground">utm_source=</span>tiktok</div>
            <div><span className="text-muted-foreground">utm_medium=</span>organic</div>
            <div><span className="text-muted-foreground">utm_campaign=</span>{'{content_pillar}'}</div>
            <div><span className="text-muted-foreground">utm_content=</span>{'{post_id}'}</div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-4 ${highlight ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-green-500/20 text-green-600' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        <div>
          <div className={`text-2xl font-bold ${highlight ? 'text-green-600 dark:text-green-400' : ''}`}>
            {value}
          </div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Funnel Step Component
// ============================================================================

function FunnelStep({
  icon,
  label,
  value,
  total,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  highlight?: boolean;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={`flex flex-col items-center p-4 rounded-lg min-w-[120px] ${
      highlight ? 'bg-green-100 dark:bg-green-900 border-green-500' : 'bg-muted/50'
    } border`}>
      <div className={`p-2 rounded-full mb-2 ${
        highlight ? 'bg-green-500 text-white' : 'bg-background'
      }`}>
        {icon}
      </div>
      <div className={`text-xl font-bold ${highlight ? 'text-green-600 dark:text-green-400' : ''}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground text-center">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">{percentage}%</div>
    </div>
  );
}
