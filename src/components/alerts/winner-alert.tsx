'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Trophy, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WinnerAlertBannerProps {
  className?: string;
}

interface WinnerCampaign {
  id: string;
  name: string;
  cpa: number;
  roas: number;
  status: 'scale' | 'maintain' | 'optimize' | 'pause';
  recommendation: string;
}

interface WinnersResponse {
  winners: WinnerCampaign[];
  total_count: number;
  scale_count: number;
}

export function WinnerAlertBanner({ className }: WinnerAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('winner-alert-dismissed');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDismissedIds(parsed.ids || []);
        // Check if dismissal is still valid (reset after 24 hours)
        if (parsed.timestamp && Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('winner-alert-dismissed');
          setDismissedIds([]);
        }
      } catch {
        localStorage.removeItem('winner-alert-dismissed');
      }
    }
  }, []);

  const { data, isLoading } = useQuery<WinnersResponse>({
    queryKey: ['campaign-winners', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/pinterest/campaigns/winners?recent=true');
      if (!res.ok) throw new Error('Failed to fetch winners');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  const handleDismiss = () => {
    setDismissed(true);
    if (data?.winners) {
      const newDismissedIds = [...dismissedIds, ...data.winners.map(w => w.id)];
      setDismissedIds(newDismissedIds);
      localStorage.setItem('winner-alert-dismissed', JSON.stringify({
        ids: newDismissedIds,
        timestamp: Date.now(),
      }));
    }
  };

  // Filter out already-dismissed winners
  const newWinners = data?.winners?.filter(w => !dismissedIds.includes(w.id)) || [];
  const scaleCount = newWinners.filter(w => w.status === 'scale').length;

  // Don't show if loading, dismissed, or no new winners
  if (isLoading || dismissed || newWinners.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-4 rounded-lg border border-success/30 bg-success/10 p-4',
        className
      )}
      role="alert"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/20">
        <Trophy className="h-5 w-5 text-success" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-charcoal">
          {scaleCount} campaign{scaleCount !== 1 ? 's' : ''} performing excellently!
        </p>
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-0.5">
          {newWinners[0]?.name}
          {newWinners.length > 1 && ` and ${newWinners.length - 1} other${newWinners.length > 2 ? 's' : ''}`}
          {' '}- Consider scaling budget for maximum impact
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href="/dashboard/pinterest/ads?tab=budget">
          <Button size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
            Review & Scale
          </Button>
        </Link>
        <button
          onClick={handleDismiss}
          className="p-2 rounded-md text-[var(--color-text-tertiary)] hover:text-charcoal hover:bg-success/10 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
