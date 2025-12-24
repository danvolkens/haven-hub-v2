'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button } from '@/components/ui';
import { Heart, Plus } from 'lucide-react';

export default function WinBackPage() {
  return (
    <PageContainer
      title="Win-Back Campaigns"
      description="Re-engage lapsed customers with targeted campaigns"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Heart className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">No Win-Back Campaigns</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
            Create automated campaigns to bring back customers who haven&apos;t
            purchased in a while with personalized offers.
          </p>
          <Button variant="primary">
            <Plus className="mr-2 h-4 w-4" /> Create Campaign
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
