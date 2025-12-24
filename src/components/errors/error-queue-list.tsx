'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatRelativeTime } from '@/lib/utils';
import { useToast } from '@/components/providers/toast-provider';

interface RetryItem {
  id: string;
  operation_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_retry_at: string;
  created_at: string;
}

interface ErrorQueueResponse {
  items: RetryItem[];
  total: number;
  counts: {
    pending: number;
    processing: number;
    resolved: number;
    failed: number;
  };
}

export function ErrorQueueList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['error-queue'],
    queryFn: () => api.get<ErrorQueueResponse>('/errors'),
    refetchInterval: 30000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/errors/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-queue'] });
      toast('Item queued for retry', 'success');
    },
    onError: () => {
      toast('Failed to retry item', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  const { items = [], counts = { pending: 0, processing: 0, resolved: 0, failed: 0 } } = data || {};

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-metric">{counts.pending}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-info animate-spin" />
            <div>
              <p className="text-metric">{counts.processing}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Processing</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            <div>
              <p className="text-metric">{counts.resolved}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Resolved</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-error" />
            <div>
              <p className="text-metric">{counts.failed}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Check className="h-12 w-12 text-success mx-auto mb-3" />
          <h3 className="text-h3 mb-1">No errors</h3>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            All operations are running smoothly
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    <span className="font-medium">{item.operation_type}</span>
                    <Badge
                      variant={
                        item.status === 'failed' ? 'error' :
                        item.status === 'processing' ? 'info' :
                        'warning'
                      }
                      size="sm"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {item.last_error && (
                    <p className="mt-1 text-body-sm text-error line-clamp-2">
                      {item.last_error}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-4 text-caption text-[var(--color-text-tertiary)]">
                    <span>Attempts: {item.attempts}/{item.max_attempts}</span>
                    <span>Created: {formatRelativeTime(item.created_at)}</span>
                    {item.status === 'pending' && (
                      <span>Next retry: {formatRelativeTime(item.next_retry_at)}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {(item.status === 'failed' || item.status === 'pending') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => retryMutation.mutate(item.id)}
                      isLoading={retryMutation.isPending}
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                      Retry Now
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
