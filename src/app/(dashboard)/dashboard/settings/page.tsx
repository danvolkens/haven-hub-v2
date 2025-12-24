'use client';

import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { Database, Shield, ArrowRight } from 'lucide-react';

const settingsSections = [
  {
    title: 'Data Export',
    description: 'Export your data in various formats',
    icon: Database,
    href: '/dashboard/settings/data',
  },
  {
    title: 'Operator Mode',
    description: 'Configure automation and approval settings',
    icon: Shield,
    href: '/dashboard/setup',
  },
];

export default function SettingsPage() {
  return (
    <PageContainer
      title="Settings"
      description="Manage your account and application settings"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-sage-pale p-2">
                    <Icon className="h-5 w-5 text-sage" />
                  </div>
                  <div>
                    <h3 className="text-h3">{section.title}</h3>
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={section.href}>
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
