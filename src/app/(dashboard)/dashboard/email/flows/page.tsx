'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Zap,
  ExternalLink,
  RefreshCw,
  Play,
  Pause,
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

interface Flow {
  id: string;
  name: string;
  status: 'live' | 'draft' | 'paused';
  trigger: string;
  created: string;
  updated: string;
}

interface FlowsResponse {
  flows: Flow[];
}

const STATUS_COLORS = {
  live: 'success',
  draft: 'secondary',
  paused: 'warning',
} as const;

const STATUS_ICONS = {
  live: Play,
  draft: null,
  paused: Pause,
};

export default function EmailFlowsPage() {
  const { data, isLoading, refetch } = useQuery<FlowsResponse>({
    queryKey: ['klaviyo-flows'],
    queryFn: () => api.get('/klaviyo/flows'),
  });

  const { data: setupStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['klaviyo-setup-status'],
    queryFn: () => api.get('/klaviyo/setup-status'),
  });

  const isConnected = setupStatus?.connected;

  if (!isConnected) {
    return (
      <PageContainer title="Email Flows" description="Automated email sequences">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-sage" />
            </div>
            <h3 className="text-body font-medium mb-2">Connect Klaviyo First</h3>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
              Connect your Klaviyo account to view and manage your email flows.
            </p>
            <Link href="/dashboard/email/setup">
              <Button>Setup Klaviyo</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Email Flows"
      description="Automated email sequences powered by Klaviyo"
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
            onClick={() => window.open('https://www.klaviyo.com/flows', '_blank')}
            rightIcon={<ExternalLink className="h-4 w-4" />}
          >
            Manage in Klaviyo
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Active Flows</p>
              <p className="text-2xl font-semibold mt-1">
                {data?.flows.filter(f => f.status === 'live').length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Draft Flows</p>
              <p className="text-2xl font-semibold mt-1">
                {data?.flows.filter(f => f.status === 'draft').length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Paused Flows</p>
              <p className="text-2xl font-semibold mt-1">
                {data?.flows.filter(f => f.status === 'paused').length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-caption text-[var(--color-text-secondary)]">Total Flows</p>
              <p className="text-2xl font-semibold mt-1">
                {data?.flows.length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Flows List */}
        <Card>
          <CardHeader
            title="All Flows"
            description="Your Klaviyo automation flows"
          />
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-sage mx-auto mb-3" />
                <p className="text-[var(--color-text-secondary)]">Loading flows...</p>
              </div>
            ) : data?.flows && data.flows.length > 0 ? (
              <div className="divide-y">
                {data.flows.map((flow) => {
                  const StatusIcon = STATUS_ICONS[flow.status];
                  return (
                    <div key={flow.id} className="p-4 hover:bg-elevated/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-sage" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-body font-medium">{flow.name}</h4>
                              <Badge variant={STATUS_COLORS[flow.status]}>
                                {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                                {flow.status}
                              </Badge>
                            </div>
                            <p className="text-caption text-[var(--color-text-tertiary)]">
                              Trigger: {flow.trigger}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://www.klaviyo.com/flow/${flow.id}/edit`, '_blank')}
                          rightIcon={<ExternalLink className="h-3 w-3" />}
                        >
                          View in Klaviyo
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-[var(--color-text-tertiary)]" />
                </div>
                <h3 className="text-body font-medium mb-2">No flows found</h3>
                <p className="text-body-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
                  Create your first email flow in Klaviyo to start automating customer journeys.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/dashboard/email/setup">
                    <Button variant="secondary">View Setup Guide</Button>
                  </Link>
                  <Button
                    onClick={() => window.open('https://www.klaviyo.com/flows/create', '_blank')}
                    rightIcon={<ExternalLink className="h-4 w-4" />}
                  >
                    Create Flow
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </PageContainer>
  );
}
