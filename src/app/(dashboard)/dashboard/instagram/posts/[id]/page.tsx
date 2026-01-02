'use client';

import { useState, use, useEffect } from 'react';
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
  Save,
  Trash2,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

type PostType = 'feed' | 'reel' | 'carousel' | 'story';
type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
type ContentPillar = 'product_showcase' | 'brand_story' | 'educational' | 'community';

interface Post {
  id: string;
  quote_id: string | null;
  quote_text: string;
  post_type: PostType;
  content_pillar: ContentPillar;
  status: PostStatus;
  scheduled_at: string;
  caption: string;
  caption_preview: string;
  hashtags: string[];
  asset_url: string | null;
  thumbnail_url: string | null;
  requires_review: boolean;
  created_at: string;
  quotes: {
    text: string;
    author: string | null;
    collection: string | null;
  } | null;
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

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: 'warning',
  scheduled: 'default',
  publishing: 'default',
  published: 'success',
  failed: 'error',
};

// ============================================================================
// Main Component
// ============================================================================

export default function InstagramPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [caption, setCaption] = useState('');
  const [postType, setPostType] = useState<PostType>('feed');
  const [contentPillar, setContentPillar] = useState<ContentPillar>('product_showcase');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch post
  const { data: post, isLoading, error } = useQuery<Post>({
    queryKey: ['instagram-post', id],
    queryFn: async () => {
      const res = await fetch(`/api/instagram/posts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch post');
      return res.json();
    },
  });

  // Initialize form state when post loads
  useEffect(() => {
    if (post) {
      setCaption(post.caption || '');
      setPostType(post.post_type);
      setContentPillar(post.content_pillar);
      setHashtags(post.hashtags || []);
      setScheduledAt(post.scheduled_at?.slice(0, 16) || '');
    }
  }, [post]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          post_type: postType,
          content_pillar: contentPillar,
          hashtags,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-post', id] });
      queryClient.invalidateQueries({ queryKey: ['instagram'] });
      setIsEditing(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/posts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram'] });
      router.push('/dashboard/instagram/calendar');
    },
  });

  // Approve mutation (for draft posts)
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/instagram/posts/${id}/approve`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to approve post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-post', id] });
      queryClient.invalidateQueries({ queryKey: ['instagram'] });
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

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (error || !post) {
    return (
      <PageContainer title="Post Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">This post could not be found.</p>
          <Link href="/dashboard/instagram/calendar">
            <Button>Back to Calendar</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const Icon = POST_TYPES.find(t => t.value === post.post_type)?.icon || Image;
  const canEdit = post.status === 'draft' || post.status === 'scheduled';
  const canApprove = post.status === 'draft' && post.requires_review;

  return (
    <PageContainer title="Post Details">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/instagram/calendar">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">Post Details</h2>
              <p className="text-sm text-muted-foreground">
                Scheduled for {new Date(post.scheduled_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={STATUS_COLORS[post.status] as any}>
              {post.status}
            </Badge>
            {canEdit && (
              <Link href={`/dashboard/instagram/new?edit=${id}`}>
                <Button variant="secondary">Edit</Button>
              </Link>
            )}
            {canApprove && (
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        {post.thumbnail_url && (
          <Card>
            <CardContent className="p-0">
              <img
                src={post.thumbnail_url}
                alt="Post preview"
                className="w-full aspect-square object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Post Type */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Post Type</h3>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-4 gap-3">
                {POST_TYPES.map(type => {
                  const TypeIcon = type.icon;
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
                      <TypeIcon className="h-6 w-6" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-medium capitalize">{post.post_type}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Caption */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Caption</h3>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="w-full rounded-md border bg-surface px-3 py-2 text-sm resize-none"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {caption.length} / 2,200 characters
                </p>
              </>
            ) : (
              <p className="whitespace-pre-wrap">{post.caption}</p>
            )}
          </CardContent>
        </Card>

        {/* Content Pillar */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="font-semibold">Content Pillar</h3>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Select
                value={contentPillar}
                onChange={value => setContentPillar(value as ContentPillar)}
                options={CONTENT_PILLARS}
              />
            ) : (
              <Badge>{post.content_pillar.replace('_', ' ')}</Badge>
            )}
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
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                    placeholder="Add hashtags"
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
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {post.hashtags?.length > 0 ? (
                  post.hashtags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No hashtags</span>
                )}
              </div>
            )}
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
            {isEditing ? (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full rounded-md border bg-surface px-3 py-2 text-sm"
              />
            ) : (
              <p>{new Date(post.scheduled_at).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>

        {/* Quote Info */}
        {post.quotes && (
          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-semibold">Linked Quote</h3>
            </CardHeader>
            <CardContent>
              <blockquote className="border-l-4 border-sage pl-4 italic">
                "{post.quotes.text}"
                {post.quotes.author && (
                  <footer className="mt-2 text-sm text-muted-foreground">
                    — {post.quotes.author}
                  </footer>
                )}
              </blockquote>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (confirm('Are you sure you want to delete this post?')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Post
          </Button>

          {isEditing && (
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
