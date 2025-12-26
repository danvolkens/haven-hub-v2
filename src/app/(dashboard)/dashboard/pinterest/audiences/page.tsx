'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target,
  Plus,
  Users,
  RefreshCw,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { useToast } from '@/components/providers/toast-provider';
import { formatDistanceToNow } from 'date-fns';

interface Audience {
  id: string;
  name: string;
  description: string;
  segment_criteria: Record<string, any>;
  pinterest_audience_id: string | null;
  pinterest_audience_name: string | null;
  total_profiles: number;
  matched_profiles: number | null;
  status: 'draft' | 'exporting' | 'exported' | 'synced' | 'error';
  error: string | null;
  auto_sync: boolean;
  sync_frequency: 'daily' | 'weekly' | 'monthly' | null;
  last_synced_at: string | null;
  next_sync_at: string | null;
  created_at: string;
}

interface AudiencesResponse {
  audiences: Audience[];
  pinterestConnected: boolean;
}

const STATUS_CONFIG = {
  draft: { icon: Clock, color: 'secondary', label: 'Draft' },
  exporting: { icon: RefreshCw, color: 'warning', label: 'Exporting' },
  exported: { icon: CheckCircle, color: 'success', label: 'Exported' },
  synced: { icon: CheckCircle, color: 'success', label: 'Synced' },
  error: { icon: AlertCircle, color: 'error', label: 'Error' },
} as const;

