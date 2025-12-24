'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui';
import { ShoppingBag } from 'lucide-react';

export default function AbandonmentPage() {
  return (
    <PageContainer
      title="Cart Abandonment"
      description="Track and recover abandoned carts with automated campaigns"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">No Abandoned Carts</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md">
            When visitors abandon their shopping carts, you&apos;ll see them here
            along with recovery campaign performance.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
