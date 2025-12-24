import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetcher';
import { useToast } from '@/components/providers/toast-provider';
import type { ApprovalItem, ApprovalCounts, ApprovalFilters, ApprovalAction } from '@/types/approval';

interface ApprovalListResponse {
  items: ApprovalItem[];
  total: number;
  limit: number;
  offset: number;
}

export function useApprovalQueue(filters: ApprovalFilters = {}, limit = 20, offset = 0) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch items
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['approvals', filters, limit, offset],
    queryFn: () => api.get<ApprovalListResponse>('/approvals', {
      ...filters,
      limit,
      offset,
    }),
  });

  // Fetch counts
  const { data: counts } = useQuery({
    queryKey: ['approval-counts'],
    queryFn: () => api.get<ApprovalCounts>('/approvals/counts'),
    refetchInterval: 30000,
  });

  // Single item action
  const actionMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: ApprovalAction; reason?: string }) => {
      return api.patch(`/approvals/${id}`, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Action failed', 'error');
    },
  });

  // Bulk action
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, itemIds, reason }: { action: 'approve' | 'reject'; itemIds: string[]; reason?: string }) => {
      return api.post('/approvals/bulk', { action, itemIds, reason });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
      toast(
        `${variables.itemIds.length} items ${variables.action === 'approve' ? 'approved' : 'rejected'}`,
        'success'
      );
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Bulk action failed', 'error');
    },
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    counts: counts ?? { total: 0, asset: 0, mockup: 0, pin: 0, ugc: 0, product: 0 },
    isLoading,
    error,
    refetch,

    // Actions
    approve: (id: string) => actionMutation.mutateAsync({ id, action: 'approve' }),
    reject: (id: string, reason?: string) => actionMutation.mutateAsync({ id, action: 'reject', reason }),
    skip: (id: string) => actionMutation.mutateAsync({ id, action: 'skip' }),

    // Bulk actions
    bulkApprove: (itemIds: string[]) => bulkActionMutation.mutateAsync({ action: 'approve', itemIds }),
    bulkReject: (itemIds: string[], reason?: string) => bulkActionMutation.mutateAsync({ action: 'reject', itemIds, reason }),

    // Loading states
    isActioning: actionMutation.isPending,
    isBulkActioning: bulkActionMutation.isPending,
  };
}
