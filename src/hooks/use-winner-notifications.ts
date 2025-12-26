'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface WinnerCampaign {
  id: string;
  name: string;
  cpa: number;
  roas: number;
  status: 'scale' | 'maintain' | 'optimize' | 'pause';
}

interface WinnersResponse {
  winners: WinnerCampaign[];
  scale_count: number;
}

/**
 * Hook to show toast notifications when new winners are detected
 * Used in dashboard or layout components to notify users of high-performing campaigns
 */
export function useWinnerNotifications() {
  const { toast } = useToast();
  const router = useRouter();
  const previousWinnerIds = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  const { data } = useQuery<WinnersResponse>({
    queryKey: ['campaign-winners', 'notifications'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/campaigns/winners?recent=true');
      if (!res.ok) throw new Error('Failed to fetch winners');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Check every 10 minutes
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data?.winners) return;

    const scaleWinners = data.winners.filter(w => w.status === 'scale');
    const currentWinnerIds = new Set(scaleWinners.map(w => w.id));

    // Skip on first load to avoid showing notifications for existing winners
    if (!hasInitialized.current) {
      previousWinnerIds.current = currentWinnerIds;
      hasInitialized.current = true;
      return;
    }

    // Find new winners that weren't in the previous set
    const newWinners = scaleWinners.filter(w => !previousWinnerIds.current.has(w.id));

    if (newWinners.length > 0) {
      // Show toast for each new winner (max 3 to avoid spam)
      newWinners.slice(0, 3).forEach((winner, index) => {
        // Stagger the toasts slightly
        setTimeout(() => {
          toast(
            `New Winner Detected! ${winner.name} is performing excellently with ${winner.roas.toFixed(1)}x ROAS`,
            'success',
            {
              label: 'View Details',
              onClick: () => router.push('/dashboard/pinterest/ads?tab=budget'),
            }
          );
        }, index * 500);
      });

      // If more than 3, show a summary
      if (newWinners.length > 3) {
        setTimeout(() => {
          toast(
            `${newWinners.length} campaigns are performing excellently!`,
            'success',
            {
              label: 'Review All',
              onClick: () => router.push('/dashboard/pinterest/ads?tab=budget'),
            }
          );
        }, 1500);
      }
    }

    // Update the reference
    previousWinnerIds.current = currentWinnerIds;
  }, [data, toast, router]);

  return {
    winnersCount: data?.scale_count || 0,
    hasWinners: (data?.scale_count || 0) > 0,
  };
}
