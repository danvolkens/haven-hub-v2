'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Star,
  Plus,
  Settings,
  Trash2,
  Eye,
  Clock,
  Hash,
  FileText,
  Tag,
  Users,
  RefreshCw,
  ChevronRight,
  X,
} from 'lucide-react';
import { api } from '@/lib/fetcher';

// Inlined types to avoid server-side import issues
type RuleType = 'hashtag' | 'text_contains' | 'product_tag' | 'template' | 'ugc';

interface AutoAddRule {
  type: RuleType;
  value: string | boolean;
}

interface StoryHighlight {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_asset_id: string | null;
  cover_url: string | null;
  display_order: number;
  auto_add_enabled: boolean;
  auto_add_rules: AutoAddRule[];
  max_stories: number;
  expiration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  story_count?: number;
}

interface HighlightTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_rules: AutoAddRule[];
  suggested_cover: string | null;
  display_order: number;
}

const ruleTypeIcons: Record<RuleType, typeof Hash> = {
  hashtag: Hash,
  text_contains: FileText,
  product_tag: Tag,
  template: FileText,
  ugc: Users,
};

const ruleTypeLabels: Record<RuleType, string> = {
  hashtag: 'Hashtag',
  text_contains: 'Text Contains',
  product_tag: 'Product Tag',
  template: 'Template',
  ugc: 'UGC',
};

