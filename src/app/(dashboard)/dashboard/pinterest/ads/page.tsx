'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Badge,
  Modal,
  Input,
  Label,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import {
  Megaphone,
  ExternalLink,
  RefreshCw,
  Plus,
  Play,
  Pause,
  DollarSign,
  TrendingUp,
  Eye,
  MousePointer,
  Loader2,
  AlertCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  status: string;
  pinterest_ad_account_id: string;
  total_spend: number;
  current_week_spend: number;
  current_month_spend: number;
}

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  daily_spend_cap: number | null;
  lifetime_spend_cap: number | null;
  total_spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  collection: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface BudgetInfo {
  allowed: boolean;
  weekly_remaining: number | null;
  monthly_remaining: number | null;
  weekly_cap: number;
  monthly_cap: number | null;
  weekly_spent: number;
  monthly_spent: number;
}

interface BudgetRecommendation {
  id: string;
  campaign_id: string;
  campaign_name: string;
  current_daily_budget: number;
  current_cpa: number | null;
  current_roas: number | null;
  current_spend_7d: number;
  recommendation_type: 'increase' | 'decrease' | 'pause' | 'maintain' | 'test_increase';
  recommended_daily_budget: number;
  recommended_change_percentage: number;
  confidence_score: number;
  reasoning: {
    primary: string;
    supporting: string[];
    risks: string[];
  };
  projected_additional_spend: number;
  projected_additional_conversions: number | null;
  status: string;
  valid_until: string;
  created_at: string;
}

interface RecommendationSummary {
  pending_count: number;
  potential_savings: number;
  growth_opportunity: number;
}

// Performance thresholds
const THRESHOLDS = {
  SCALE: { maxCpa: 8, minRoas: 3 },
  MAINTAIN: { maxCpa: 12, minRoas: 2 },
  OPTIMIZE: { maxCpa: 15, minRoas: 1.5 },
};

type PerformanceStatus = 'scale' | 'maintain' | 'optimize' | 'pause';

const performanceConfig: Record<PerformanceStatus, {
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  recommendation: string;
}> = {
  scale: {
    label: 'Winner',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    textClass: 'text-green-700',
    recommendation: 'This campaign is performing excellently! Consider +25% budget.',
  },
  maintain: {
    label: 'On Track',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-700',
    recommendation: 'Solid performance. Monitor for consistency.',
  },
  optimize: {
    label: 'Optimize',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-700',
    recommendation: 'Review targeting and creatives to improve efficiency.',
  },
  pause: {
    label: 'Review',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-700',
    recommendation: 'Performance below threshold. Consider pausing.',
  },
};

function getCampaignPerformance(campaign: Campaign): { status: PerformanceStatus; cpa: number; roas: number } {
  const cpa = campaign.conversions > 0
    ? campaign.total_spend / campaign.conversions
    : campaign.total_spend > 0 ? campaign.total_spend : 0;

  // Estimate ROAS assuming $35 average order value
  const estimatedRevenue = campaign.conversions * 35;
  const roas = campaign.total_spend > 0 ? estimatedRevenue / campaign.total_spend : 0;

  let status: PerformanceStatus;
  if (cpa > 0 && cpa <= THRESHOLDS.SCALE.maxCpa && roas >= THRESHOLDS.SCALE.minRoas) {
    status = 'scale';
  } else if (cpa <= THRESHOLDS.MAINTAIN.maxCpa && roas >= THRESHOLDS.MAINTAIN.minRoas) {
    status = 'maintain';
  } else if (cpa <= THRESHOLDS.OPTIMIZE.maxCpa && roas >= THRESHOLDS.OPTIMIZE.minRoas) {
    status = 'optimize';
  } else {
    status = 'pause';
  }

  return { status, cpa, roas };
}

