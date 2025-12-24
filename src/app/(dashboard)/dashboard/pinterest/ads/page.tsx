'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button } from '@/components/ui';
import { Megaphone, ExternalLink } from 'lucide-react';

export default function PinterestAdsPage() {
  return (
    <PageContainer
      title="Pinterest Ads"
      description="Create and manage Pinterest advertising campaigns"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">Pinterest Ads Manager</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
            Promote your top-performing pins to reach a wider audience.
            Connect your Pinterest Business account to get started.
          </p>
          <Button variant="primary">
            Connect Pinterest Ads <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
