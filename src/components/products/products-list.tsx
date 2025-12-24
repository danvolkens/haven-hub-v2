'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button, Card, Badge, Select } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/products';

interface ProductsResponse {
  products: Product[];
  total: number;
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
];

const collectionOptions = [
  { value: '', label: 'All Collections' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'wholeness', label: 'Wholeness' },
  { value: 'growth', label: 'Growth' },
];

export function ProductsList() {
  const [status, setStatus] = useState('');
  const [collection, setCollection] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', status, collection],
    queryFn: () => api.get<ProductsResponse>('/products', { status, collection }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  const products = data?.products || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select
          options={statusOptions}
          value={status}
          onChange={(v) => setStatus(v as string)}
          className="w-32"
        />
        <Select
          options={collectionOptions}
          value={collection}
          onChange={(v) => setCollection(v as string)}
          className="w-36"
        />
      </div>

      {/* Products grid */}
      {products.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
          <h3 className="text-h3 mb-1">No products yet</h3>
          <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
            Create products from your approved assets
          </p>
          <Link href="/dashboard/products/new">
            <Button>Create Your First Product</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images?.[0];
  const variantCount = product.variants?.length || 0;
  const priceRange = product.variants?.length
    ? {
        min: Math.min(...product.variants.map((v) => v.price)),
        max: Math.max(...product.variants.map((v) => v.price)),
      }
    : null;

  const statusColors: Record<string, string> = {
    draft: 'bg-elevated text-[var(--color-text-secondary)]',
    pending: 'bg-warning/10 text-warning',
    active: 'bg-success/10 text-success',
    retired: 'bg-error/10 text-error',
    archived: 'bg-elevated text-[var(--color-text-tertiary)]',
  };

  return (
    <Card className="overflow-hidden hover:shadow-elevation-2 transition-shadow">
      {/* Image */}
      <div className="relative aspect-square bg-elevated">
        {mainImage ? (
          <Image
            src={mainImage.src}
            alt={product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-12 w-12 text-[var(--color-text-tertiary)]" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className={statusColors[product.status]}>
            {product.status}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-body font-medium line-clamp-1">{product.title}</h3>

        <div className="flex items-center gap-2 mt-1">
          {product.collection && (
            <Badge variant={product.collection as 'grounding' | 'wholeness' | 'growth'} size="sm">
              {product.collection}
            </Badge>
          )}
          <span className="text-caption text-[var(--color-text-tertiary)]">
            {variantCount} variant{variantCount !== 1 ? 's' : ''}
          </span>
        </div>

        {priceRange && (
          <p className="text-body-sm font-medium mt-2">
            {priceRange.min === priceRange.max
              ? formatCurrency(priceRange.min)
              : `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`}
          </p>
        )}

        {/* Stats */}
        {product.status === 'active' && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-caption text-[var(--color-text-tertiary)]">
            <span>{product.total_views} views</span>
            <span>{product.total_orders} orders</span>
            <span>{formatCurrency(product.total_revenue)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Link href={`/dashboard/products/${product.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          {product.shopify_handle && (
            <a
              href={`https://${product.shopify_handle}.myshopify.com/products/${product.shopify_handle}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon-sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
