import { PageContainer } from '@/components/layout/page-container';
import { Card, Button } from '@/components/ui';
import { Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Create Product | Haven Hub',
};

export default function NewProductPage() {
  return (
    <PageContainer
      title="Create Product"
      description="Create a new product from your quotes and assets"
      actions={
        <Link href="/dashboard/products">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
      }
    >
      <Card className="p-8 text-center max-w-lg mx-auto">
        <Package className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
        <h3 className="text-h3 mb-2">Product Creation Coming Soon</h3>
        <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
          Products are currently synced from Shopify. The ability to create products
          directly from Haven Hub quotes and assets is coming soon.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/quotes">
            <Button variant="secondary" className="w-full">
              Manage Quotes
            </Button>
          </Link>
          <Link href="/dashboard/assets">
            <Button variant="secondary" className="w-full">
              Manage Assets
            </Button>
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
}
