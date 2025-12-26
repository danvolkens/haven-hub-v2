'use client';

import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button } from '@/components/ui';
import { QuoteForm, type QuoteFormData } from '@/components/quotes/quote-form';
import { useQuote, useUpdateQuote } from '@/hooks/use-quotes';
import Link from 'next/link';

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const { data: quote, isLoading, error } = useQuote(quoteId);
  const updateMutation = useUpdateQuote();

  const handleSubmit = async (data: QuoteFormData) => {
    await updateMutation.mutateAsync({
      id: quoteId,
      text: data.text,
      attribution: data.attribution,
      collection: data.collection,
      mood: data.mood,
      temporal_tags: data.temporal_tags,
    });
    router.push('/dashboard/quotes');
  };

  if (isLoading) {
    return (
      <PageContainer title="Edit Quote">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
        </div>
      </PageContainer>
    );
  }

  if (error || !quote) {
    return (
      <PageContainer title="Quote Not Found">
        <Card className="p-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">
            The quote you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/dashboard/quotes">
            <Button variant="secondary" className="mt-4">
              Back to Quotes
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Edit Quote"
      description="Update quote details"
    >
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <QuoteForm
            initialData={{
              text: quote.text,
              attribution: quote.attribution || '',
              collection: quote.collection,
              mood: quote.mood,
              temporal_tags: quote.temporal_tags || [],
            }}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
