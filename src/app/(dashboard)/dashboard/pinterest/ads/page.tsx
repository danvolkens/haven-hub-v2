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
} from 'lucide-react';

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

export default function PinterestAdsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
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

  const adAccounts: AdAccount[] = accountsData?.ad_accounts || [];
  const campaigns: Campaign[] = campaignsData?.campaigns || [];
  const budget: BudgetInfo | null = budgetData || null;

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
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{campaign.name}</h3>
                          {getStatusBadge(campaign.status)}
                          {getObjectiveBadge(campaign.objective)}
                          {campaign.collection && (
                            <Badge variant="secondary">{campaign.collection}</Badge>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
                        </div>

                        {campaign.daily_spend_cap && (
                          <p className="text-sm text-[var(--color-text-secondary)] mt-3">
                            Daily cap: {formatCurrency(campaign.daily_spend_cap)}
                          </p>
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
              ))}
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
                    {/* Progress bar */}
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
    </PageContainer>
  );
}
