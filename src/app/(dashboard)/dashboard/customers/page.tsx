'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui';
import { JourneyFunnel } from '@/components/customers/journey-funnel';
import { Users } from 'lucide-react';

export default function CustomersPage() {
  return (
    <PageContainer
      title="Customer Overview"
      description="View your customer journey funnel and segment performance"
    >
      <div className="space-y-6">
        <JourneyFunnel />

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
            <h3 className="text-h3 mb-2">Customer List Coming Soon</h3>
            <p className="text-body text-[var(--color-text-secondary)] max-w-md">
              View and manage individual customer profiles, their journey stages,
              and lifetime value.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
