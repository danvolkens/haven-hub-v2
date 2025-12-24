'use client';

import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { Pin, BarChart3, Megaphone, FlaskConical, ArrowRight } from 'lucide-react';

const features = [
  {
    title: 'Analytics',
    description: 'Track pin performance, engagement rates, and top performers',
    icon: BarChart3,
    href: '/dashboard/pinterest/analytics',
  },
  {
    title: 'Ads Manager',
    description: 'Create and manage Pinterest advertising campaigns',
    icon: Megaphone,
    href: '/dashboard/pinterest/ads',
  },
  {
    title: 'A/B Tests',
    description: 'Test different copy variants to optimize engagement',
    icon: FlaskConical,
    href: '/dashboard/pinterest/tests',
  },
];

export default function PinterestPage() {
  return (
    <PageContainer
      title="Pinterest Manager"
      description="Manage your Pinterest presence and publishing"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-sage-pale p-2">
                    <Icon className="h-5 w-5 text-sage" />
                  </div>
                  <div>
                    <h3 className="text-h3">{feature.title}</h3>
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={feature.href}>
                  <Button variant="secondary" className="w-full">
                    Open <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
