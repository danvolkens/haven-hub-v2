'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Select,
  Input,
} from '@/components/ui';
import {
  X,
  Image,
  Video,
  Film,
  Layers,
  Upload,
  Sparkles,
  Clock,
  Calendar,
  Hash,
  ShoppingBag,
  Tag,
  Facebook,
  Eye,
  Save,
  Send,
  RefreshCw,
  AlertCircle,
  Check,
  MessageSquare,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type PostType = 'feed' | 'reel' | 'story' | 'carousel';
type ContentPillar = 'inspiration' | 'education' | 'engagement' | 'promotion';

interface Asset {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

interface CaptionTemplate {
  id: string;
  name: string;
  template: string;
  content_pillar: ContentPillar;
}

interface HashtagGroup {
  id: string;
  name: string;
  hashtags: string[];
  selected: boolean;
}

interface Product {
  id: string;
  title: string;
  image_url?: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface OptimalSlot {
  datetime: string;
  engagement_rate: number;
  day_theme: string;
}

interface PostFormData {
  post_type: PostType;
  asset_id: string | null;
  asset?: Asset;
  caption: string;
  hashtags: string[];
  alt_text: string;
  product_id: string | null;
  campaign_id: string | null;
  scheduled_at: string;
  use_best_time: boolean;
  cross_post_facebook: boolean;
  hashtags_as_comment: boolean;
  thumbnail_index?: number;
}

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPost?: PostFormData & { id: string };
  preselectedQuoteId?: string;
  preselectedDate?: string;
}

// ============================================================================
// Constants
// ============================================================================

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType }[] = [
  { value: 'feed', label: 'Feed Post', icon: Image },
  { value: 'reel', label: 'Reel', icon: Video },
  { value: 'story', label: 'Story', icon: Film },
  { value: 'carousel', label: 'Carousel', icon: Layers },
];

const CHARACTER_LIMITS = {
  caption: 2200,
  hashtags: 30,
  alt_text: 500,
};

// ============================================================================
// Mock Data
// ============================================================================

const mockTemplates: CaptionTemplate[] = [
  {
    id: '1',
    name: 'Monday Motivation',
    template: '✨ {quote}\n\n{meaning}\n\nTap the link in bio to shop our collection!\n\n.',
    content_pillar: 'inspiration',
  },
  {
    id: '2',
    name: 'Quote of the Day',
    template: '📖 Today\'s wisdom:\n\n"{quote}"\n— {author}\n\n{cta}\n\n.',
    content_pillar: 'education',
  },
  {
    id: '3',
    name: 'Engagement Ask',
    template: '💭 What does this quote mean to you?\n\n"{quote}"\n\nShare your thoughts in the comments! ⬇️\n\n.',
    content_pillar: 'engagement',
  },
];

const mockHashtagGroups: HashtagGroup[] = [
  {
    id: '1',
    name: 'Brand Core',
    hashtags: ['#quotestoliveby', '#wisdomquotes', '#dailyinspiration'],
    selected: true,
  },
  {
    id: '2',
    name: 'Wellness',
    hashtags: ['#selfcare', '#mindfulness', '#positivevibes', '#healing'],
    selected: true,
  },
  {
    id: '3',
    name: 'Niche',
    hashtags: ['#quoteart', '#quoteoftheday', '#motivationalquotes'],
    selected: false,
  },
];

const mockProducts: Product[] = [
  { id: '1', title: 'Quote Print - 8x10' },
  { id: '2', title: 'Quote Mug' },
  { id: '3', title: 'Quote Canvas' },
];

const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Winter Collection' },
  { id: '2', name: 'Valentine\'s Day' },
  { id: '3', name: 'Spring Refresh' },
];

