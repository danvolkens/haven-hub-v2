'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui';
import { Image } from 'lucide-react';

export default function AssetsPage() {
  return (
    <PageContainer
      title="Design Assets"
      description="Browse and manage generated design assets"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Image className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">No Assets Yet</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md">
            Generate assets from your quotes to see them here.
            Go to Quotes and click Generate to create new designs.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
