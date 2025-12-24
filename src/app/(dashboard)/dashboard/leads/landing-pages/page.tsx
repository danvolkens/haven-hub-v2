'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button } from '@/components/ui';
import { Layers, Plus } from 'lucide-react';

export default function LandingPagesPage() {
  return (
    <PageContainer
      title="Landing Pages"
      description="Create and manage lead capture landing pages"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">No Landing Pages Yet</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
            Create beautiful landing pages for lead magnets, special offers,
            and email capture campaigns.
          </p>
          <Button variant="primary">
            <Plus className="mr-2 h-4 w-4" /> Create Landing Page
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
