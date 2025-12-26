'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { Layers, Plus, ExternalLink, Edit, Eye, BarChart3 } from 'lucide-react';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  type: string;
  headline: string;
  status: 'draft' | 'active' | 'archived';
  views: number;
  submissions: number;
  conversion_rate: number;
  created_at: string;
}

export default function LandingPagesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: async () => {
      const res = await fetch('/api/landing-pages');
      if (!res.ok) throw new Error('Failed to fetch landing pages');
      return res.json();
    },
  });

  const pages: LandingPage[] = data?.pages || [];

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lead_magnet: 'Lead Magnet',
      newsletter: 'Newsletter',
      product: 'Product',
      quiz: 'Quiz',
    };
    return labels[type] || type;
  };

  return (
    <PageContainer
      title="Landing Pages"
      description="Create and manage lead capture landing pages"
      actions={
        <Link href="/dashboard/leads/landing-pages/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Create Page</Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-elevated rounded w-1/2 mb-2" />
                <div className="h-4 bg-elevated rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
            <h3 className="text-h3 mb-2">No Landing Pages Yet</h3>
            <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
              Create beautiful landing pages for lead magnets, special offers,
              and email capture campaigns.
            </p>
            <Link href="/dashboard/leads/landing-pages/new">
              <Button variant="primary">
                <Plus className="mr-2 h-4 w-4" /> Create Landing Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{page.name}</h3>
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      /landing/{page.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{getTypeLabel(page.type)}</Badge>
                    <Badge variant={page.status === 'active' ? 'success' : 'secondary'}>
                      {page.status}
                    </Badge>
                  </div>
                </div>

                <p className="text-body-sm text-[var(--color-text-secondary)] mb-4 line-clamp-2">
                  {page.headline}
                </p>

                <div className="flex gap-4 text-body-sm text-[var(--color-text-tertiary)] mb-4">
                  <span>{page.views} views</span>
                  <span>{page.submissions} submissions</span>
                  <span>{Math.round(page.conversion_rate * 100)}% conversion</span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/leads/landing-pages/${page.id}/edit`}>
                    <Button variant="secondary" size="sm" leftIcon={<Edit className="h-3 w-3" />}>
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/landing/${page.slug}`} target="_blank">
                    <Button variant="ghost" size="sm" leftIcon={<Eye className="h-3 w-3" />}>
                      Preview
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
