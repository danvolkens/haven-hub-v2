'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui';
import { BarChart3 } from 'lucide-react';

export default function AttributionPage() {
  return (
    <PageContainer
      title="Attribution Analytics"
      description="Track content performance and revenue attribution"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">Attribution Data Coming Soon</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md">
            See which pins, quotes, and campaigns are driving the most revenue.
            Track the customer journey from first impression to purchase.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
