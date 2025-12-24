'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button } from '@/components/ui';
import { Gift, Plus } from 'lucide-react';

export default function GiftsPage() {
  return (
    <PageContainer
      title="Gift Registry"
      description="Manage gift cards and gifting campaigns"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Gift className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">No Gift Cards Yet</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
            Create and manage gift cards for your customers. Track redemptions
            and run special gifting promotions.
          </p>
          <Button variant="primary">
            <Plus className="mr-2 h-4 w-4" /> Create Gift Card
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
