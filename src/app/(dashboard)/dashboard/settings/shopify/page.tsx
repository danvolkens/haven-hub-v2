'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Users,
  ShoppingCart,
  Webhook,
  ArrowLeft,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';

interface WebhookInfo {
  topic: string;
  last_received_at: string | null;
  receive_count: number;
}

interface ShopifyStatus {
  connected: boolean;
  status: string;
  shop?: {
    domain: string;
    name: string;
  };
  connectedAt?: string;
  webhooks: WebhookInfo[];
  stats: {
    orders: number;
    customers: number;
    products: number;
    lastOrderAt: string | null;
  };
  syncSettings?: {
    autoSync: boolean;
    syncFrequency: string;
  };
}

const syncFrequencyOptions = [
  { value: 'manual', label: 'Manual Only' },
  { value: '1h', label: 'Every Hour' },
  { value: '6h', label: 'Every 6 Hours' },
  { value: '12h', label: 'Every 12 Hours' },
  { value: '24h', label: 'Once Daily' },
];

export default function ShopifySettingsPage() {
  const queryClient = useQueryClient();
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);

  const { data: status, isLoading } = useQuery<ShopifyStatus>({
    queryKey: ['shopify-status'],
    queryFn: () => fetch('/api/integrations/shopify/status').then((r) => r.json()),
  });

  const { data: webhookHealth } = useQuery({
    queryKey: ['shopify-webhooks'],
    queryFn: () => fetch('/api/integrations/shopify/webhooks').then((r) => r.json()),
    enabled: status?.connected,
  });

  const syncProductsMutation = useMutation({
    mutationFn: () => fetch('/api/integrations/shopify/sync-products', { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
    },
  });

  const syncOrdersMutation = useMutation({
    mutationFn: () => fetch('/api/integrations/shopify/sync-orders', { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
    },
  });

  const reregisterWebhooksMutation = useMutation({
    mutationFn: () => fetch('/api/integrations/shopify/webhooks', { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-webhooks'] });
    },
  });

  const updateSyncSettingsMutation = useMutation({
    mutationFn: (settings: { autoSync?: boolean; syncFrequency?: string }) =>
      fetch('/api/integrations/shopify/sync-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify-status'] });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: (topic: string) =>
      fetch('/api/integrations/shopify/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      }).then((r) => r.json()),
  });

  const handleSyncProducts = async () => {
    setSyncingProducts(true);
    try {
      await syncProductsMutation.mutateAsync();
    } finally {
      setSyncingProducts(false);
    }
  };

  const handleSyncOrders = async () => {
    setSyncingOrders(true);
    try {
      await syncOrdersMutation.mutateAsync();
    } finally {
      setSyncingOrders(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-h1">Shopify Settings</h1>
        </div>

        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <Store className="h-12 w-12 text-[var(--color-text-secondary)] mb-4" />
              <h2 className="text-h2 mb-2">Shopify Not Connected</h2>
              <p className="text-body text-[var(--color-text-secondary)] mb-6">
                Connect your Shopify store to sync products, orders, and customers.
              </p>
              <Link href="/dashboard/setup">
                <Button>Connect Shopify</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-h1">Shopify Settings</h1>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader
          title="Connection Status"
          description="Your Shopify store connection details"
          action={
            <Badge variant="success">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          }
        />
        <CardContent>
          <div className="space-y-2">
            <p className="text-body font-medium">{status.shop?.name}</p>
            <p className="text-body-sm text-[var(--color-text-secondary)]">{status.shop?.domain}</p>
            {status.connectedAt && (
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Connected on {new Date(status.connectedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-body-sm text-[var(--color-text-secondary)]">Orders Synced</span>
            </div>
            <p className="text-h2">{status.stats.orders.toLocaleString()}</p>
            {status.stats.lastOrderAt && (
              <p className="text-caption text-[var(--color-text-secondary)]">
                Last: {new Date(status.stats.lastOrderAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-body-sm text-[var(--color-text-secondary)]">Customers</span>
            </div>
            <p className="text-h2">{status.stats.customers.toLocaleString()}</p>
            <p className="text-caption text-[var(--color-text-secondary)]">From Shopify</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-body-sm text-[var(--color-text-secondary)]">Products</span>
            </div>
            <p className="text-h2">{status.stats.products.toLocaleString()}</p>
            <p className="text-caption text-[var(--color-text-secondary)]">Synced</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Sync */}
      <Card>
        <CardHeader
          title="Product Sync"
          description="Import and sync products from your Shopify store"
        />
        <CardContent>
          <div className="space-y-6">
            {/* Manual Import */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">Import Products from Shopify</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  Pull all products from Shopify into Haven Hub
                </p>
              </div>
              <Button
                onClick={handleSyncProducts}
                disabled={syncingProducts}
              >
                {syncingProducts ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Products
                  </>
                )}
              </Button>
            </div>
            {syncProductsMutation.data && (
              <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg text-body-sm">
                Imported: {syncProductsMutation.data.imported}, Updated: {syncProductsMutation.data.updated}
                {syncProductsMutation.data.errors?.length > 0 && (
                  <span className="text-[var(--color-error)] ml-2">
                    ({syncProductsMutation.data.errors.length} errors)
                  </span>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Auto Sync Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">Automatic Product Sync</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  Automatically sync products on a schedule
                </p>
              </div>
              <Switch
                checked={status.syncSettings?.autoSync ?? false}
                onChange={(e) => updateSyncSettingsMutation.mutate({ autoSync: e.target.checked })}
                disabled={updateSyncSettingsMutation.isPending}
              />
            </div>

            {/* Sync Frequency */}
            {status.syncSettings?.autoSync && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body font-medium">Sync Frequency</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">
                    How often to sync products from Shopify
                  </p>
                </div>
                <div className="w-48">
                  <Select
                    options={syncFrequencyOptions}
                    value={status.syncSettings?.syncFrequency ?? '24h'}
                    onChange={(value) => updateSyncSettingsMutation.mutate({ syncFrequency: value as string })}
                    disabled={updateSyncSettingsMutation.isPending}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Sync */}
      <Card>
        <CardHeader
          title="Order Sync"
          description="Import historical orders from Shopify for attribution and analytics"
        />
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body font-medium">Import Historical Orders</p>
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Sync all orders from Shopify (updates customers and attribution)
              </p>
            </div>
            <Button
              onClick={handleSyncOrders}
              disabled={syncingOrders}
            >
              {syncingOrders ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Orders
                </>
              )}
            </Button>
          </div>
          {syncOrdersMutation.data && (
            <div className="mt-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg text-body-sm">
              Imported: {syncOrdersMutation.data.imported}, Skipped: {syncOrdersMutation.data.skipped}
              {syncOrdersMutation.data.errors?.length > 0 && (
                <span className="text-[var(--color-error)] ml-2">
                  ({syncOrdersMutation.data.errors.length} errors)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Status */}
      <Card>
        <CardHeader
          title="Webhook Status"
          description="Real-time sync from Shopify (orders, customers, products)"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reregisterWebhooksMutation.mutate()}
              disabled={reregisterWebhooksMutation.isPending}
            >
              {reregisterWebhooksMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Re-register Webhooks'
              )}
            </Button>
          }
        />
        <CardContent>
          {/* Overall Health */}
          <div className="flex items-center gap-2 mb-4">
            {webhookHealth?.healthy ? (
              <>
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                <span className="text-body font-medium">All webhooks registered</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
                <span className="text-body font-medium">
                  {webhookHealth?.missingTopics?.length || 0} webhooks missing
                </span>
              </>
            )}
          </div>

          {/* Webhook List */}
          <div className="space-y-2">
            {status.webhooks.map((webhook) => (
              <div
                key={webhook.topic}
                className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-body-sm font-medium">{webhook.topic}</p>
                  {webhook.last_received_at ? (
                    <p className="text-caption text-[var(--color-text-secondary)]">
                      Last received: {new Date(webhook.last_received_at).toLocaleString()}
                      {webhook.receive_count > 0 && ` (${webhook.receive_count} total)`}
                    </p>
                  ) : (
                    <p className="text-caption text-[var(--color-text-secondary)]">No events received yet</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testWebhookMutation.mutate(webhook.topic)}
                    disabled={testWebhookMutation.isPending}
                    title="Send test webhook"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  {webhook.last_received_at ? (
                    <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  )}
                </div>
              </div>
            ))}

            {webhookHealth?.missingTopics?.map((topic: string) => (
              <div
                key={topic}
                className="flex items-center justify-between p-3 bg-[var(--color-error-bg)] rounded-lg border border-[var(--color-error)]"
              >
                <div>
                  <p className="text-body-sm font-medium text-[var(--color-error)]">{topic}</p>
                  <p className="text-caption text-[var(--color-error)]">Not registered</p>
                </div>
                <XCircle className="h-4 w-4 text-[var(--color-error)]" />
              </div>
            ))}
          </div>

          {reregisterWebhooksMutation.data && (
            <div className="mt-4 p-3 bg-[var(--color-success-bg)] rounded-lg text-body-sm text-[var(--color-success)]">
              Registered: {reregisterWebhooksMutation.data.registered?.join(', ') || 'None needed'}
              {reregisterWebhooksMutation.data.errors?.length > 0 && (
                <p className="text-[var(--color-error)] mt-1">
                  Errors: {reregisterWebhooksMutation.data.errors.length}
                </p>
              )}
            </div>
          )}

          {testWebhookMutation.data && (
            <div className={`mt-4 p-3 rounded-lg text-body-sm ${
              testWebhookMutation.data.success
                ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                : 'bg-[var(--color-error-bg)] text-[var(--color-error)]'
            }`}>
              {testWebhookMutation.data.success
                ? `Test webhook sent for ${testWebhookMutation.data.topic}`
                : `Failed to send test webhook: ${testWebhookMutation.data.error}`
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect */}
      <Card className="border-[var(--color-error)]">
        <CardHeader
          title="Danger Zone"
          description="Disconnect your Shopify store from Haven Hub"
        />
        <CardContent>
          <Button variant="destructive">Disconnect Shopify</Button>
        </CardContent>
      </Card>
    </div>
  );
}
