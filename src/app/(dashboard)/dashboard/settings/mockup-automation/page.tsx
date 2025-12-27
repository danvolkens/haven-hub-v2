'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { api } from '@/lib/fetcher';
import {
  Settings,
  Zap,
  Image,
  Star,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { MockupAutomationSettings, MockupSceneTemplate } from '@/types/mockups';

export default function MockupAutomationPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch current settings
  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['mockup-automation-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/mockup-automation');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  // Fetch default templates
  const { data: defaultsData, isLoading: loadingDefaults } = useQuery({
    queryKey: ['mockup-default-templates'],
    queryFn: async () => {
      const res = await fetch('/api/mockups/templates/defaults');
      if (!res.ok) throw new Error('Failed to fetch defaults');
      return res.json();
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<MockupAutomationSettings>) => {
      const res = await fetch('/api/settings/mockup-automation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockup-automation-settings'] });
      toast('Settings updated', 'success');
    },
    onError: (error) => {
      toast(error.message, 'error');
    },
  });

  const settings: MockupAutomationSettings = settingsData?.settings || {
    auto_generate: false,
    use_defaults: true,
    max_per_quote: 5,
    notify_on_complete: true,
  };

  const defaultTemplates: MockupSceneTemplate[] = defaultsData?.templates || [];
  const isLoading = loadingSettings || loadingDefaults;

  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    try {
      const result = await api.post<{ success: boolean; synced: number; message: string }>(
        '/mockups/templates/sync'
      );
      toast(result.message || `Synced ${result.synced} templates`, 'success');
      queryClient.invalidateQueries({ queryKey: ['mockup-default-templates'] });
    } catch (error) {
      toast('Failed to sync templates', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggle = (key: keyof MockupAutomationSettings) => {
    const currentValue = settings[key];
    if (typeof currentValue === 'boolean') {
      updateSettingsMutation.mutate({ [key]: !currentValue });
    }
  };

  const handleMaxChange = (value: number) => {
    if (value >= 1 && value <= 20) {
      updateSettingsMutation.mutate({ max_per_quote: value });
    }
  };

  return (
    <PageContainer
      title="Mockup Automation"
      description="Configure automatic mockup generation when quotes are approved"
    >
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-tertiary)]" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-sage-pale p-2">
                  <Zap className="h-5 w-5 text-sage" />
                </div>
                <div className="flex-1">
                  <h3 className="text-h3">Auto-Generate Mockups</h3>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">
                    Automatically create mockups when you approve an asset
                  </p>
                </div>
                <button
                  onClick={() => handleToggle('auto_generate')}
                  disabled={updateSettingsMutation.isPending}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.auto_generate
                      ? 'bg-sage'
                      : 'bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      settings.auto_generate ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </CardHeader>
          </Card>

          {/* Settings (only show when enabled) */}
          {settings.auto_generate && (
            <>
              {/* Use Defaults */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-sage-pale p-2">
                      <Star className="h-5 w-5 text-sage" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-h3">Use Default Templates Only</h3>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">
                        When enabled, only templates marked as default will be used
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('use_defaults')}
                      disabled={updateSettingsMutation.isPending}
                      className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                        settings.use_defaults
                          ? 'bg-sage'
                          : 'bg-[var(--color-bg-tertiary)]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          settings.use_defaults ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </CardHeader>
              </Card>

              {/* Max Per Quote */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-sage-pale p-2">
                      <Image className="h-5 w-5 text-sage" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-h3">Maximum Mockups Per Quote</h3>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">
                        Limit the number of mockups generated per approved asset
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMaxChange(settings.max_per_quote - 1)}
                        disabled={settings.max_per_quote <= 1 || updateSettingsMutation.isPending}
                        className="w-8 h-8 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">
                        {settings.max_per_quote}
                      </span>
                      <button
                        onClick={() => handleMaxChange(settings.max_per_quote + 1)}
                        disabled={settings.max_per_quote >= 20 || updateSettingsMutation.isPending}
                        className="w-8 h-8 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-sage-pale p-2">
                      <Settings className="h-5 w-5 text-sage" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-h3">Notify on Completion</h3>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">
                        Show a notification when mockups are ready
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('notify_on_complete')}
                      disabled={updateSettingsMutation.isPending}
                      className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                        settings.notify_on_complete
                          ? 'bg-sage'
                          : 'bg-[var(--color-bg-tertiary)]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          settings.notify_on_complete ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </CardHeader>
              </Card>

              {/* Default Templates Preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-sage-pale p-2">
                        <Star className="h-5 w-5 text-sage" />
                      </div>
                      <div>
                        <h3 className="text-h3">Default Templates</h3>
                        <p className="text-body-sm text-[var(--color-text-secondary)]">
                          {defaultTemplates.length} template{defaultTemplates.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    </div>
                    <Link href="/dashboard/settings/mockups">
                      <Button variant="secondary" size="sm">
                        Manage
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {defaultTemplates.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-secondary)]">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No default templates selected</p>
                      <p className="text-xs mt-1">
                        Go to Mockup Templates to mark your favorites as default
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {defaultTemplates.slice(0, 10).map((template) => (
                        <div
                          key={template.id}
                          className="aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-secondary)] relative group"
                        >
                          {template.preview_url ? (
                            <img
                              src={template.preview_url}
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="h-6 w-6 text-[var(--color-text-tertiary)]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs px-2 text-center">
                              {template.name}
                            </span>
                          </div>
                          <div className="absolute top-1 right-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Sync Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-sage-pale p-2">
                  <RefreshCw className="h-5 w-5 text-sage" />
                </div>
                <div className="flex-1">
                  <h3 className="text-h3">Sync Templates</h3>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">
                    Pull latest templates from Dynamic Mockups
                  </p>
                </div>
                <Button
                  onClick={handleSyncTemplates}
                  isLoading={isSyncing}
                  variant="secondary"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
            <h4 className="font-medium mb-2">How it works</h4>
            <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
              <li>1. When you approve an asset in the Approval Queue, mockups are automatically generated</li>
              <li>2. Only templates marked as default are used (if enabled)</li>
              <li>3. Generated mockups respect your Operator Mode settings:</li>
              <li className="ml-4">- <strong>Supervised:</strong> Mockups go to Approval Queue for review</li>
              <li className="ml-4">- <strong>Assisted:</strong> Mockups are auto-saved to your library</li>
              <li className="ml-4">- <strong>Autopilot:</strong> Mockups are saved and attached to Shopify</li>
            </ul>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
