'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, Tag, Zap } from 'lucide-react';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: 'New Pin',
      icon: PlusCircle,
      onClick: () => router.push('/dashboard/pins/new'),
      color: 'text-red-600',
    },
    {
      label: 'New Campaign',
      icon: Zap,
      onClick: () => router.push('/dashboard/campaigns/new'),
      color: 'text-purple-600',
    },
    {
      label: 'Create Coupon',
      icon: Tag,
      onClick: () => router.push('/dashboard/campaigns/coupons'),
      color: 'text-green-600',
    },
    {
      label: 'View Calendar',
      icon: Calendar,
      onClick: () => router.push('/dashboard/calendar'),
      color: 'text-blue-600',
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            className="h-auto py-3 flex-col gap-1"
            onClick={action.onClick}
          >
            <action.icon className={`h-5 w-5 ${action.color}`} />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
