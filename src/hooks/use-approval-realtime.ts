'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/providers/toast-provider';

export function useApprovalRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('approval-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // New item added to queue
          queryClient.invalidateQueries({ queryKey: ['approvals'] });
          queryClient.invalidateQueries({ queryKey: ['approval-counts'] });

          const item = payload.new as { type: string };
          toast(`New ${item.type} ready for review`, 'info');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'approval_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Item status changed (possibly by another tab/device)
          const newStatus = (payload.new as { status: string }).status;
          if (newStatus !== 'pending') {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'approval_items',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['approvals'] });
          queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, queryClient, toast]);
}
