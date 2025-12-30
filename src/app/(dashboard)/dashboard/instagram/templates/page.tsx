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
  Select,
  Input,
} from '@/components/ui';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Image,
  Video,
  Layers,
  Film,
  Hash,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
} from 'lucide-react';
import { useToast } from '@/components/providers/toast-provider';

// ============================================================================
// Types
// ============================================================================

interface CaptionTemplate {
  id: string;
  name: string;
  template_type: 'feed' | 'reel' | 'carousel' | 'story';
  content_pillar: 'product_showcase' | 'brand_story' | 'educational' | 'community';
  collection: string | null;
  caption_template: string;
  caption_formula: string | null;
  preferred_days: number[] | null;
  is_active: boolean;
  is_default?: boolean;
  usage_count?: number;
  created_at?: string;
}

// ============================================================================
// Constants
// ============================================================================

const POST_TYPES = [
  { value: 'feed', label: 'Feed Post', icon: Image },
  { value: 'reel', label: 'Reel', icon: Video },
  { value: 'carousel', label: 'Carousel', icon: Layers },
  { value: 'story', label: 'Story', icon: Film },
];

const CONTENT_PILLARS = [
  { value: 'product_showcase', label: 'Product Showcase' },
  { value: 'brand_story', label: 'Brand Story' },
  { value: 'educational', label: 'Educational' },
  { value: 'community', label: 'Community' },
];

const COLLECTIONS = [
  { value: 'general', label: 'General' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'wholeness', label: 'Wholeness' },
  { value: 'growth', label: 'Growth' },
];

