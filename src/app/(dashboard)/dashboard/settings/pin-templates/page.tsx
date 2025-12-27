'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Copy,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinCopyTemplate {
  id: string;
  name: string;
  variant: string;
  title_template: string;
  description_template: string;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  mood: string | null;
  is_active: boolean;
  times_used: number;
  avg_engagement_rate: number | null;
  created_at: string;
}

const COLLECTIONS = [
  { value: '', label: 'All Collections' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'wholeness', label: 'Wholeness' },
  { value: 'growth', label: 'Growth' },
];

const VARIABLES = [
  { name: '{quote}', description: 'The quote text' },
  { name: '{collection}', description: 'Collection name (Grounding, Wholeness, Growth)' },
  { name: '{mood}', description: 'Mood name (calm, warm, etc.)' },
  { name: '{product_link}', description: 'Product URL' },
  { name: '{shop_name}', description: 'Your shop name' },
];

export default function PinTemplatesPage() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<PinCopyTemplate | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title_template: '',
    description_template: '',
    collection: '' as string,
    mood: '',
  });

  // Fetch templates
  const { data, isLoading } = useQuery({
    queryKey: ['pin-copy-templates'],
    queryFn: async () => {
      const res = await fetch('/api/copy-templates?active=false');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  const templates: PinCopyTemplate[] = data?.templates || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      const res = await fetch('/api/copy-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          collection: template.collection || null,
          mood: template.mood || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-copy-templates'] });
      setNewTemplate({ name: '', title_template: '', description_template: '', collection: '', mood: '' });
      setShowNewForm(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (template: PinCopyTemplate) => {
      const res = await fetch('/api/copy-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          name: template.name,
          title_template: template.title_template,
          description_template: template.description_template,
          collection: template.collection || null,
          mood: template.mood || null,
          is_active: template.is_active,
        }),
      });
      if (!res.ok) throw new Error('Failed to update template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-copy-templates'] });
      setEditingTemplate(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/copy-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-copy-templates'] });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch('/api/copy-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      });
      if (!res.ok) throw new Error('Failed to toggle template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pin-copy-templates'] });
    },
  });

  const previewTemplate = (title: string, description: string) => {
    const sample = {
      quote: 'Breathe deeply and let go',
      collection: 'Grounding',
      mood: 'calm',
      product_link: 'https://shop.com/products/sample',
      shop_name: 'Haven & Hold',
    };

    let previewTitle = title;
    let previewDesc = description;

    Object.entries(sample).forEach(([key, value]) => {
      previewTitle = previewTitle.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      previewDesc = previewDesc.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    return { title: previewTitle, description: previewDesc };
  };

  return (
    <PageContainer
      title="Pin Copy Templates"
      description="Create reusable templates for Pinterest pin titles and descriptions"
    >
      {/* Variables Reference */}
      <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Available Variables</h3>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map((v) => (
                <Badge key={v.name} variant="secondary" className="bg-white">
                  <code className="text-blue-700">{v.name}</code>
                  <span className="ml-2 text-muted-foreground text-xs">{v.description}</span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Add New Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Your Templates</h2>
        <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* New Template Form */}
      {showNewForm && (
        <Card className="p-6 mb-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Template
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., Product Focused"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Collection (optional)</Label>
                <select
                  value={newTemplate.collection}
                  onChange={(e) => setNewTemplate({ ...newTemplate, collection: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                >
                  {COLLECTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Mood (optional)</Label>
                <Input
                  value={newTemplate.mood}
                  onChange={(e) => setNewTemplate({ ...newTemplate, mood: e.target.value })}
                  placeholder="e.g., calm, warm"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Title Template</Label>
              <Input
                value={newTemplate.title_template}
                onChange={(e) => setNewTemplate({ ...newTemplate, title_template: e.target.value })}
                placeholder="e.g., {quote} | {shop_name}"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description Template</Label>
              <textarea
                value={newTemplate.description_template}
                onChange={(e) => setNewTemplate({ ...newTemplate, description_template: e.target.value })}
                placeholder="e.g., Find peace with this {mood} {collection} print. Perfect for your space. Shop now at {shop_name}."
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
              />
            </div>

            {/* Preview */}
            {newTemplate.title_template && newTemplate.description_template && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  Preview
                </div>
                <p className="font-medium">{previewTemplate(newTemplate.title_template, newTemplate.description_template).title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewTemplate(newTemplate.title_template, newTemplate.description_template).description}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newTemplate)}
                disabled={!newTemplate.name || !newTemplate.title_template || !newTemplate.description_template || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No templates yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first pin copy template to use when bulk creating pins.
          </p>
          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id} className={cn('p-4', !template.is_active && 'opacity-60')}>
              {editingTemplate?.id === template.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Template Name</Label>
                      <Input
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Collection</Label>
                      <select
                        value={editingTemplate.collection || ''}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          collection: e.target.value as 'grounding' | 'wholeness' | 'growth' | null || null
                        })}
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                      >
                        {COLLECTIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Mood</Label>
                      <Input
                        value={editingTemplate.mood || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, mood: e.target.value || null })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Title Template</Label>
                    <Input
                      value={editingTemplate.title_template}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title_template: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Description Template</Label>
                    <textarea
                      value={editingTemplate.description_template}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, description_template: e.target.value })}
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setEditingTemplate(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={() => updateMutation.mutate(editingTemplate)} disabled={updateMutation.isPending}>
                      <Check className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{template.name}</h3>
                      {template.collection && (
                        <Badge variant="secondary" className="capitalize">{template.collection}</Badge>
                      )}
                      {template.mood && (
                        <Badge variant="outline">{template.mood}</Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActiveMutation.mutate({ id: template.id, is_active: !template.is_active })}
                        title={template.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {template.is_active ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(template)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this template?')) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <FileText className="h-3 w-3" />
                      Title
                    </div>
                    <p className="text-sm font-mono">{template.title_template}</p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 mb-1">
                      <Copy className="h-3 w-3" />
                      Description
                    </div>
                    <p className="text-sm font-mono">{template.description_template}</p>
                  </div>

                  {template.times_used > 0 && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Used {template.times_used} times
                      {template.avg_engagement_rate !== null && (
                        <> &bull; {(template.avg_engagement_rate * 100).toFixed(1)}% avg engagement</>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
