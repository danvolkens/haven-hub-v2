'use client';

import { useQuery } from '@tanstack/react-query';

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalRevenueGenerated: number;
  topReferrers: Array<{
    email: string;
    referrals: number;
    conversions: number;
    revenue: number;
  }>;
}

export function useReferralStats() {
  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/referrals/stats');
      if (!response.ok) throw new Error('Failed to fetch referral stats');
      return response.json() as Promise<ReferralStats>;
    },
  });
}

export function useCustomerReferrals(customerId: string) {
  return useQuery({
    queryKey: ['customer-referrals', customerId],
    queryFn: async () => {
      const response = await fetch(`/api/loyalty/referrals?customer_id=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch referrals');
      return response.json();
    },
    enabled: !!customerId,
  });
}
