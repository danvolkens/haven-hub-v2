'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, Button } from '@/components/ui';
import { Megaphone, ExternalLink, RefreshCw, CheckCircle } from 'lucide-react';
import { api } from '@/lib/fetcher';
import { useToast } from '@/components/providers/toast-provider';

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  status: string;
}

interface Integration {
  provider: string;
  status: string;
  metadata: Record<string, unknown>;
}

export default function PinterestAdsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Check if Pinterest is connected
  const { data: integrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get<{ integrations: Integration[] }>('/integrations'),
  });

  const pinterestIntegration = integrationsData?.integrations?.find(
    (i) => i.provider === 'pinterest'
  );
  const isConnected = pinterestIntegration?.status === 'connected';

  // Fetch ad accounts if connected
  const { data: adAccountsData, refetch: refetchAdAccounts } = useQuery({
    queryKey: ['pinterest-ad-accounts'],
    queryFn: () => api.get<{ ad_accounts: AdAccount[] }>('/pinterest/ads/accounts'),
    enabled: isConnected,
  });

  const adAccounts = adAccountsData?.ad_accounts || [];

  const handleConnect = () => {
    if (!isConnected) {
      // Redirect to Pinterest OAuth
      window.location.href = '/api/integrations/pinterest/install';
    } else {
      // Refresh ad accounts
      setIsLoading(true);
      refetchAdAccounts().finally(() => setIsLoading(false));
    }
  };

  if (!isConnected) {
    return (
      <PageContainer
        title="Pinterest Ads"
        description="Create and manage Pinterest advertising campaigns"
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
            <h3 className="text-h3 mb-2">Pinterest Ads Manager</h3>
            <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
              Promote your top-performing pins to reach a wider audience.
              Connect your Pinterest Business account to get started.
            </p>
            <Button variant="primary" onClick={handleConnect}>
              Connect Pinterest <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Pinterest Ads"
      description="Create and manage Pinterest advertising campaigns"
      actions={
        <Button variant="secondary" onClick={handleConnect} isLoading={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Accounts
        </Button>
      }
    >
      {adAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="h-12 w-12 text-sage mb-4" />
            <h3 className="text-h3 mb-2">Pinterest Connected</h3>
            <p className="text-body text-[var(--color-text-secondary)] max-w-md mb-6">
              Your Pinterest account is connected, but no ad accounts were found.
              You may need to set up a Pinterest Business account with ads access.
            </p>
            <a
              href="https://ads.pinterest.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">
                Open Pinterest Ads Manager <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {adAccounts.map((account) => (
            <Card key={account.id}>
              <CardHeader
                title={account.name}
                description={`ID: ${account.id}`}
              />
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-body-sm text-[var(--color-text-secondary)]">
                      Currency: {account.currency}
                    </span>
                    <span
                      className={`ml-4 inline-flex items-center px-2 py-1 rounded-full text-caption ${
                        account.status === 'ACTIVE'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>
                  <a
                    href={`https://ads.pinterest.com/advertiser/${account.id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
