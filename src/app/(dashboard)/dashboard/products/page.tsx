import { PageContainer } from '@/components/layout/page-container';
import { ProductsList } from '@/components/products/products-list';
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Products | Haven Hub',
};

export default function ProductsPage() {
  return (
    <PageContainer
      title="Products"
      description="Manage your Shopify products"
      actions={
        <Link href="/dashboard/products/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Create Product
          </Button>
        </Link>
      }
    >
      <ProductsList />
    </PageContainer>
  );
}
