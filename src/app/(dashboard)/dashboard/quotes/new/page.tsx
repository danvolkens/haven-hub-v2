'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui';
import { QuoteForm, type QuoteFormData } from '@/components/quotes/quote-form';
import { useCreateQuote } from '@/hooks/use-quotes';

export default function NewQuotePage() {
  const router = useRouter();
  const createMutation = useCreateQuote();

  const handleSubmit = async (data: QuoteFormData) => {
    await createMutation.mutateAsync(data);
    router.push('/dashboard/quotes');
  };

  return (
    <PageContainer
      title="Add Quote"
      description="Create a new quote for your library"
    >
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <QuoteForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
