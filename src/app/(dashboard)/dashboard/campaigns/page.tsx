'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { Megaphone, Ticket, Calendar, ArrowRight, Plus, X } from 'lucide-react';

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

const campaignTypes = [
  {
    id: 'pinterest',
    title: 'Pinterest Campaign',
    description: 'Schedule pins and track performance',
    href: '/dashboard/campaigns/new?type=pinterest',
  },
  {
    id: 'email',
    title: 'Email Campaign',
    description: 'Send targeted emails via Klaviyo',
    href: '/dashboard/campaigns/new?type=email',
  },
  {
    id: 'coupon',
    title: 'Coupon Campaign',
    description: 'Create discount codes for promotions',
    href: '/dashboard/campaigns/new?type=coupon',
  },
];

export default function CampaignsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <PageContainer
      title="Campaigns"
      description="Manage marketing campaigns and promotions"
      actions={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      }
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

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h2">Create Campaign</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-body-sm text-[var(--color-text-secondary)] mb-6">
              Choose a campaign type to get started
            </p>
            <div className="space-y-3">
              {campaignTypes.map((type) => (
                <Link
                  key={type.id}
                  href={type.href}
                  className="block rounded-lg border p-4 hover:border-sage hover:bg-sage-pale/50 transition-colors cursor-pointer"
                  onClick={() => setShowCreateModal(false)}
                >
                  <h3 className="font-medium">{type.title}</h3>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">
                    {type.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
