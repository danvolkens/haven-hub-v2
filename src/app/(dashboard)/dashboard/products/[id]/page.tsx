'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Edit,
  Tag,
  Box,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button, Card, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatCurrency } from '@/lib/utils';

interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  size: string;
  frame_style: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  is_active: boolean;
}

interface ProductImage {
  id: string;
  src: string;
  alt: string;
  position: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  status: string;
  collection: string | null;
  tags: string[];
  vendor: string;
  product_type: string;
  shopify_product_id: string | null;
  shopify_handle: string | null;
  total_views: number;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
  variants: ProductVariant[];
  images: ProductImage[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.get<{ product: Product }>(`/products/${productId}`),
    select: (data) => data.product,
  });

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
        </div>
      </PageContainer>
    );
  }

  if (error || !product) {
    return (
      <PageContainer title="Product Not Found">
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
          <h3 className="text-h3 mb-1">Product not found</h3>
          <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
            This product may have been deleted or you don&apos;t have access.
          </p>
          <Link href="/dashboard/products">
            <Button>Back to Products</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const mainImage = product.images?.[0];
  const statusColors: Record<string, string> = {
    draft: 'bg-elevated text-[var(--color-text-secondary)]',
    pending: 'bg-warning/10 text-warning',
    active: 'bg-success/10 text-success',
    retired: 'bg-error/10 text-error',
    archived: 'bg-elevated text-[var(--color-text-tertiary)]',
  };

  return (
    <PageContainer
      title={product.title}
      description={`${product.vendor} • ${product.product_type || 'Product'}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/dashboard/products">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          {product.shopify_handle && (
            <a
              href={`https://admin.shopify.com/store/havenandhold/products/${product.shopify_product_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" leftIcon={<ExternalLink className="h-4 w-4" />}>
                View in Shopify
              </Button>
            </a>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Images */}
        <Card className="overflow-hidden">
          <div className="relative aspect-square bg-elevated">
            {mainImage ? (
              <Image
                src={mainImage.src}
                alt={mainImage.alt || product.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-16 w-16 text-[var(--color-text-tertiary)]" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto">
              {product.images.map((img) => (
                <div
                  key={img.id}
                  className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border"
                >
                  <Image
                    src={img.src}
                    alt={img.alt || ''}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Details */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Badge className={statusColors[product.status]}>
                {product.status}
              </Badge>
              {product.collection && (
                <Badge variant={product.collection as 'grounding' | 'wholeness' | 'growth'}>
                  {product.collection}
                </Badge>
              )}
            </div>

            {product.description && (
              <div
                className="text-body-sm text-[var(--color-text-secondary)] mb-4 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-elevated rounded text-caption"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-h3">{product.total_views}</p>
                <p className="text-caption text-[var(--color-text-tertiary)]">Views</p>
              </div>
              <div className="text-center">
                <p className="text-h3">{product.total_orders}</p>
                <p className="text-caption text-[var(--color-text-tertiary)]">Orders</p>
              </div>
              <div className="text-center">
                <p className="text-h3">{formatCurrency(product.total_revenue)}</p>
                <p className="text-caption text-[var(--color-text-tertiary)]">Revenue</p>
              </div>
            </div>
          </Card>

          {/* Variants */}
          <Card className="p-4">
            <h3 className="text-body font-medium mb-3 flex items-center gap-2">
              <Box className="h-4 w-4" />
              Variants ({product.variants.length})
            </h3>
            <div className="space-y-2">
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-3 bg-elevated rounded-lg"
                >
                  <div>
                    <p className="text-body-sm font-medium">{variant.title}</p>
                    <p className="text-caption text-[var(--color-text-tertiary)]">
                      {variant.sku || 'No SKU'} • {variant.inventory_quantity} in stock
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-body font-medium">{formatCurrency(variant.price)}</p>
                    {variant.compare_at_price && variant.compare_at_price > variant.price && (
                      <p className="text-caption text-[var(--color-text-tertiary)] line-through">
                        {formatCurrency(variant.compare_at_price)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {product.variants.length === 0 && (
                <p className="text-body-sm text-[var(--color-text-tertiary)] text-center py-4">
                  No variants
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