export default function PinterestAudiencesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAudience, setNewAudience] = useState({ name: '', description: '' });

  const { data, isLoading, refetch } = useQuery<AudiencesResponse>({
    queryKey: ['pinterest-audiences'],
    queryFn: () => api.get('/pinterest/audiences'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.post('/pinterest/audiences', data),
    onSuccess: () => {
      toast('Audience created', 'success');
      queryClient.invalidateQueries({ queryKey: ['pinterest-audiences'] });
      setShowCreateModal(false);
      setNewAudience({ name: '', description: '' });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to create audience', 'error');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (audienceId: string) =>
      api.post(`/pinterest/audiences/${audienceId}/sync`),
    onSuccess: () => {
      toast('Sync started', 'success');
      queryClient.invalidateQueries({ queryKey: ['pinterest-audiences'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to sync audience', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (audienceId: string) =>
      api.delete(`/pinterest/audiences/${audienceId}`),
    onSuccess: () => {
      toast('Audience deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['pinterest-audiences'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to delete audience', 'error');
    },
  });

  if (!data?.pinterestConnected) {
    return (
      <PageContainer title="Pinterest Audiences" description="Custom audiences for retargeting">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-sage" />
            </div>
            <h3 className="text-body font-medium mb-2">Connect Pinterest First</h3>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
              Connect your Pinterest account with an Ad Account to create and manage custom audiences.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/settings'}>
              Connect Pinterest
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Pinterest Audiences"
      description="Export customer segments for Pinterest retargeting"
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Audience
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Total Audiences</p>
              <p className="text-2xl font-semibold mt-1">
                {data?.audiences.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Synced to Pinterest</p>
              <p className="text-2xl font-semibold mt-1">
                {data?.audiences.filter(a => a.status === 'synced').length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Total Profiles</p>
              <p className="text-2xl font-semibold mt-1">
                {(data?.audiences.reduce((sum, a) => sum + a.total_profiles, 0) || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Match Rate</p>
              <p className="text-2xl font-semibold mt-1">
                {data?.audiences.length && data.audiences.some(a => a.matched_profiles)
                  ? `${Math.round(
                      (data.audiences.reduce((sum, a) => sum + (a.matched_profiles || 0), 0) /
                        data.audiences.reduce((sum, a) => sum + a.total_profiles, 0)) * 100
                    )}%`
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Audiences List */}
        <Card>
          <CardHeader
            title="Custom Audiences"
            description="Manage your Pinterest custom audiences"
          />
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-sage mx-auto mb-3" />
                <p className="text-[var(--color-text-secondary)]">Loading audiences...</p>
              </div>
            ) : data?.audiences && data.audiences.length > 0 ? (
              <div className="divide-y">
                {data.audiences.map((audience) => {
                  const statusConfig = STATUS_CONFIG[audience.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={audience.id} className="p-4 hover:bg-elevated/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-sage" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-body font-medium">{audience.name}</h4>
                              <Badge variant={statusConfig.color as any}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${audience.status === 'exporting' ? 'animate-spin' : ''}`} />
                                {statusConfig.label}
                              </Badge>
                              {audience.auto_sync && (
                                <Badge variant="outline" className="text-xs">
                                  Auto-sync {audience.sync_frequency}
                                </Badge>
                              )}
                            </div>
                            {audience.description && (
                              <p className="text-caption text-[var(--color-text-tertiary)]">
                                {audience.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {audience.status === 'draft' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => syncMutation.mutate(audience.id)}
                              disabled={syncMutation.isPending}
                              leftIcon={<Upload className="h-3 w-3" />}
                            >
                              Export
                            </Button>
                          )}
                          {(audience.status === 'exported' || audience.status === 'synced') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => syncMutation.mutate(audience.id)}
                              disabled={syncMutation.isPending}
                              leftIcon={<RefreshCw className="h-3 w-3" />}
                            >
                              Re-sync
                            </Button>
                          )}
                          {audience.pinterest_audience_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(
                                `https://ads.pinterest.com/audiences/${audience.pinterest_audience_id}`,
                                '_blank'
                              )}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this audience?')) {
                                deleteMutation.mutate(audience.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 pl-13">
                        <div>
                          <p className="text-body-sm font-medium">{audience.total_profiles.toLocaleString()}</p>
                          <p className="text-caption text-[var(--color-text-tertiary)]">Profiles</p>
                        </div>
                        <div>
                          <p className="text-body-sm font-medium">
                            {audience.matched_profiles?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-caption text-[var(--color-text-tertiary)]">Matched</p>
                        </div>
                        <div>
                          <p className="text-body-sm font-medium">
                            {audience.matched_profiles && audience.total_profiles
                              ? `${Math.round((audience.matched_profiles / audience.total_profiles) * 100)}%`
                              : 'N/A'}
                          </p>
                          <p className="text-caption text-[var(--color-text-tertiary)]">Match Rate</p>
                        </div>
                        <div>
                          <p className="text-body-sm font-medium">
                            {audience.last_synced_at
                              ? formatDistanceToNow(new Date(audience.last_synced_at), { addSuffix: true })
                              : 'Never'}
                          </p>
                          <p className="text-caption text-[var(--color-text-tertiary)]">Last Synced</p>
                        </div>
                      </div>

                      {audience.error && (
                        <div className="mt-3 p-2 bg-error/10 rounded text-body-sm text-error">
                          {audience.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-[var(--color-text-tertiary)]" />
                </div>
                <h3 className="text-body font-medium mb-2">No audiences yet</h3>
                <p className="text-body-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
                  Create your first custom audience to start retargeting your customers on Pinterest.
                </p>
                <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
                  Create Audience
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="bg-elevated">
          <CardContent className="p-6">
            <h3 className="text-body font-medium mb-4">How Pinterest Audiences Work</h3>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center mb-3">
                  <span className="text-sage font-semibold">1</span>
                </div>
                <h4 className="text-body-sm font-medium mb-1">Create Segment</h4>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  Define criteria like purchase history, quiz results, or engagement level.
                </p>
              </div>
              <div>
                <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center mb-3">
                  <span className="text-sage font-semibold">2</span>
                </div>
                <h4 className="text-body-sm font-medium mb-1">Export to Pinterest</h4>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  Email addresses are hashed (SHA-256) and sent securely to Pinterest.
                </p>
              </div>
              <div>
                <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center mb-3">
                  <span className="text-sage font-semibold">3</span>
                </div>
                <h4 className="text-body-sm font-medium mb-1">Target in Ads</h4>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  Use the audience in Pinterest Ads Manager for retargeting campaigns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-body font-medium mb-4">Create Custom Audience</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-body-sm font-medium mb-2">Audience Name</label>
                <Input
                  value={newAudience.name}
                  onChange={(e) => setNewAudience(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., High-Value Customers"
                />
              </div>
              <div>
                <label className="block text-body-sm font-medium mb-2">Description (optional)</label>
                <Input
                  value={newAudience.description}
                  onChange={(e) => setNewAudience(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Customers with LTV > $100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newAudience)}
                disabled={!newAudience.name || createMutation.isPending}
                isLoading={createMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
