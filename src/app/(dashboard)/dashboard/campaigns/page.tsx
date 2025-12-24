'use client';

import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { Megaphone, Ticket, Calendar, ArrowRight } from 'lucide-react';

const features = [
  {
    title: 'Coupons',
    description: 'Create and manage discount codes and promotions',
    icon: Ticket,
    href: '/dashboard/campaigns/coupons',
  },
  {
    title: 'Calendar',
    description: 'View and schedule campaign activities',
    icon: Calendar,
    href: '/dashboard/calendar',
  },
];

export default function CampaignsPage() {
  return (
    <PageContainer
      title="Campaigns"
      description="Manage marketing campaigns and promotions"
    >
      <div className="grid gap-6 md:grid-cols-2">
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
