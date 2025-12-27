'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { Database, Shield, ArrowRight, RefreshCw, Plug, Image, Store, Zap } from 'lucide-react';
import { useToast } from '@/components/providers/toast-provider';
import { api } from '@/lib/fetcher';

const settingsSections = [
  {
    title: 'Shopify',
    description: 'Manage your Shopify store connection, sync products and orders',
    icon: Store,
    href: '/dashboard/settings/shopify',
  },
  {
    title: 'Mockup Automation',
    description: 'Auto-generate mockups when quotes are approved',
    icon: Zap,
    href: '/dashboard/settings/mockup-automation',
  },
  {
    title: 'Data Export',
    description: 'Export your data in various formats',
    icon: Database,
    href: '/dashboard/settings/data',
  },
  {
    title: 'Integrations',
    description: 'Manage connected services and API keys',
    icon: Plug,
    href: '/dashboard/setup',
  },
  {
    title: 'Operator Mode',
    description: 'Configure automation and approval settings',
    icon: Shield,
    href: '/dashboard/setup',
  },
];

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    try {
      const result = await api.post<{ success: boolean; synced: number; message: string }>(
        '/mockups/templates/sync'
      );
      toast(result.message || `Synced ${result.synced} templates`, 'success');
    } catch (error) {
      toast('Failed to sync templates. Check your Dynamic Mockups connection.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

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

        {/* Dynamic Mockups Template Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-sage-pale p-2">
                <Image className="h-5 w-5 text-sage" />
              </div>
              <div>
                <h3 className="text-h3">Mockup Templates</h3>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  Sync templates from Dynamic Mockups
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncTemplates}
              isLoading={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                'Syncing...'
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Templates
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
