'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button } from '@/components/ui';
import { FlaskConical, Plus } from 'lucide-react';

export default function PinterestTestsPage() {
  return (
    <PageContainer
      title="A/B Tests"
      description="Test different copy variants to optimize engagement"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FlaskConical className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">No Active Tests</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
            Create A/B tests to compare different pin copy variants and
            discover what resonates best with your audience.
          </p>
          <Button variant="primary">
            <Plus className="mr-2 h-4 w-4" /> Create Test
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
