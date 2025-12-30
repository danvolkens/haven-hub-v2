'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Select,
  Switch,
} from '@/components/ui';
import {
  Instagram,
  Link as LinkIcon,
  Unlink,
  Check,
  X,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  Globe,
  Clock,
  Hash,
  ShoppingBag,
  Settings2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/components/providers/toast-provider';

// ============================================================================
// Types
// ============================================================================

interface InstagramConnection {
  status: 'connected' | 'disconnected' | 'error';
  account_name?: string;
  account_id?: string;
  profile_picture_url?: string;
  followers_count?: number;
  connected_at?: string;
  token_expires_at?: string;
  last_error?: string;
}

interface InstagramSettings {
  creatomate_api_key?: string;
  pexels_api_key?: string;
  cross_post_facebook: boolean;
  cross_post_types: string[];
  default_timezone: string;
  hashtag_location: 'caption' | 'first_comment';
  auto_shopping_tags: boolean;
  operator_mode: 'supervised' | 'assisted' | 'autopilot';
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

// ============================================================================
// Main Component
// ============================================================================

export default function InstagramSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showCreatomateKey, setShowCreatomateKey] = useState(false);
  const [showPexelsKey, setShowPexelsKey] = useState(false);

  // Fetch connection status
  const { data: connection, isLoading: loadingConnection } = useQuery({
    queryKey: ['instagram-connection'],
    queryFn: () => fetcher<InstagramConnection>('/api/instagram/connection'),
  });

  // Fetch settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['instagram-settings'],
    queryFn: () => fetcher<InstagramSettings>('/api/instagram/settings'),
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<InstagramSettings>) => {
      const res = await fetch('/api/instagram/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-settings'] });
      toast('Settings saved', 'success');
    },
    onError: () => {
      toast('Failed to save settings', 'error');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/disconnect', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-connection'] });
      toast('Instagram disconnected', 'success');
    },
  });

  // Test connection mutations
  const testCreatomateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/test-creatomate', { method: 'POST' });
      if (!res.ok) throw new Error('Connection failed');
      return res.json();
    },
    onSuccess: () => {
      toast('Creatomate connected successfully', 'success');
    },
    onError: () => {
      toast('Creatomate connection failed', 'error');
    },
  });

  const testPexelsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/test-pexels', { method: 'POST' });
      if (!res.ok) throw new Error('Connection failed');
      return res.json();
    },
    onSuccess: () => {
      toast('Pexels connected successfully', 'success');
    },
    onError: () => {
      toast('Pexels connection failed', 'error');
    },
  });

  // Fetch seed status
  const { data: seedStatus, isLoading: seedLoading, refetch: refetchSeed } = useQuery({
    queryKey: ['instagram-seed-status'],
    queryFn: () => fetcher<{
      templates: { existing: number; expected: number };
      hashtags: { existing: number; expected: number };
      is_complete: boolean;
    }>('/api/instagram/seed'),
  });

  // Seed content mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to seed content');
      return res.json();
    },
    onSuccess: (data) => {
      toast(data.message || 'Instagram templates and hashtags seeded successfully', 'success');
      refetchSeed();
    },
    onError: () => {
      toast('Failed to seed Instagram content', 'error');
    },
  });

  const isConnected = connection?.status === 'connected';
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/creatomate`
    : '/api/webhooks/creatomate';

  const operatorModeOptions = [
    { value: 'supervised', label: 'Supervised', description: 'All posts require manual review before publishing' },
    { value: 'assisted', label: 'Assisted', description: 'Get suggestions but still approve each post' },
    { value: 'autopilot', label: 'Autopilot', description: 'Posts are published automatically at scheduled times' },
  ];

  return (
    <PageContainer title="Instagram Settings">
      <div className="space-y-6 max-w-3xl">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Instagram className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-semibold">Instagram Connection</h2>
                <p className="text-sm text-muted-foreground">
                  Connect your Instagram Business account
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingConnection ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : isConnected && connection ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {connection.profile_picture_url && (
                    <img
                      src={connection.profile_picture_url}
                      alt={connection.account_name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">@{connection.account_name}</span>
                      <Badge variant="success" size="sm">
                        <Check className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connection.followers_count?.toLocaleString()} followers
                    </p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Connected: {connection.connected_at
                      ? format(new Date(connection.connected_at), 'MMM d, yyyy')
                      : 'Unknown'}
                  </p>
                  {connection.token_expires_at && (
                    <p>
                      Token expires: {format(new Date(connection.token_expires_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>

                <Button
                  variant="destructive"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="mr-2 h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {connection?.last_error && (
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    {connection.last_error}
                  </div>
                )}
                <a
                  href="/api/integrations/instagram/install"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <Instagram className="h-5 w-5" />
                  Connect Instagram
                </a>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll be redirected to Facebook to authorize access to your Instagram Business account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creatomate Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-semibold">Creatomate</h2>
                <p className="text-sm text-muted-foreground">
                  Video rendering service for quote reveal reels
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="creatomate-key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="creatomate-key"
                    type={showCreatomateKey ? 'text' : 'password'}
                    value={settings?.creatomate_api_key || ''}
                    onChange={(e) =>
                      updateSettingsMutation.mutate({ creatomate_api_key: e.target.value })
                    }
                    placeholder="Enter API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatomateKey(!showCreatomateKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCreatomateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => testCreatomateMutation.mutate()}
                  disabled={testCreatomateMutation.isPending || !settings?.creatomate_api_key}
                >
                  {testCreatomateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="bg-muted" />
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast('Webhook URL copied', 'success');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Add this URL to your Creatomate webhook settings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pexels Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-semibold">Pexels</h2>
                <p className="text-sm text-muted-foreground">
                  Stock footage for video backgrounds
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="pexels-key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="pexels-key"
                    type={showPexelsKey ? 'text' : 'password'}
                    value={settings?.pexels_api_key || ''}
                    onChange={(e) =>
                      updateSettingsMutation.mutate({ pexels_api_key: e.target.value })
                    }
                    placeholder="Enter API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPexelsKey(!showPexelsKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPexelsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => testPexelsMutation.mutate()}
                  disabled={testPexelsMutation.isPending || !settings?.pexels_api_key}
                >
                  {testPexelsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cross-Posting Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-semibold">Cross-Posting</h2>
                <p className="text-sm text-muted-foreground">
                  Automatically share to Facebook
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto cross-post to Facebook</Label>
                <p className="text-sm text-muted-foreground">
                  Share Instagram posts to your linked Facebook page
                </p>
              </div>
              <Switch
                checked={settings?.cross_post_facebook || false}
                onChange={(e) =>
                  updateSettingsMutation.mutate({ cross_post_facebook: e.target.checked })
                }
              />
            </div>

            {settings?.cross_post_facebook && (
              <div>
                <Label>Content types to cross-post</Label>
                <div className="flex gap-4 mt-2">
                  {['feed', 'reel', 'story'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings?.cross_post_types?.includes(type) || false}
                        onChange={(e) => {
                          const current = settings?.cross_post_types || [];
                          const updated = e.target.checked
                            ? [...current, type]
                            : current.filter((t) => t !== type);
                          updateSettingsMutation.mutate({ cross_post_types: updated });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-semibold">Defaults</h2>
                <p className="text-sm text-muted-foreground">
                  Default settings for new posts
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Timezone</Label>
              <Select
                value={settings?.default_timezone || 'America/New_York'}
                onChange={(value) =>
                  updateSettingsMutation.mutate({ default_timezone: value as string })
                }
                className="mt-1"
                options={[
                  { value: 'America/New_York', label: 'Eastern Time (ET)' },
                  { value: 'America/Chicago', label: 'Central Time (CT)' },
                  { value: 'America/Denver', label: 'Mountain Time (MT)' },
                  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                  { value: 'Europe/London', label: 'London (GMT)' },
                  { value: 'Europe/Paris', label: 'Paris (CET)' },
                ]}
              />
            </div>

            <div>
              <Label>Hashtag location</Label>
              <Select
                value={settings?.hashtag_location || 'first_comment'}
                onChange={(value) =>
                  updateSettingsMutation.mutate({ hashtag_location: value as 'caption' | 'first_comment' })
                }
                className="mt-1"
                options={[
                  { value: 'first_comment', label: 'First comment (recommended)' },
                  { value: 'caption', label: 'In caption' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-add shopping tags</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically tag products from linked quotes
                </p>
              </div>
              <Switch
                checked={settings?.auto_shopping_tags || false}
                onChange={(e) =>
                  updateSettingsMutation.mutate({ auto_shopping_tags: e.target.checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Operator Mode */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <div>
                <h2 className="text-lg font-semibold">Operator Mode</h2>
                <p className="text-sm text-muted-foreground">
                  Control how much automation is enabled
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operatorModeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    settings?.operator_mode === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="operator-mode"
                    value={option.value}
                    checked={settings?.operator_mode === option.value}
                    onChange={() =>
                      updateSettingsMutation.mutate({ operator_mode: option.value as InstagramSettings['operator_mode'] })
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Caption Templates & Hashtags Seed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  seedStatus?.is_complete
                    ? 'bg-green-100 text-green-600'
                    : 'bg-yellow-100 text-yellow-600'
                )}>
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Caption Templates & Hashtags</h3>
                  <p className="text-sm text-muted-foreground">
                    Pre-built Haven & Hold content for Instagram
                  </p>
                </div>
              </div>
              {seedStatus?.is_complete && (
                <Badge variant="success" size="sm">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {seedLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking status...
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Caption Templates
                    </span>
                    <span className={cn(
                      (seedStatus?.templates?.existing ?? 0) >= (seedStatus?.templates?.expected ?? 0)
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    )}>
                      {seedStatus?.templates?.existing || 0} / {seedStatus?.templates?.expected || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Hashtag Groups
                    </span>
                    <span className={cn(
                      (seedStatus?.hashtags?.existing ?? 0) >= (seedStatus?.hashtags?.expected ?? 0)
                        ? 'text-green-600'
                        : 'text-yellow-600'
                    )}>
                      {seedStatus?.hashtags?.existing || 0} / {seedStatus?.hashtags?.expected || 0}
                    </span>
                  </div>
                </div>

                {!seedStatus?.is_complete && (
                  <Button
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                    className="w-full"
                  >
                    {seedMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Seeding Content...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Seed Templates & Hashtags
                      </>
                    )}
                  </Button>
                )}

                {seedStatus?.is_complete && (
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    All Instagram content templates are ready
                  </p>
                )}

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Includes:</strong> 17 caption templates (feed, reels, stories, carousels)
                    organized by content pillar, plus 15 hashtag groups with tiered reach
                    (brand → mega → large → niche).
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
