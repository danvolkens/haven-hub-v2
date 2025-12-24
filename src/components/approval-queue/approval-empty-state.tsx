'use client';

import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui';

export function ApprovalEmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
        <CheckCircle className="h-6 w-6 text-success" />
      </div>
      <h3 className="text-h3 mb-2">All caught up!</h3>
      <p className="text-body text-[var(--color-text-secondary)]">
        No items pending approval. New items will appear here when they&apos;re ready for review.
      </p>
    </Card>
  );
}
