'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Select,
} from '@/components/ui';
import {
  ArrowLeft,
  Calendar,
  Image,
  Video,
  Layers,
  Film,
  Hash,
  Sparkles,
  Save,
  Send,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

type PostType = 'feed' | 'reel' | 'carousel' | 'story';
type ContentPillar = 'product_showcase' | 'brand_story' | 'educational' | 'community';

interface Quote {
  id: string;
  text: string;
  attribution: string | null;
  collection: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType }[] = [
  { value: 'feed', label: 'Feed Post', icon: Image },
  { value: 'reel', label: 'Reel', icon: Video },
  { value: 'carousel', label: 'Carousel', icon: Layers },
  { value: 'story', label: 'Story', icon: Film },
];

const CONTENT_PILLARS: { value: ContentPillar; label: string }[] = [
  { value: 'product_showcase', label: 'Product Showcase' },
  { value: 'brand_story', label: 'Brand Story' },
  { value: 'educational', label: 'Educational' },
  { value: 'community', label: 'Community' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function NewInstagramPostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [postType, setPostType] = useState<PostType>('feed');
  const [contentPillar, setContentPillar] = useState<ContentPillar>('product_showcase');
  const [quoteId, setQuoteId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });

  // Fetch quotes for selection
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ['quotes', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/quotes?status=active&limit=50');
      if (!res.ok) return [];
      const data = await res.json();
      return data.quotes || data || [];
    },
  });

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const res = await fetch('/api/instagram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId || null,
          post_type: postType,
          content_pillar: contentPillar,
          caption,
          hashtags,
          scheduled_at: new Date(scheduledAt).toISOString(),
          requires_review: isDraft,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create post');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram'] });
      router.push('/dashboard/instagram/calendar');
    },
  });

  const handleAddHashtag = () => {
    const tags = hashtagInput
      .split(/[\s,]+/)
      .map(tag => tag.replace(/^#/, '').trim())
      .filter(tag => tag && !hashtags.includes(tag));

    if (tags.length > 0) {
      setHashtags([...hashtags, ...tags]);
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(h => h !== tag));
  };

  const handleSubmit = (isDraft: boolean) => {
    createMutation.mutate(isDraft);
  };

  // Apply quote to caption
  const handleQuoteSelect = (value: string | string[]) => {
    const id = Array.isArray(value) ? value[0] : value;
    setQuoteId(id);
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      let newCaption = `"${quote.text}"`;
      if (quote.attribution) {
        newCaption += `\n\n— ${quote.attribution}`;
      }
      setCaption(newCaption);
    }
  };

  return (
    <PageContainer title="New Post">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/instagram/calendar">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Schedule Instagram Post</h2>
            <p className="text-sm text-muted-foreground">
              Create and schedule a new Instagram post
            </p>
          </div>
        </div>

        {/* Post Type Selection */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Post Type</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {POST_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPostType(type.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      postType === type.value
                        ? 'border-sage bg-sage/10'
                        : 'border-transparent bg-muted hover:border-sage/50'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Content</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quote Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quote (optional)</label>
              <Select
                value={quoteId}
                onChange={handleQuoteSelect}
                options={[
                  { value: '', label: 'Select a quote...' },
                  ...quotes.map(q => ({
                    value: q.id,
                    label: q.text.substring(0, 50) + (q.text.length > 50 ? '...' : ''),
                  })),
                ]}
              />
            </div>

            {/* Caption */}
            <div>
              <label className="text-sm font-medium mb-2 block">Caption</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write your caption..."
                className="w-full rounded-md border bg-surface px-3 py-2 text-sm resize-none"
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {caption.length} / 2,200 characters
              </p>
            </div>

            {/* Content Pillar */}
            <div>
              <label className="text-sm font-medium mb-2 block">Content Pillar</label>
              <Select
                value={contentPillar}
                onChange={value => setContentPillar(value as ContentPillar)}
                options={CONTENT_PILLARS}
              />
            </div>
          </CardContent>
        </Card>

        {/* Hashtags */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-sage" />
              <h3 className="font-semibold">Hashtags</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                placeholder="Add hashtags (comma or space separated)"
                className="flex-1 rounded-md border bg-surface px-3 py-2 text-sm"
              />
              <Button variant="secondary" onClick={handleAddHashtag}>
                Add
              </Button>
            </div>

            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/10"
                    onClick={() => handleRemoveHashtag(tag)}
                  >
                    #{tag} ×
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {hashtags.length} / 30 hashtags • Hashtags will be posted as the first comment
            </p>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sage" />
              <h3 className="font-semibold">Schedule</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium mb-2 block">Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full rounded-md border bg-surface px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/instagram/calendar">
            <Button variant="ghost">Cancel</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending || !caption.trim()}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending || !caption.trim()}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Schedule
          </Button>
        </div>

        {createMutation.isError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {createMutation.error.message}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