export default function PinterestAdsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [exportConfig, setExportConfig] = useState({
    campaign: '',
    source: 'haven_hub',
    medium: 'pinterest_ads',
  });
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    objective: 'AWARENESS',
    dailySpendCap: '',
    collection: '',
  });

  // Fetch ad accounts
  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['pinterest-ad-accounts'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/ads/accounts');
      if (!res.ok) throw new Error('Failed to fetch ad accounts');
      return res.json();
    },
  });

  // Fetch campaigns
  const { data: campaignsData, isLoading: loadingCampaigns, refetch: refetchCampaigns } = useQuery({
    queryKey: ['ad-campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/ads/campaigns');
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  // Fetch budget info
  const { data: budgetData } = useQuery({
    queryKey: ['ad-budget'],
    queryFn: async () => {
      const res = await fetch('/api/ads/budget');
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    },
  });

  // Fetch budget recommendations
  const { data: recommendationsData, isLoading: loadingRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ['budget-recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/budget-recommendations?history=true');
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      return res.json();
    },
  });

  // Apply recommendation mutation
  const applyRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const res = await fetch(`/api/budget-recommendations/${recommendationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to apply recommendation');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
  });

  // Reject recommendation mutation
  const rejectRecommendationMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/budget-recommendations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reject recommendation');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-recommendations'] });
    },
  });

  // Generate recommendations mutation
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/budget-recommendations', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to generate recommendations');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-recommendations'] });
    },
  });

  const adAccounts: AdAccount[] = accountsData?.ad_accounts || [];
  const campaigns: Campaign[] = campaignsData?.campaigns || [];
  const budget: BudgetInfo | null = budgetData || null;
  const recommendations: BudgetRecommendation[] = recommendationsData?.recommendations || [];
  const recommendationHistory: BudgetRecommendation[] = recommendationsData?.history || [];
  const recommendationSummary: RecommendationSummary = recommendationsData?.summary || {
    pending_count: 0,
    potential_savings: 0,
    growth_opportunity: 0,
  };

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: {
      adAccountId: string;
      name: string;
      objective: string;
      dailySpendCap?: number;
      collection?: string;
    }) => {
      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      setShowCreateModal(false);
      setNewCampaign({ name: '', objective: 'AWARENESS', dailySpendCap: '', collection: '' });
    },
  });

  // Update campaign status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: 'ACTIVE' | 'PAUSED' }) => {
      const res = await fetch(`/api/ads/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
  });

  // Export to Ads CSV mutation
  const exportAdsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/pinterest/ad-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'approvals',
          utm: {
            source: exportConfig.source,
            medium: exportConfig.medium,
            campaign: exportConfig.campaign || undefined,
          },
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate export');
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Download the CSV
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || 'pinterest-ads-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    },
  });

  const handleCreateCampaign = () => {
    if (!selectedAccount || !newCampaign.name) return;

    createCampaignMutation.mutate({
      adAccountId: selectedAccount,
      name: newCampaign.name,
      objective: newCampaign.objective,
      dailySpendCap: newCampaign.dailySpendCap ? parseFloat(newCampaign.dailySpendCap) : undefined,
      collection: newCampaign.collection || undefined,
    });
  };

  const getObjectiveBadge = (objective: string) => {
    const colors: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
      AWARENESS: 'primary',
      CONSIDERATION: 'default',
      CONVERSIONS: 'success',
      CATALOG_SALES: 'warning',
    };
    return <Badge variant={colors[objective] || 'default'}>{objective}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') return <Badge variant="success">Active</Badge>;
    if (status === 'PAUSED') return <Badge variant="warning">Paused</Badge>;
    return <Badge variant="secondary">Archived</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <ArrowDown className="h-4 w-4 text-amber-600" />;
      case 'pause':
        return <Pause className="h-4 w-4 text-red-600" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-600" />;
    }
  };

  const getRecommendationBadge = (type: string) => {
    switch (type) {
      case 'increase':
        return <Badge variant="success">Scale Up</Badge>;
      case 'decrease':
        return <Badge variant="warning">Reduce</Badge>;
      case 'pause':
        return <Badge variant="error">Pause</Badge>;
      case 'test_increase':
        return <Badge variant="primary">Test Increase</Badge>;
      default:
        return <Badge variant="secondary">Maintain</Badge>;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-[var(--color-text-tertiary)]';
  };

  if (loadingAccounts) {
    return (
      <PageContainer title="Pinterest Ads" description="Create and manage Pinterest advertising campaigns">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (adAccounts.length === 0) {
    return (
      <PageContainer title="Pinterest Ads" description="Create and manage Pinterest advertising campaigns">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-amber-100 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-h3 mb-2">No Ad Accounts Found</h3>
            <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
              Your Pinterest account is connected, but no ad accounts were found.
              You need a Pinterest Business account with ads access.
            </p>
            <a href="https://ads.pinterest.com" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                Open Pinterest Ads Manager <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Pinterest Ads"
      description="Create and manage Pinterest advertising campaigns"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetchCampaigns()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setShowExportModal(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="accounts">Ad Accounts ({adAccounts.length})</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          {loadingCampaigns ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
              </CardContent>
            </Card>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Megaphone className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
                <h3 className="text-h3 mb-2">No Campaigns Yet</h3>
                <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
                  Create your first advertising campaign to promote your pins to a wider audience.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const perf = campaign.total_spend > 0 ? getCampaignPerformance(campaign) : null;
                const config = perf ? performanceConfig[perf.status] : null;

                return (
                  <Card
                    key={campaign.id}
                    className={cn(
                      'transition-all',
                      config && perf?.status === 'scale' && 'border-2 border-green-300 shadow-md'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Winner Trophy Badge */}
                            {perf?.status === 'scale' && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                                <Trophy className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                            <h3 className="text-lg font-semibold">{campaign.name}</h3>
                            {getStatusBadge(campaign.status)}
                            {getObjectiveBadge(campaign.objective)}
                            {campaign.collection && (
                              <Badge variant="secondary">{campaign.collection}</Badge>
                            )}
                            {/* Performance Status Badge */}
                            {config && (
                              <Badge
                                variant={
                                  perf?.status === 'scale' ? 'success' :
                                  perf?.status === 'maintain' ? 'info' :
                                  perf?.status === 'optimize' ? 'warning' : 'error'
                                }
                              >
                                {config.label}
                              </Badge>
                            )}
                          </div>

                          {/* Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                              <div>
                                <p className="text-xs text-[var(--color-text-tertiary)]">Spent</p>
                                <p className="font-medium">{formatCurrency(campaign.total_spend)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                              <div>
                                <p className="text-xs text-[var(--color-text-tertiary)]">Impressions</p>
                                <p className="font-medium">{campaign.impressions.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <MousePointer className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                              <div>
                                <p className="text-xs text-[var(--color-text-tertiary)]">Clicks</p>
                                <p className="font-medium">{campaign.clicks.toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                              <div>
                                <p className="text-xs text-[var(--color-text-tertiary)]">Conversions</p>
                                <p className="font-medium">{campaign.conversions.toLocaleString()}</p>
                              </div>
                            </div>
                            {/* CPA & ROAS */}
                            {perf && perf.cpa > 0 && (
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="text-xs text-[var(--color-text-tertiary)]">CPA / ROAS</p>
                                  <p className={cn('font-medium', config?.textClass)}>
                                    {formatCurrency(perf.cpa)} / {perf.roas.toFixed(1)}x
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {campaign.daily_spend_cap && (
                            <p className="text-sm text-[var(--color-text-secondary)] mt-3">
                              Daily cap: {formatCurrency(campaign.daily_spend_cap)}
                            </p>
                          )}

                          {/* Performance Recommendation */}
                          {config && perf && perf.cpa > 0 && (
                            <div className={cn('mt-3 p-2 rounded-md text-sm', config.bgClass, config.textClass)}>
                              {config.recommendation}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {campaign.status === 'ACTIVE' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ campaignId: campaign.id, status: 'PAUSED' })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                          ) : campaign.status === 'PAUSED' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ campaignId: campaign.id, status: 'ACTIVE' })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Activate
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Ad Accounts Tab */}
        <TabsContent value="accounts">
          <div className="grid gap-6 md:grid-cols-2">
            {adAccounts.map((account) => (
              <Card key={account.id}>
                <CardHeader title={account.name} description={`ID: ${account.pinterest_ad_account_id}`} />
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">Currency</span>
                      <span className="font-medium">{account.currency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">Status</span>
                      <Badge variant={account.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {account.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">Total Spend</span>
                      <span className="font-medium">{formatCurrency(account.total_spend)}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <a
                        href={`https://ads.pinterest.com/advertiser/${account.pinterest_ad_account_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="secondary" size="sm" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Pinterest
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-100 p-2">
                      <Lightbulb className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Pending Recommendations</p>
                      <p className="text-2xl font-semibold">{recommendationSummary.pending_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-100 p-2">
                      <DollarSign className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Potential Savings</p>
                      <p className="text-2xl font-semibold">{formatCurrency(recommendationSummary.potential_savings)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-100 p-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Growth Opportunity</p>
                      <p className="text-2xl font-semibold">+{recommendationSummary.growth_opportunity} conversions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Caps */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader title="Weekly Budget" description="Reset every Sunday" />
                <CardContent>
                  {budget ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Cap</span>
                        <span className="font-medium">{formatCurrency(budget.weekly_cap)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Spent</span>
                        <span className="font-medium">{formatCurrency(budget.weekly_spent)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Remaining</span>
                        <span className={`font-medium ${(budget.weekly_remaining || 0) < 20 ? 'text-warning' : 'text-success'}`}>
                          {formatCurrency(budget.weekly_remaining || 0)}
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sage transition-all"
                          style={{ width: `${Math.min((budget.weekly_spent / budget.weekly_cap) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)]">Loading budget info...</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Monthly Budget" description="Reset on the 1st" />
                <CardContent>
                  {budget && budget.monthly_cap ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Cap</span>
                        <span className="font-medium">{formatCurrency(budget.monthly_cap)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Spent</span>
                        <span className="font-medium">{formatCurrency(budget.monthly_spent)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-secondary)]">Remaining</span>
                        <span className={`font-medium ${(budget.monthly_remaining || 0) < 50 ? 'text-warning' : 'text-success'}`}>
                          {formatCurrency(budget.monthly_remaining || 0)}
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sage transition-all"
                          style={{ width: `${Math.min((budget.monthly_spent / budget.monthly_cap) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      No monthly cap configured. Set one in Settings &gt; Guardrails.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Budget Recommendations */}
            <Card>
              <CardHeader
                title="Budget Recommendations"
                description="AI-powered suggestions to optimize your ad spend"
              />
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Based on the last 7 days of performance data
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => generateRecommendationsMutation.mutate()}
                    disabled={generateRecommendationsMutation.isPending}
                  >
                    {generateRecommendationsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate Recommendations
                  </Button>
                </div>

                {loadingRecommendations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-tertiary)]" />
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
                    <p className="text-[var(--color-text-secondary)]">
                      No pending recommendations. Your campaigns are performing well!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="border rounded-lg p-4 bg-[var(--color-bg-secondary)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getRecommendationIcon(rec.recommendation_type)}
                              <h4 className="font-medium">{rec.campaign_name}</h4>
                              {getRecommendationBadge(rec.recommendation_type)}
                              <span className={`text-sm font-medium ${getConfidenceColor(rec.confidence_score)}`}>
                                {rec.confidence_score}% confidence
                              </span>
                            </div>

                            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                              {rec.reasoning.primary}
                            </p>

                            {rec.reasoning.supporting.length > 0 && (
                              <ul className="text-xs text-[var(--color-text-tertiary)] mb-3 space-y-1">
                                {rec.reasoning.supporting.map((point, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {rec.reasoning.risks.length > 0 && (
                              <ul className="text-xs text-[var(--color-text-tertiary)] mb-3 space-y-1">
                                {rec.reasoning.risks.map((risk, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <AlertCircle className="h-3 w-3 mt-0.5 text-amber-500 flex-shrink-0" />
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-[var(--color-text-secondary)]">
                                Current: {formatCurrency(rec.current_daily_budget)}/day
                              </span>
                              {rec.recommendation_type !== 'pause' && (
                                <>
                                  <span className="text-[var(--color-text-tertiary)]">&rarr;</span>
                                  <span className="font-medium">
                                    Recommended: {formatCurrency(rec.recommended_daily_budget)}/day
                                    <span className={`ml-1 ${rec.recommended_change_percentage > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                      ({rec.recommended_change_percentage > 0 ? '+' : ''}{rec.recommended_change_percentage}%)
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>

                            {rec.projected_additional_conversions !== null && rec.projected_additional_conversions > 0 && (
                              <p className="text-xs text-green-600 mt-2">
                                Projected: +{rec.projected_additional_conversions} additional conversions
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => applyRecommendationMutation.mutate(rec.id)}
                              disabled={applyRecommendationMutation.isPending}
                            >
                              {applyRecommendationMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-4 w-4 mr-1" />
                              )}
                              Apply
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => rejectRecommendationMutation.mutate({ id: rec.id })}
                              disabled={rejectRecommendationMutation.isPending}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-[var(--color-text-tertiary)]">
                          <Clock className="h-3 w-3" />
                          Expires {new Date(rec.valid_until).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendation History */}
            {recommendationHistory.length > 0 && (
              <Card>
                <CardHeader title="Recommendation History" description="Previously processed recommendations" />
                <CardContent>
                  <div className="space-y-3">
                    {recommendationHistory.slice(0, 10).map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          {rec.status === 'applied' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : rec.status === 'rejected' ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{rec.campaign_name}</p>
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                              {rec.recommendation_type === 'increase' ? 'Budget increase' :
                               rec.recommendation_type === 'decrease' ? 'Budget decrease' :
                               rec.recommendation_type === 'pause' ? 'Pause campaign' : rec.recommendation_type}
                              {' '}• {new Date(rec.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={rec.status === 'applied' ? 'success' : rec.status === 'rejected' ? 'error' : 'secondary'}>
                          {rec.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Campaign"
        size="lg"
        showCloseButton
      >
        <div className="space-y-6">
          {/* Ad Account Selection */}
          <div>
            <Label>Ad Account *</Label>
            <Select
              value={selectedAccount}
              onChange={(value) => setSelectedAccount(typeof value === 'string' ? value : '')}
              options={adAccounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} (${acc.currency})`,
              }))}
              placeholder="Select ad account..."
            />
          </div>

          {/* Campaign Name */}
          <div>
            <Label>Campaign Name *</Label>
            <Input
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              placeholder="e.g., Summer Collection Awareness"
              className="mt-1"
            />
          </div>

          {/* Objective */}
          <div>
            <Label>Objective *</Label>
            <Select
              value={newCampaign.objective}
              onChange={(value) => setNewCampaign({ ...newCampaign, objective: typeof value === 'string' ? value : 'AWARENESS' })}
              options={[
                { value: 'AWARENESS', label: 'Brand Awareness', description: 'Reach more people' },
                { value: 'CONSIDERATION', label: 'Consideration', description: 'Get more engagement' },
                { value: 'CONVERSIONS', label: 'Conversions', description: 'Drive sales' },
                { value: 'CATALOG_SALES', label: 'Catalog Sales', description: 'Promote products' },
              ]}
            />
          </div>

          {/* Daily Spend Cap */}
          <div>
            <Label>Daily Spend Cap ($)</Label>
            <Input
              type="number"
              value={newCampaign.dailySpendCap}
              onChange={(e) => setNewCampaign({ ...newCampaign, dailySpendCap: e.target.value })}
              placeholder="e.g., 10.00"
              className="mt-1"
              min="1"
              step="0.01"
            />
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Leave empty for no daily limit (subject to weekly/monthly caps)
            </p>
          </div>

          {/* Collection */}
          <div>
            <Label>Collection (Optional)</Label>
            <Select
              value={newCampaign.collection}
              onChange={(value) => setNewCampaign({ ...newCampaign, collection: typeof value === 'string' ? value : '' })}
              options={[
                { value: '', label: 'No Collection' },
                { value: 'grounding', label: 'Grounding' },
                { value: 'wholeness', label: 'Wholeness' },
                { value: 'growth', label: 'Growth' },
              ]}
            />
          </div>

          {/* Error */}
          {createCampaignMutation.error && (
            <p className="text-sm text-red-500">{createCampaignMutation.error.message}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={!selectedAccount || !newCampaign.name || createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export CSV Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export to Pinterest Ads CSV"
        size="md"
        showCloseButton
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Export approved pins as a CSV file for bulk upload to Pinterest Ads Manager.
            UTM parameters will be added to all destination URLs.
          </p>

          <div>
            <Label>UTM Source</Label>
            <Input
              value={exportConfig.source}
              onChange={(e) => setExportConfig({ ...exportConfig, source: e.target.value })}
              placeholder="e.g., haven_hub"
              className="mt-1"
            />
          </div>

          <div>
            <Label>UTM Medium</Label>
            <Input
              value={exportConfig.medium}
              onChange={(e) => setExportConfig({ ...exportConfig, medium: e.target.value })}
              placeholder="e.g., pinterest_ads"
              className="mt-1"
            />
          </div>

          <div>
            <Label>UTM Campaign (Optional)</Label>
            <Input
              value={exportConfig.campaign}
              onChange={(e) => setExportConfig({ ...exportConfig, campaign: e.target.value })}
              placeholder="e.g., summer_2024"
              className="mt-1"
            />
          </div>

          <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg text-sm">
            <p className="font-medium mb-1">Preview URL:</p>
            <code className="text-xs text-[var(--color-text-secondary)] break-all">
              https://yoursite.com/product?utm_source={exportConfig.source}&utm_medium={exportConfig.medium}
              {exportConfig.campaign && `&utm_campaign=${exportConfig.campaign}`}
            </code>
          </div>

          {exportAdsMutation.error && (
            <p className="text-sm text-red-500">{exportAdsMutation.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => exportAdsMutation.mutate()}
              disabled={exportAdsMutation.isPending || !exportConfig.source || !exportConfig.medium}
            >
              {exportAdsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