const CAPTION_FORMULAS = [
  { value: 'single_quote', label: 'Single Quote' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'collection_highlight', label: 'Collection Highlight' },
  { value: 'behind_quote', label: 'Behind the Quote' },
  { value: 'educational_value', label: 'Educational Value' },
  { value: 'ugc_feature', label: 'UGC Feature' },
];

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function InstagramTemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filter state
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPillar, setFilterPillar] = useState<string>('all');

  // Edit/Create modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CaptionTemplate | null>(null);

  // Expanded template state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch all templates
  const { data: templates = [], isLoading } = useQuery<CaptionTemplate[]>({
    queryKey: ['instagram-templates-all'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/templates');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/instagram/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-templates-all'] });
      toast('Template deleted', 'success');
    },
    onError: () => {
      toast('Failed to delete template', 'error');
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (template: Partial<CaptionTemplate>) => {
      const isUpdate = !!template.id;
      const res = await fetch(
        isUpdate ? `/api/instagram/templates/${template.id}` : '/api/instagram/templates',
        {
          method: isUpdate ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template),
        }
      );
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-templates-all'] });
      toast(editingTemplate?.id ? 'Template updated' : 'Template created', 'success');
      setIsEditing(false);
      setEditingTemplate(null);
    },
    onError: () => {
      toast('Failed to save template', 'error');
    },
  });

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (filterType !== 'all' && t.template_type !== filterType) return false;
    if (filterPillar !== 'all' && t.content_pillar !== filterPillar) return false;
    return true;
  });

  // Group templates by content pillar
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const pillar = template.content_pillar;
    if (!acc[pillar]) acc[pillar] = [];
    acc[pillar].push(template);
    return acc;
  }, {} as Record<string, CaptionTemplate[]>);

  const getTypeIcon = (type: string) => {
    const found = POST_TYPES.find(t => t.value === type);
    return found?.icon || FileText;
  };

  const getPillarLabel = (pillar: string) => {
    return CONTENT_PILLARS.find(p => p.value === pillar)?.label || pillar;
  };

  const handleEdit = (template: CaptionTemplate) => {
    setEditingTemplate(template);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setEditingTemplate({
      id: '',
      name: '',
      template_type: 'feed',
      content_pillar: 'product_showcase',
      collection: 'general',
      caption_template: '',
      caption_formula: 'single_quote',
      preferred_days: [],
      is_active: true,
    });
    setIsEditing(true);
  };

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    toast('Caption copied to clipboard', 'success');
  };

  return (
    <PageContainer title="Caption Templates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Caption Templates</h2>
            <p className="text-sm text-muted-foreground">
              Manage your Instagram caption templates for quick post creation
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Post Type:</span>
                <Select
                  value={filterType}
                  onChange={value => setFilterType(value as string)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    ...POST_TYPES.map(t => ({ value: t.value, label: t.label })),
                  ]}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Content Pillar:</span>
                <Select
                  value={filterPillar}
                  onChange={value => setFilterPillar(value as string)}
                  options={[
                    { value: 'all', label: 'All Pillars' },
                    ...CONTENT_PILLARS,
                  ]}
                  className="w-48"
                />
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No templates found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {templates.length === 0
                  ? 'Get started by seeding templates or creating your own.'
                  : 'Try adjusting your filters.'}
              </p>
              {templates.length === 0 && (
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([pillar, pillarTemplates]) => (
              <div key={pillar}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {getPillarLabel(pillar)}
                  <Badge variant="secondary" size="sm">
                    {pillarTemplates.length}
                  </Badge>
                </h3>
                <div className="space-y-3">
                  {pillarTemplates.map(template => {
                    const TypeIcon = getTypeIcon(template.template_type);
                    const isExpanded = expandedId === template.id;

                    return (
                      <Card key={template.id} className="overflow-hidden">
                        <div
                          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : template.id)}
                        >
                          <div className="w-10 h-10 rounded-lg bg-sage/10 flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="h-5 w-5 text-sage" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{template.name}</h4>
                              {template.is_default && (
                                <Badge variant="secondary" size="sm">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {template.caption_template.substring(0, 80)}...
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" size="sm">
                              {POST_TYPES.find(t => t.value === template.template_type)?.label}
                            </Badge>
                            {template.collection && template.collection !== 'general' && (
                              <Badge variant="outline" size="sm" className="capitalize">
                                {template.collection}
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-muted/30 p-4 space-y-4">
                            {/* Caption Preview */}
                            <div>
                              <label className="text-sm font-medium mb-2 block">Caption Template</label>
                              <div className="bg-surface border rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {template.caption_template}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Formula:</span>
                                <p className="font-medium">
                                  {CAPTION_FORMULAS.find(f => f.value === template.caption_formula)?.label || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Collection:</span>
                                <p className="font-medium capitalize">{template.collection || 'General'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Preferred Days:</span>
                                <p className="font-medium">
                                  {template.preferred_days?.length
                                    ? template.preferred_days.map(d => DAY_OPTIONS.find(o => o.value === d)?.label).join(', ')
                                    : 'Any'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Uses:</span>
                                <p className="font-medium">{template.usage_count || 0}</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyCaption(template.caption_template);
                                }}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(template);
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this template?')) {
                                    deleteMutation.mutate(template.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit/Create Modal */}
        {isEditing && editingTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {editingTemplate.id ? 'Edit Template' : 'Create Template'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingTemplate(null);
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Template Name</label>
                  <Input
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="e.g., Grounding Quote Showcase"
                  />
                </div>

                {/* Type & Pillar Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Post Type</label>
                    <Select
                      value={editingTemplate.template_type}
                      onChange={value => setEditingTemplate({ ...editingTemplate, template_type: value as any })}
                      options={POST_TYPES.map(t => ({ value: t.value, label: t.label }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Content Pillar</label>
                    <Select
                      value={editingTemplate.content_pillar}
                      onChange={value => setEditingTemplate({ ...editingTemplate, content_pillar: value as any })}
                      options={CONTENT_PILLARS}
                    />
                  </div>
                </div>

                {/* Collection & Formula Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Collection</label>
                    <Select
                      value={editingTemplate.collection || 'general'}
                      onChange={value => setEditingTemplate({ ...editingTemplate, collection: value as string })}
                      options={COLLECTIONS}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Caption Formula</label>
                    <Select
                      value={editingTemplate.caption_formula || 'single_quote'}
                      onChange={value => setEditingTemplate({ ...editingTemplate, caption_formula: value as string })}
                      options={CAPTION_FORMULAS}
                    />
                  </div>
                </div>

                {/* Caption Template */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Caption Template</label>
                  <textarea
                    value={editingTemplate.caption_template}
                    onChange={e => setEditingTemplate({ ...editingTemplate, caption_template: e.target.value })}
                    placeholder="Write your caption template...

Use variables like:
{{quote_text}} - The quote text
{{collection_name}} - Collection name (capitalized)
{{collection_tag}} - Collection as hashtag
{{product_link}} - Link placeholder"
                    className="w-full rounded-md border bg-surface px-3 py-2 text-sm resize-none font-mono"
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available variables: {`{{quote_text}}, {{collection_name}}, {{collection_tag}}, {{product_link}}`}
                  </p>
                </div>

                {/* Preferred Days */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Preferred Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map(day => {
                      const isSelected = editingTemplate.preferred_days?.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const current = editingTemplate.preferred_days || [];
                            const updated = isSelected
                              ? current.filter(d => d !== day.value)
                              : [...current, day.value].sort();
                            setEditingTemplate({ ...editingTemplate, preferred_days: updated });
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-sage text-white'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select days when this template is preferred for scheduling
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingTemplate(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate(editingTemplate)}
                    disabled={saveMutation.isPending || !editingTemplate.name || !editingTemplate.caption_template}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {editingTemplate.id ? 'Update' : 'Create'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
