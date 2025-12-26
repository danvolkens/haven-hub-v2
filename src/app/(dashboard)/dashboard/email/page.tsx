'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  Users,
  MousePointer,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ExternalLink,
  Zap,
  ListCheck,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import Link from 'next/link';

interface EmailMetrics {
  totalSent: number;
  openRate: number;
  clickRate: number;
  revenue: number;
  revenueChange: number;
  subscribers: number;
  subscribersChange: number;
  activeFlows: number;
  recentCampaigns: Campaign[];
  topFlows: FlowSummary[];
}

interface Campaign {
  id: string;
  name: string;
  sentAt: string;
  sent: number;
  opened: number;
  clicked: number;
}

interface FlowSummary {
  id: string;
  name: string;
  status: 'live' | 'draft' | 'paused';
  sent: number;
  revenue: number;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  format = 'number',
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  change?: number;
  format?: 'number' | 'percent' | 'currency';
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-sage" />
          </div>
          <p className="text-body-sm text-[var(--color-text-secondary)]">{label}</p>
        </div>
        <p className="text-2xl font-semibold">{formatValue(value)}</p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-body-sm ${change >= 0 ? 'text-success' : 'text-error'}`}>
            {change >= 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{Math.abs(change).toFixed(1)}% vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmailDashboardPage() {
  const { data: metrics, isLoading } = useQuery<EmailMetrics>({
    queryKey: ['email-metrics'],
    queryFn: () => api.get('/klaviyo/metrics'),
  });

  const { data: setupStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['klaviyo-setup-status'],
    queryFn: () => api.get('/klaviyo/setup-status'),
  });

  const isConnected = setupStatus?.connected;

  if (!isConnected) {
    return (
      <PageContainer title="Email" description="Email marketing with Klaviyo">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-sage" />
            </div>
            <h3 className="text-body font-medium mb-2">Connect Klaviyo</h3>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
              Connect your Klaviyo account to view email performance, manage flows, and automate customer journeys.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/dashboard/email/setup">
                <Button>Setup Klaviyo</Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="secondary">Connect API Key</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Email"
      description="Email marketing performance with Klaviyo"
      actions={
        <div className="flex items-center gap-3">
          <Link href="/dashboard/email/flows">
            <Button variant="secondary" leftIcon={<Zap className="h-4 w-4" />}>
              View Flows
            </Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => window.open('https://www.klaviyo.com/dashboard', '_blank')}
            rightIcon={<ExternalLink className="h-4 w-4" />}
          >
            Open Klaviyo
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Mail}
            label="Emails Sent (30d)"
            value={metrics?.totalSent || 0}
          />
          <MetricCard
            icon={MousePointer}
            label="Open Rate"
            value={metrics?.openRate || 0}
            format="percent"
          />
          <MetricCard
            icon={Users}
            label="Subscribers"
            value={metrics?.subscribers || 0}
            change={metrics?.subscribersChange}
          />
          <MetricCard
            icon={DollarSign}
            label="Email Revenue (30d)"
            value={metrics?.revenue || 0}
            change={metrics?.revenueChange}
            format="currency"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Flows */}
          <Card>
            <CardHeader
              title="Top Flows"
              description="Revenue-generating automation flows"
              action={
                <Link href="/dashboard/email/flows">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              }
            />
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-[var(--color-text-secondary)]">
                  Loading flows...
                </div>
              ) : metrics?.topFlows && metrics.topFlows.length > 0 ? (
                <div className="divide-y">
                  {metrics.topFlows.map((flow) => (
                    <div key={flow.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-sage" />
                        </div>
                        <div>
                          <p className="text-body-sm font-medium">{flow.name}</p>
                          <p className="text-caption text-[var(--color-text-tertiary)]">
                            {flow.sent.toLocaleString()} sent
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={flow.status === 'live' ? 'success' : 'secondary'}>
                          {flow.status}
                        </Badge>
                        <p className="text-body-sm font-medium text-success mt-1">
                          ${flow.revenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-[var(--color-text-secondary)]">No flows configured yet</p>
                  <Link href="/dashboard/email/setup">
                    <Button variant="secondary" size="sm" className="mt-3">
                      Setup Flows
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader
              title="Recent Campaigns"
              description="Latest email campaign performance"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('https://www.klaviyo.com/campaigns', '_blank')}
                >
                  View in Klaviyo
                </Button>
              }
            />
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-center text-[var(--color-text-secondary)]">
                  Loading campaigns...
                </div>
              ) : metrics?.recentCampaigns && metrics.recentCampaigns.length > 0 ? (
                <div className="divide-y">
                  {metrics.recentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-body-sm font-medium">{campaign.name}</p>
                        <p className="text-caption text-[var(--color-text-tertiary)]">
                          {new Date(campaign.sentAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-caption text-[var(--color-text-secondary)]">
                        <span>{campaign.sent.toLocaleString()} sent</span>
                        <span>{((campaign.opened / campaign.sent) * 100).toFixed(1)}% opened</span>
                        <span>{((campaign.clicked / campaign.sent) * 100).toFixed(1)}% clicked</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-[var(--color-text-secondary)]">No campaigns sent yet</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => window.open('https://www.klaviyo.com/campaigns/create', '_blank')}
                  >
                    Create Campaign
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader title="Quick Actions" />
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/dashboard/email/setup">
                <Button variant="secondary" className="w-full justify-start" leftIcon={<ListCheck className="h-4 w-4" />}>
                  Setup Wizard
                </Button>
              </Link>
              <Link href="/dashboard/email/flows">
                <Button variant="secondary" className="w-full justify-start" leftIcon={<Zap className="h-4 w-4" />}>
                  Manage Flows
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="w-full justify-start"
                leftIcon={<TrendingUp className="h-4 w-4" />}
                onClick={() => window.open('https://www.klaviyo.com/analytics/metrics', '_blank')}
              >
                View Analytics
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                leftIcon={<Users className="h-4 w-4" />}
                onClick={() => window.open('https://www.klaviyo.com/lists', '_blank')}
              >
                Manage Lists
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
