'use client';

import { PageContainer } from '@/components/layout/page-container';
import { ApprovalQueueList } from '@/components/approval-queue/approval-queue-list';

export default function ApprovalsPage() {
  return (
    <PageContainer
      title="Approval Queue"
      description="Review and approve pending content before publishing"
    >
      <ApprovalQueueList />
    </PageContainer>
  );
}
