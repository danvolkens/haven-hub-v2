'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { useReferralStats } from '@/hooks/use-referrals';
import { Users, DollarSign, TrendingUp, Gift } from 'lucide-react';

export default function ReferralsPage() {
  const { data: stats, isLoading } = useReferralStats();

  if (isLoading) {
    return <PageContainer title="Referral Program">Loading...</PageContainer>;
  }

  return (
    <PageContainer
      title="Referral Program"
      description="Track referral performance and top referrers"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage-100 rounded-lg">
              <Users className="h-5 w-5 text-sage-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Referrals</div>
              <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Converted</div>
              <div className="text-2xl font-bold">{stats?.convertedReferrals || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Revenue Generated</div>
              <div className="text-2xl font-bold">
                ${(stats?.totalRevenueGenerated || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
              <div className="text-2xl font-bold">
                {stats?.totalReferrals ?
                  Math.round((stats.convertedReferrals / stats.totalReferrals) * 100) : 0}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Top Referrers</h2>
        </div>
        <div className="divide-y">
          {stats?.topReferrers?.map((referrer, index) => (
            <div key={referrer.email} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-600">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{referrer.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {referrer.referrals} referral{referrer.referrals !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${referrer.revenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">revenue</div>
              </div>
            </div>
          ))}
          {(!stats?.topReferrers || stats.topReferrers.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              No referrals yet
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}
