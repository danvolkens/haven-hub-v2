'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, Check, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface ActivityLogEntry {
  id: string;
  action_type: string;
  module: string | null;
  details: Record<string, unknown>;
  executed: boolean;
  operator_mode: string;
  created_at: string;
}

interface ActivityLogProps {
  limit?: number;
  showViewAll?: boolean;
}

const actionLabels: Record<string, string> = {
  mode_change: 'Mode Changed',
  guardrail_update: 'Guardrail Updated',
  asset_generated: 'Asset Generated',
  asset_approved: 'Asset Approved',
  asset_rejected: 'Asset Rejected',
  pin_scheduled: 'Pin Scheduled',
  pin_published: 'Pin Published',
  pin_failed: 'Pin Failed',
  mockup_generated: 'Mockup Generated',
  product_created: 'Product Created',
  product_published: 'Product Published',
  ad_campaign_created: 'Ad Campaign Created',
  ad_budget_warning: 'Budget Warning',
  sequence_triggered: 'Sequence Triggered',
  retry_queued: 'Retry Queued',
  retry_resolved: 'Retry Resolved',
  retry_failed: 'Retry Failed',
};

export function ActivityLog({ limit = 10, showViewAll = true }: ActivityLogProps) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['activity-log', limit],
    queryFn: async () => {
      const response = await fetch(`/api/activity?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json() as Promise<ActivityLogEntry[]>;
    },
    refetchInterval: 30000,
  });

  return (
    <Card>
      <CardHeader
        title="Recent Activity"
        description="Actions taken by the system"
        action={
          showViewAll && (
            <Link href="/dashboard/activity">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )
        }
      />
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-elevated" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-elevated" />
                  <div className="h-3 w-1/2 rounded bg-elevated" />
                </div>
              </div>
            ))}
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry) => (
              <ActivityLogItem key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Clock className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              No activity yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityLogItem({ entry }: { entry: ActivityLogEntry }) {
  const label = actionLabels[entry.action_type] || entry.action_type;

  const getIcon = () => {
    if (entry.action_type.includes('failed')) {
      return <X className="h-4 w-4 text-error" />;
    }
    if (entry.action_type.includes('warning')) {
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
    if (entry.executed) {
      return <Check className="h-4 w-4 text-success" />;
    }
    return <Clock className="h-4 w-4 text-[var(--color-text-tertiary)]" />;
  };

  const getStatusBadge = () => {
    if (!entry.executed) {
      return <Badge variant="secondary" size="sm">Pending</Badge>;
    }
    if (entry.action_type.includes('failed')) {
      return <Badge variant="error" size="sm">Failed</Badge>;
    }
    return null;
  };

  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center',
        entry.executed ? 'bg-success/10' : 'bg-elevated'
      )}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium">{label}</span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.module && (
            <Badge variant="outline" size="sm">{entry.module}</Badge>
          )}
          <span className="text-caption text-[var(--color-text-tertiary)]">
            {formatRelativeTime(entry.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