export default function HighlightsPage() {
  const queryClient = useQueryClient();
  const [selectedHighlight, setSelectedHighlight] = useState<StoryHighlight | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newHighlight, setNewHighlight] = useState({
    name: '',
    slug: '',
    description: '',
    max_stories: 20,
    expiration_days: 90,
  });
  const [newRule, setNewRule] = useState<{ type: RuleType; value: string }>({
    type: 'hashtag',
    value: '',
  });

  // Fetch highlights
  const { data: highlights = [], isLoading } = useQuery<StoryHighlight[]>({
    queryKey: ['highlights'],
    queryFn: () => api.get<StoryHighlight[]>('/instagram/highlights', { action: 'list' }),
  });

  // Fetch templates
  const { data: templates = [] } = useQuery<HighlightTemplate[]>({
    queryKey: ['highlight-templates'],
    queryFn: () => api.get<HighlightTemplate[]>('/instagram/highlights', { action: 'templates' }),
  });

  // Initialize highlights
  const initializeMutation = useMutation({
    mutationFn: () => api.post('/instagram/highlights', { action: 'initialize' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });

  // Create highlight
  const createMutation = useMutation({
    mutationFn: (data: typeof newHighlight) =>
      api.post('/instagram/highlights', { action: 'create', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
      setIsCreating(false);
      setNewHighlight({
        name: '',
        slug: '',
        description: '',
        max_stories: 20,
        expiration_days: 90,
      });
    },
  });

  // Update highlight
  const updateMutation = useMutation({
    mutationFn: ({
      highlightId,
      updates,
    }: {
      highlightId: string;
      updates: Partial<StoryHighlight>;
    }) => api.patch('/instagram/highlights', { highlightId, updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });

  // Delete highlight
  const deleteMutation = useMutation({
    mutationFn: (highlightId: string) =>
      api.delete(`/instagram/highlights?highlightId=${highlightId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
      setSelectedHighlight(null);
    },
  });

  // Clean expired stories
  const cleanExpiredMutation = useMutation({
    mutationFn: () => api.post('/instagram/highlights', { action: 'clean-expired' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });

  const handleAddRule = () => {
    if (!selectedHighlight || !newRule.value) return;

    const updatedRules = [
      ...selectedHighlight.auto_add_rules,
      { type: newRule.type, value: newRule.value },
    ];

    updateMutation.mutate({
      highlightId: selectedHighlight.id,
      updates: { auto_add_rules: updatedRules },
    });

    setNewRule({ type: 'hashtag', value: '' });
    setSelectedHighlight({
      ...selectedHighlight,
      auto_add_rules: updatedRules,
    });
  };

  const handleRemoveRule = (index: number) => {
    if (!selectedHighlight) return;

    const updatedRules = selectedHighlight.auto_add_rules.filter((_, i) => i !== index);

    updateMutation.mutate({
      highlightId: selectedHighlight.id,
      updates: { auto_add_rules: updatedRules },
    });

    setSelectedHighlight({
      ...selectedHighlight,
      auto_add_rules: updatedRules,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Story Highlights</h1>
          <p className="text-muted-foreground">
            Manage your highlight categories and auto-add rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => cleanExpiredMutation.mutate()}
            disabled={cleanExpiredMutation.isPending}
          >
            <Clock className="mr-2 h-4 w-4" />
            Clean Expired
          </Button>
          {highlights.length === 0 && (
            <Button
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
            >
              <Star className="mr-2 h-4 w-4" />
              Initialize Defaults
            </Button>
          )}
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Highlight
          </Button>
        </div>
      </div>

      {/* Templates Reference */}
      {templates.length > 0 && (
        <Card>
          <CardHeader title="Default Templates Reference" />
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 border rounded-lg text-center space-y-2"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.default_rules.length} rules
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Highlights List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold">Your Highlights</h3>

          {highlights.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No highlights yet. Initialize defaults or create your own.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {highlights.map((highlight) => (
                <Card
                  key={highlight.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedHighlight?.id === highlight.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedHighlight(highlight)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            highlight.is_active
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Star className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{highlight.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {highlight.story_count || 0} stories
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Highlight Details */}
        <div className="lg:col-span-2">
          {isCreating ? (
            <Card>
              <CardHeader title="Create New Highlight" />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newHighlight.name}
                      onChange={(e) =>
                        setNewHighlight({
                          ...newHighlight,
                          name: e.target.value,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        })
                      }
                      placeholder="e.g., Quiz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={newHighlight.slug}
                      onChange={(e) =>
                        setNewHighlight({ ...newHighlight, slug: e.target.value })
                      }
                      placeholder="e.g., quiz"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newHighlight.description}
                    onChange={(e) =>
                      setNewHighlight({ ...newHighlight, description: e.target.value })
                    }
                    placeholder="Brief description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Stories</Label>
                    <Input
                      type="number"
                      value={newHighlight.max_stories}
                      onChange={(e) =>
                        setNewHighlight({
                          ...newHighlight,
                          max_stories: parseInt(e.target.value) || 20,
                        })
                      }
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration (days)</Label>
                    <Input
                      type="number"
                      value={newHighlight.expiration_days}
                      onChange={(e) =>
                        setNewHighlight({
                          ...newHighlight,
                          expiration_days: parseInt(e.target.value) || 90,
                        })
                      }
                      min={0}
                      max={365}
                    />
                    <p className="text-xs text-muted-foreground">0 = never expire</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate(newHighlight)}
                    disabled={!newHighlight.name || !newHighlight.slug || createMutation.isPending}
                  >
                    Create Highlight
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedHighlight ? (
            <div className="space-y-4">
              {/* Highlight Settings */}
              <Card>
                <CardHeader title={selectedHighlight.name}>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          highlightId: selectedHighlight.id,
                          updates: { is_active: !selectedHighlight.is_active },
                        })
                      }
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedHighlight.is_active ? 'Active' : 'Inactive'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this highlight?')) {
                          deleteMutation.mutate(selectedHighlight.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    {selectedHighlight.description || 'No description'}
                  </p>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {selectedHighlight.story_count || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Stories</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {selectedHighlight.max_stories}
                      </div>
                      <div className="text-sm text-muted-foreground">Max</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {selectedHighlight.expiration_days || '∞'}
                      </div>
                      <div className="text-sm text-muted-foreground">Days</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Auto-Add</div>
                      <div className="text-sm text-muted-foreground">
                        Automatically add matching stories
                      </div>
                    </div>
                    <Switch
                      checked={selectedHighlight.auto_add_enabled}
                      onChange={(e) =>
                        updateMutation.mutate({
                          highlightId: selectedHighlight.id,
                          updates: { auto_add_enabled: e.target.checked },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Auto-Add Rules */}
              <Card>
                <CardHeader title="Auto-Add Rules">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedHighlight.auto_add_rules.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No rules configured. Add rules to auto-add matching stories.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedHighlight.auto_add_rules.map((rule, index) => {
                        const Icon = ruleTypeIcons[rule.type];
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">
                                  {ruleTypeLabels[rule.type]}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {typeof rule.value === 'boolean'
                                    ? rule.value
                                      ? 'Enabled'
                                      : 'Disabled'
                                    : rule.value}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRule(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Rule Form */}
                  <div className="flex items-end gap-2 pt-4 border-t">
                    <div className="flex-1 space-y-2">
                      <Label>Rule Type</Label>
                      <select
                        className="w-full h-10 px-3 border rounded-md bg-background"
                        value={newRule.type}
                        onChange={(e) =>
                          setNewRule({ ...newRule, type: e.target.value as RuleType })
                        }
                      >
                        <option value="hashtag">Hashtag</option>
                        <option value="text_contains">Text Contains</option>
                        <option value="product_tag">Product Tag</option>
                        <option value="ugc">UGC</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Value</Label>
                      <Input
                        value={newRule.value}
                        onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                        placeholder={
                          newRule.type === 'hashtag'
                            ? '#quiz'
                            : newRule.type === 'text_contains'
                            ? 'quiz'
                            : 'true'
                        }
                      />
                    </div>
                    <Button onClick={handleAddRule} disabled={!newRule.value}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Select a Highlight</h3>
                <p className="text-muted-foreground">
                  Click on a highlight to view and edit its settings
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
