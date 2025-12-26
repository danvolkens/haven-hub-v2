'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button } from '@/components/ui';
import { HelpCircle, Plus } from 'lucide-react';
import { useToast } from '@/components/providers/toast-provider';

export default function QuizPage() {
  const { toast } = useToast();

  const handleCreate = () => {
    toast('Quiz builder coming soon! This feature is under development.', 'info');
  };

  return (
    <PageContainer
      title="Quiz Builder"
      description="Create personality quizzes to capture leads and recommend products"
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <HelpCircle className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
          <h3 className="text-h3 mb-2">No Quizzes Yet</h3>
          <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
            Build interactive quizzes to help visitors discover their perfect
            collection and capture their email for future marketing.
          </p>
          <Button variant="primary" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Quiz
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