const mockOptimalSlots: OptimalSlot[] = [
  { datetime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), engagement_rate: 4.2, day_theme: 'Motivation Monday' },
  { datetime: new Date(Date.now() + 1000 * 60 * 60 * 27).toISOString(), engagement_rate: 3.8, day_theme: 'Educational' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function countHashtags(text: string): number {
  const matches = text.match(/#\w+/g);
  return matches ? matches.length : 0;
}

function extractHashtags(groups: HashtagGroup[]): string[] {
  return groups
    .filter((g) => g.selected)
    .flatMap((g) => g.hashtags);
}

// ============================================================================
// Main Component
// ============================================================================

export function NewPostModal({
  isOpen,
  onClose,
  existingPost,
  preselectedQuoteId,
  preselectedDate,
}: NewPostModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!existingPost;

  // Form state
  const [formData, setFormData] = useState<PostFormData>({
    post_type: 'feed',
    asset_id: null,
    caption: '',
    hashtags: [],
    alt_text: '',
    product_id: null,
    campaign_id: null,
    scheduled_at: preselectedDate || new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    use_best_time: true,
    cross_post_facebook: false,
    hashtags_as_comment: true,
    thumbnail_index: 1,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [manualCaptionEdit, setManualCaptionEdit] = useState(false);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>(mockHashtagGroups);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form with existing post data
  useEffect(() => {
    if (existingPost) {
      setFormData(existingPost);
      setManualCaptionEdit(true);
    }
  }, [existingPost]);

  // Fetch templates
  const { data: templates = mockTemplates } = useQuery({
    queryKey: ['caption-templates'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Fetch optimal slots
  const { data: optimalSlots = mockOptimalSlots } = useQuery({
    queryKey: ['optimal-slots'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/optimal-slots');
      if (!res.ok) throw new Error('Failed to fetch optimal slots');
      return res.json();
    },
  });

  // Fetch products
  const { data: products = mockProducts } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=50');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  // Fetch campaigns
  const { data: campaigns = mockCampaigns } = useQuery({
    queryKey: ['campaigns-list'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns?status=active');
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PostFormData & { status: 'draft' | 'scheduled' }) => {
      const url = isEditing ? `/api/instagram/posts/${existingPost.id}` : '/api/instagram/posts';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          hashtags: extractHashtags(hashtagGroups),
        }),
      });

      if (!res.ok) throw new Error('Failed to save post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-posts'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-calendar-posts'] });
      onClose();
    },
  });

  // Generate alt text mutation
  const generateAltTextMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instagram/generate-alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: formData.asset_id }),
      });
      if (!res.ok) throw new Error('Failed to generate alt text');
      return res.json();
    },
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, alt_text: data.alt_text }));
    },
  });

  // Apply template to caption
  const handleApplyTemplate = () => {
    const template = templates.find((t: CaptionTemplate) => t.id === selectedTemplate);
    if (template) {
      // In a real app, this would substitute variables like {quote}, {author}, {meaning}
      setFormData((prev) => ({ ...prev, caption: template.template }));
      setManualCaptionEdit(false);
    }
  };

  // Toggle hashtag group
  const handleToggleHashtagGroup = (groupId: string) => {
    setHashtagGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, selected: !g.selected } : g))
    );
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.asset_id && formData.post_type !== 'story') {
      newErrors.asset = 'Please select an asset';
    }

    if (!formData.caption.trim()) {
      newErrors.caption = 'Caption is required';
    } else if (formData.caption.length > CHARACTER_LIMITS.caption) {
      newErrors.caption = `Caption exceeds ${CHARACTER_LIMITS.caption} characters`;
    }

    const hashtagCount = countHashtags(formData.caption) + extractHashtags(hashtagGroups).length;
    if (hashtagCount > CHARACTER_LIMITS.hashtags) {
      newErrors.hashtags = `Too many hashtags (${hashtagCount}/${CHARACTER_LIMITS.hashtags})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = (status: 'draft' | 'scheduled') => {
    if (!validate()) return;

    saveMutation.mutate({
      ...formData,
      status,
    });
  };

  // Update scheduled time when using best time
  useEffect(() => {
    if (formData.use_best_time && optimalSlots.length > 0) {
      setFormData((prev) => ({
        ...prev,
        scheduled_at: optimalSlots[0].datetime,
      }));
    }
  }, [formData.use_best_time, optimalSlots]);

  if (!isOpen) return null;

  const hashtagCount = countHashtags(formData.caption) + extractHashtags(hashtagGroups).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface shadow-elevation-3">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-surface px-6 py-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Post' : 'Schedule New Post'}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Left Column - Media & Type */}
          <div className="space-y-6">
            {/* Post Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Post Type</label>
              <div className="grid grid-cols-4 gap-2">
                {POST_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.post_type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, post_type: type.value }))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-sage bg-sage/10'
                          : 'border-transparent bg-muted hover:border-sage/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-sage' : 'text-muted-foreground'}`} />
                      <span className={`text-xs ${isSelected ? 'font-medium text-sage' : ''}`}>
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asset Preview */}
            <div>
              <label className="block text-sm font-medium mb-2">Media</label>
              <div className="relative aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center overflow-hidden">
                {formData.asset?.url ? (
                  <>
                    {formData.asset.type === 'video' ? (
                      <video
                        src={formData.asset.url}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={formData.asset.url}
                        alt="Selected asset"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center p-6">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">No media selected</p>
                    <Button variant="secondary" size="sm">
                      Select Asset
                    </Button>
                  </div>
                )}
              </div>
              {errors.asset && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.asset}
                </p>
              )}
              {formData.asset && (
                <div className="flex gap-2 mt-2">
                  <Button variant="secondary" size="sm">
                    Change Asset
                  </Button>
                  {formData.asset.type === 'video' && (
                    <Button variant="secondary" size="sm">
                      Select Thumbnail
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Alt Text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Alt Text</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateAltTextMutation.mutate()}
                  disabled={generateAltTextMutation.isPending}
                >
                  <RefreshCw className={`mr-1 h-3 w-3 ${generateAltTextMutation.isPending ? 'animate-spin' : ''}`} />
                  Auto-generate
                </Button>
              </div>
              <textarea
                value={formData.alt_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, alt_text: e.target.value }))}
                placeholder="Describe the image for accessibility..."
                className="w-full rounded-md border bg-surface px-3 py-2 text-sm resize-none"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.alt_text.length}/{CHARACTER_LIMITS.alt_text}
              </p>
            </div>
          </div>

          {/* Right Column - Caption & Settings */}
          <div className="space-y-6">
            {/* Caption Template */}
            <div>
              <label className="block text-sm font-medium mb-2">Caption Template</label>
              <div className="flex gap-2">
                <Select
                  value={selectedTemplate}
                  onChange={(value) => setSelectedTemplate(value as string)}
                  options={[
                    { value: '', label: 'Select a template...' },
                    ...templates.map((t: CaptionTemplate) => ({ value: t.id, label: t.name })),
                  ]}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplate}
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Caption Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Caption</label>
                <button
                  type="button"
                  onClick={() => setManualCaptionEdit(!manualCaptionEdit)}
                  className="text-xs text-sage hover:underline"
                >
                  {manualCaptionEdit ? 'Lock Editing' : 'Edit Manually'}
                </button>
              </div>
              <textarea
                value={formData.caption}
                onChange={(e) => setFormData((prev) => ({ ...prev, caption: e.target.value }))}
                placeholder="Write your caption here..."
                className={`w-full rounded-md border bg-surface px-3 py-2 text-sm resize-none ${
                  !manualCaptionEdit ? 'bg-muted cursor-not-allowed' : ''
                } ${errors.caption ? 'border-error' : ''}`}
                rows={6}
                disabled={!manualCaptionEdit}
              />
              {errors.caption && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.caption}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formData.caption.length}/{CHARACTER_LIMITS.caption} characters
              </p>
            </div>

            {/* Hashtags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Hashtags</label>
                  <Badge
                    size="sm"
                    variant={hashtagCount > CHARACTER_LIMITS.hashtags ? 'error' : 'secondary'}
                  >
                    {hashtagCount}/{CHARACTER_LIMITS.hashtags}
                  </Badge>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={formData.hashtags_as_comment}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, hashtags_as_comment: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <MessageSquare className="h-3 w-3" />
                  Post as first comment
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtagGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleToggleHashtagGroup(group.id)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                      group.selected
                        ? 'bg-sage text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {group.selected && <Check className="inline h-3 w-3 mr-1" />}
                    {group.name} ({group.hashtags.length})
                  </button>
                ))}
              </div>
              {errors.hashtags && (
                <p className="text-sm text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.hashtags}
                </p>
              )}
            </div>

            {/* Shopping Tag */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Shopping Tag</label>
              </div>
              <Select
                value={formData.product_id || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, product_id: value as string || null }))}
                options={[
                  { value: '', label: 'No product tag' },
                  ...products.map((p: Product) => ({ value: p.id, label: p.title })),
                ]}
              />
            </div>

            {/* Campaign */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Campaign</label>
              </div>
              <Select
                value={formData.campaign_id || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, campaign_id: value as string || null }))}
                options={[
                  { value: '', label: 'No campaign' },
                  ...campaigns.map((c: Campaign) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>

            {/* Schedule */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Schedule</label>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.use_best_time}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, use_best_time: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Use best available time</span>
                  <Sparkles className="h-4 w-4 text-sage" />
                </label>

                {formData.use_best_time && optimalSlots.length > 0 && (
                  <div className="bg-sage/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{formatDateTime(optimalSlots[0].datetime)}</p>
                        <p className="text-xs text-muted-foreground">{optimalSlots[0].day_theme}</p>
                      </div>
                      <Badge size="sm" variant="success">
                        {optimalSlots[0].engagement_rate}% engagement
                      </Badge>
                    </div>
                  </div>
                )}

                {!formData.use_best_time && (
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at.slice(0, 16)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduled_at: new Date(e.target.value).toISOString(),
                      }))
                    }
                  />
                )}
              </div>
            </div>

            {/* Cross-post to Facebook */}
            <label className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <input
                type="checkbox"
                checked={formData.cross_post_facebook}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cross_post_facebook: e.target.checked }))
                }
                className="rounded"
              />
              <Facebook className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Cross-post to Facebook</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-surface px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {/* Open preview modal */}}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSave('draft')}
              disabled={saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('scheduled')}
              disabled={saveMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {isEditing ? 'Update' : 'Schedule Post'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
