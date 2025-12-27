'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ShoppingBag, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Input, Label, Select } from '@/components/ui';
import { QuoteForm, type QuoteFormData } from '@/components/quotes/quote-form';
import { useQuote, useUpdateQuote } from '@/hooks/use-quotes';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  shopify_handle: string;
  shopify_product_id: string;
}

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const queryClient = useQueryClient();

  const { data: quote, isLoading, error } = useQuote(quoteId);
  const updateMutation = useUpdateQuote();

  // Local state for product linking
  const [productId, setProductId] = useState<string>('');
  const [productLink, setProductLink] = useState<string>('');
  const [linkMode, setLinkMode] = useState<'product' | 'manual'>('product');

  // Fetch products for selection
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=100');
      if (!res.ok) return { products: [] };
      return res.json();
    },
  });

  const products: Product[] = productsData?.products || [];

  // Initialize state when quote loads
  useEffect(() => {
    if (quote) {
      setProductId(quote.product_id || '');
      setProductLink(quote.product_link || '');
      setLinkMode(quote.product_link ? 'manual' : 'product');
    }
  }, [quote]);

  // Mutation for updating product link
  const updateProductLinkMutation = useMutation({
    mutationFn: async (data: { product_id?: string | null; product_link?: string | null }) => {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update product link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
    },
  });

  const handleSaveProductLink = () => {
    if (linkMode === 'product') {
      updateProductLinkMutation.mutate({
        product_id: productId || null,
        product_link: null,
      });
    } else {
      updateProductLinkMutation.mutate({
        product_id: null,
        product_link: productLink || null,
      });
    }
  };

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

  // Find linked product details
  const linkedProduct = products.find(p => p.id === productId);

  return (
    <PageContainer
      title="Edit Quote"
      description="Update quote details"
    >
      <div className="max-w-2xl space-y-6">
        <Card>
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

        {/* Product Linking Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="h-5 w-5 text-sage" />
              <h3 className="text-lg font-medium">Product Link</h3>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Link this quote to a Shopify product. When creating Pinterest pins, the product URL will be used as the destination.
            </p>

            {/* Link Mode Toggle */}
            <div className="flex gap-2 p-1 bg-[var(--color-bg-secondary)] rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setLinkMode('product')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  linkMode === 'product'
                    ? 'bg-white shadow-sm text-charcoal'
                    : 'text-[var(--color-text-secondary)] hover:text-charcoal'
                }`}
              >
                <ShoppingBag className="h-4 w-4 inline-block mr-2" />
                Select Product
              </button>
              <button
                type="button"
                onClick={() => setLinkMode('manual')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  linkMode === 'manual'
                    ? 'bg-white shadow-sm text-charcoal'
                    : 'text-[var(--color-text-secondary)] hover:text-charcoal'
                }`}
              >
                <LinkIcon className="h-4 w-4 inline-block mr-2" />
                Manual URL
              </button>
            </div>

            {linkMode === 'product' ? (
              <div className="space-y-3">
                <Label>Shopify Product</Label>
                {products.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    No Shopify products synced yet.{' '}
                    <Link href="/dashboard/settings/shopify" className="text-sage hover:underline">
                      Sync products
                    </Link>
                  </p>
                ) : (
                  <Select
                    value={productId}
                    onChange={(value) => setProductId(typeof value === 'string' ? value : '')}
                    options={[
                      { value: '', label: 'No product linked' },
                      ...products.map((product) => ({
                        value: product.id,
                        label: product.title,
                      })),
                    ]}
                  />
                )}
                {linkedProduct && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <ExternalLink className="h-4 w-4" />
                    <span>Will link to: /products/{linkedProduct.shopify_handle}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Product URL</Label>
                <Input
                  type="url"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  placeholder="https://your-shop.com/products/..."
                />
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Enter the full URL to your product page
                </p>
              </div>
            )}

            {/* Current Link Status */}
            {(quote.product_id || quote.product_link) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Currently linked to:{' '}
                  {quote.product_link || (linkedProduct ? `/products/${linkedProduct.shopify_handle}` : 'a product')}
                </p>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSaveProductLink}
                disabled={updateProductLinkMutation.isPending}
                variant="secondary"
              >
                {updateProductLinkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Product Link'
                )}
              </Button>
            </div>

            {updateProductLinkMutation.isSuccess && (
              <p className="mt-2 text-sm text-green-600">Product link saved!</p>
            )}
            {updateProductLinkMutation.error && (
              <p className="mt-2 text-sm text-red-500">
                {updateProductLinkMutation.error instanceof Error
                  ? updateProductLinkMutation.error.message
                  : 'Failed to save'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
