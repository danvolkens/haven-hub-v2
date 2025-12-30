'use client';

import { useState, useEffect } from 'react';
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
  Input,
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
  X,
  Check,
  ShoppingBag,
  Tag,
  Facebook,
  Eye,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Upload,
  Clock,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { AssetSelector } from '@/components/instagram/asset-selector';
import { ImageUpload } from '@/components/instagram/image-upload';
import { MockupSelector } from '@/components/instagram/mockup-selector';

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

interface Asset {
  id: string;
  url: string;
  thumbnail_url?: string;
  type: 'image' | 'video';
}

interface UploadedImage {
  url: string;
  key: string;
}

interface Mockup {
  id: string;
  file_url: string;
  scene: string;
}

interface Product {
  id: string;
  title: string;
  shopify_id?: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface HashtagGroup {
  id: string;
  name: string;
  tier: string;
  hashtags: string[];
  estimated_reach: string | null;
}

interface RotationSet {
  id: string;
  name: string;
  description: string | null;
  hashtags: string[];
  is_system: boolean;
}

interface CaptionTemplate {
  id: string;
  name: string;
  template_type: string;
  content_pillar: string;
  collection: string | null;
  caption_template: string;
  caption_formula: string | null;
  preferred_days: number[] | null;
}

interface OptimalSlot {
  datetime: string;
  engagement_rate: number;
  day_theme: string;
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

const CHARACTER_LIMITS = {
  caption: 2200,
  hashtags: 30,
  alt_text: 500,
};

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

// ============================================================================
// Main Component
// ============================================================================

export default function NewInstagramPostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [postType, setPostType] = useState<PostType>('feed');
  const [contentPillar, setContentPillar] = useState<ContentPillar>('product_showcase');
  const [templateId, setTemplateId] = useState<string>('');
  const [quoteId, setQuoteId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtagsAsComment, setHashtagsAsComment] = useState(true);
  const [altText, setAltText] = useState('');
  const [productId, setProductId] = useState<string>('');
  const [campaignTag, setCampaignTag] = useState<string>('');
  const [crossPostFacebook, setCrossPostFacebook] = useState(false);
  const [useBestTime, setUseBestTime] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });

  // Asset state
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [selectedMockupIds, setSelectedMockupIds] = useState<string[]>([]);
  const [selectedMockups, setSelectedMockups] = useState<Mockup[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [mediaSource, setMediaSource] = useState<'assets' | 'upload' | 'mixed'>('assets');

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

  // Fetch products for shopping tag
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=50');
      if (!res.ok) return [];
      const data = await res.json();
      return data.products || data || [];
    },
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['campaigns', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns?status=active');
      if (!res.ok) return [];
      const data = await res.json();
      return data.campaigns || data || [];
    },
  });

  // Fetch hashtag groups and rotation sets
  const selectedQuote = quotes.find(q => q.id === quoteId);
  const { data: hashtagData } = useQuery<{
    groups: HashtagGroup[];
    rotation_sets: RotationSet[];
    recommended_set_id: string | null;
  }>({
    queryKey: ['hashtag-groups', contentPillar, selectedQuote?.collection],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (contentPillar) params.set('content_pillar', contentPillar);
      if (selectedQuote?.collection) params.set('collection', selectedQuote.collection);
      const res = await fetch(`/api/instagram/hashtag-groups?${params}`);
      if (!res.ok) return { groups: [], rotation_sets: [], recommended_set_id: null };
      return res.json();
    },
  });

  // Fetch caption templates (filtered by post type and content pillar)
  const { data: templates = [] } = useQuery<CaptionTemplate[]>({
    queryKey: ['instagram-templates', postType, contentPillar],
    queryFn: async () => {
      const res = await fetch(`/api/instagram/templates?template_type=${postType}&content_pillar=${contentPillar}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch optimal slots
  const { data: optimalSlots = [] } = useQuery<OptimalSlot[]>({
    queryKey: ['optimal-slots', postType, contentPillar],
    queryFn: async () => {
      const res = await fetch(`/api/instagram/optimal-slots?post_type=${postType}&content_pillar=${contentPillar}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Use optimal slot when enabled
  useEffect(() => {
    if (useBestTime && optimalSlots.length > 0) {
      setScheduledAt(optimalSlots[0].datetime.slice(0, 16));
    }
  }, [useBestTime, optimalSlots]);

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      // Determine media URLs - combine assets, mockups, and uploads for carousels
      let mediaUrls: string[] = [];
      let primaryAssetId: string | null = null;
      let additionalAssets: string[] = [];

      // Get asset URLs
      if (selectedAssetIds.length > 0) {
        primaryAssetId = selectedAssetIds[0];
        additionalAssets = selectedAssetIds.slice(1);
        mediaUrls = [...selectedAssets.map(a => a.url)];
      }

      // Add mockup URLs
      if (selectedMockups.length > 0) {
        mediaUrls = [...mediaUrls, ...selectedMockups.map(m => m.file_url)];
      }

      // Add uploaded image URLs
      if (uploadedImages.length > 0) {
        mediaUrls = [...mediaUrls, ...uploadedImages.map(img => img.url)];
      }

      const res = await fetch('/api/instagram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId || null,
          post_type: postType,
          content_pillar: contentPillar,
          caption,
          hashtags,
          hashtags_as_comment: hashtagsAsComment,
          alt_text: altText,
          product_id: productId || null,
          campaign_tag: campaignTag || null,
          crosspost_to_facebook: crossPostFacebook,
          primary_asset_id: primaryAssetId,
          additional_assets: additionalAssets,
          media_urls: mediaUrls,
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

  // Generate alt text mutation
  const generateAltTextMutation = useMutation({
    mutationFn: async () => {
      const assetId = selectedAssetIds[0];
      const imageUrl = uploadedImages[0]?.url;

      if (!assetId && !imageUrl) {
        throw new Error('No image selected');
      }

      const res = await fetch('/api/instagram/generate-alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: assetId,
          image_url: imageUrl,
          caption: caption,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate alt text');
      return res.json();
    },
    onSuccess: (data) => {
      setAltText(data.alt_text);
    },
  });

  const handleAddHashtag = () => {
    const tags = hashtagInput
      .split(/[\s,]+/)
      .map(tag => tag.replace(/^#/, '').trim())
      .filter(tag => tag && !hashtags.includes(tag));

    if (tags.length > 0 && hashtags.length + tags.length <= CHARACTER_LIMITS.hashtags) {
      setHashtags([...hashtags, ...tags]);
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(h => h !== tag));
  };

  const handleApplyRotationSet = (setId: string) => {
    const set = hashtagData?.rotation_sets.find(s => s.id === setId);
    if (set && set.hashtags && set.hashtags.length > 0) {
      // Remove # prefix if present
      const cleanTags = set.hashtags
        .map(tag => tag.replace(/^#/, ''))
        .filter(tag => tag);

      // Use functional update to get latest state (avoids stale closure)
      setHashtags(prevHashtags => {
        const newTags = cleanTags.filter(tag => !prevHashtags.includes(tag));
        if (newTags.length === 0) return prevHashtags;

        if (newTags.length + prevHashtags.length <= CHARACTER_LIMITS.hashtags) {
          return [...prevHashtags, ...newTags];
        } else {
          const available = CHARACTER_LIMITS.hashtags - prevHashtags.length;
          return [...prevHashtags, ...newTags.slice(0, available)];
        }
      });
    }
  };

  const handleApplyHashtagGroup = (groupId: string) => {
    const group = hashtagData?.groups.find(g => g.id === groupId);
    if (group && group.hashtags && group.hashtags.length > 0) {
      const cleanTags = group.hashtags
        .map(tag => tag.replace(/^#/, ''))
        .filter(tag => tag);

      // Use functional update to get latest state (avoids stale closure)
      setHashtags(prevHashtags => {
        const newTags = cleanTags.filter(tag => !prevHashtags.includes(tag));
        if (newTags.length === 0) return prevHashtags;

        if (newTags.length + prevHashtags.length <= CHARACTER_LIMITS.hashtags) {
          return [...prevHashtags, ...newTags];
        } else {
          const available = CHARACTER_LIMITS.hashtags - prevHashtags.length;
          return [...prevHashtags, ...newTags.slice(0, available)];
        }
      });
    }
  };

  const handleQuoteSelect = (value: string | string[]) => {
    const id = Array.isArray(value) ? value[0] : value;
    setQuoteId(id);

    // Reset asset and mockup selection when quote changes
    setSelectedAssetIds([]);
    setSelectedAssets([]);
    setSelectedMockupIds([]);
    setSelectedMockups([]);

    const quote = quotes.find(q => q.id === id);
    if (quote) {
      let newCaption = `"${quote.text}"`;
      if (quote.attribution) {
        newCaption += `\n\n- ${quote.attribution}`;
      }
      setCaption(newCaption);
    }
  };

  const handleTemplateSelect = (value: string | string[]) => {
    const id = Array.isArray(value) ? value[0] : value;
    setTemplateId(id);

    if (!id) return;

    const template = templates.find(t => t.id === id);
    if (template) {
      // Get selected quote for variable substitution
      const quote = quotes.find(q => q.id === quoteId);

      let processedCaption = template.caption_template;

      // Substitute variables if quote is selected
      if (quote) {
        processedCaption = processedCaption
          .replace(/\{\{quote_text\}\}/g, quote.text)
          .replace(/\{\{quote\}\}/g, quote.text)
          .replace(/\{\{attribution\}\}/g, quote.attribution || '')
          .replace(/\{\{author\}\}/g, quote.attribution || '')
          .replace(/\{\{collection_name\}\}/g, quote.collection ? quote.collection.charAt(0).toUpperCase() + quote.collection.slice(1) : 'General')
          .replace(/\{\{collection_tag\}\}/g, quote.collection || 'general');
      }

      // Clear any remaining unfilled variables (mark them for user to fill)
      processedCaption = processedCaption
        .replace(/\{\{product_link\}\}/g, '[Link in bio]')
        .replace(/\{\{[^}]+\}\}/g, '[...]');

      setCaption(processedCaption);
    }
  };

  const handleAssetSelect = (assetIds: string[], assets: Asset[]) => {
    setSelectedAssetIds(assetIds);
    setSelectedAssets(assets);
    if (assetIds.length > 0) {
      setMediaSource(postType === 'carousel' ? 'mixed' : 'assets');
    }
  };

  const handleMockupSelect = (mockupIds: string[], mockups: Mockup[]) => {
    setSelectedMockupIds(mockupIds);
    setSelectedMockups(mockups);
    if (mockupIds.length > 0) {
      setMediaSource('mixed');
    }
  };

  const handleImageUpload = (images: UploadedImage[]) => {
    setUploadedImages(images);
    if (images.length > 0) {
      setMediaSource(postType === 'carousel' ? 'mixed' : 'upload');
    }
  };

  const handleSubmit = (isDraft: boolean) => {
    createMutation.mutate(isDraft);
  };

  const totalMediaCount = selectedAssetIds.length + selectedMockupIds.length + uploadedImages.length;
  const hasMedia = totalMediaCount > 0;
  const maxAssets = postType === 'carousel' ? 10 : 1;
  const canAddMore = postType === 'carousel' && totalMediaCount < maxAssets;

  // Get the primary media URL for preview (assets first, then mockups, then uploads)
  const previewUrl = selectedAssets[0]
    ? (selectedAssets[0].thumbnail_url || selectedAssets[0].url)
    : selectedMockups[0]
      ? selectedMockups[0].file_url
      : uploadedImages[0]?.url;

  return (
    <PageContainer title="New Post">
      <div className="max-w-4xl mx-auto space-y-6">
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Media */}
          <div className="space-y-6">
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
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
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

            {/* Media Selection */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Media</h3>
                  {postType === 'carousel' && (
                    <Badge size="sm" variant="secondary">
                      Up to 10 images
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Carousel Preview - Show all selected images (assets, mockups, uploads) */}
                {postType === 'carousel' && totalMediaCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {totalMediaCount}/{maxAssets} images selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAssetIds([]);
                          setSelectedAssets([]);
                          setSelectedMockupIds([]);
                          setSelectedMockups([]);
                          setUploadedImages([]);
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {/* Assets */}
                      {selectedAssets.map((asset, idx) => (
                        <div key={`asset-${asset.id}`} className="relative aspect-square rounded-lg overflow-hidden border">
                          <img
                            src={asset.thumbnail_url || asset.url}
                            alt={`Asset ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-sage text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div className="absolute bottom-1 left-1 bg-blue-500/80 text-white text-[8px] px-1 rounded">
                            Asset
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newIds = selectedAssetIds.filter(id => id !== asset.id);
                              const newAssets = selectedAssets.filter(a => a.id !== asset.id);
                              setSelectedAssetIds(newIds);
                              setSelectedAssets(newAssets);
                            }}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {/* Mockups */}
                      {selectedMockups.map((mockup, idx) => (
                        <div key={`mockup-${mockup.id}`} className="relative aspect-square rounded-lg overflow-hidden border">
                          <img
                            src={mockup.file_url}
                            alt={`Mockup ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-sage text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {selectedAssets.length + idx + 1}
                          </div>
                          <div className="absolute bottom-1 left-1 bg-purple-500/80 text-white text-[8px] px-1 rounded">
                            Mockup
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newIds = selectedMockupIds.filter(id => id !== mockup.id);
                              const newMockups = selectedMockups.filter(m => m.id !== mockup.id);
                              setSelectedMockupIds(newIds);
                              setSelectedMockups(newMockups);
                            }}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {/* Uploaded Images */}
                      {uploadedImages.map((img, idx) => (
                        <div key={img.key} className="relative aspect-square rounded-lg overflow-hidden border">
                          <img
                            src={img.url}
                            alt={`Uploaded ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-sage text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {selectedAssets.length + selectedMockups.length + idx + 1}
                          </div>
                          <div className="absolute bottom-1 left-1 bg-gray-500/80 text-white text-[8px] px-1 rounded">
                            Upload
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImages(uploadedImages.filter(i => i.key !== img.key));
                            }}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Single Image Preview (non-carousel) */}
                {postType !== 'carousel' && previewUrl && (
                  <div className={`relative rounded-lg overflow-hidden border bg-muted ${
                    postType === 'story' || postType === 'reel'
                      ? 'aspect-[9/16]'
                      : 'aspect-[4/5]'
                  }`}>
                    <img
                      src={previewUrl}
                      alt="Selected media"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssetIds([]);
                        setSelectedAssets([]);
                        setSelectedMockupIds([]);
                        setSelectedMockups([]);
                        setUploadedImages([]);
                      }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition-colors"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                )}

                {/* Asset Selector from Quote - show for carousel even with media selected */}
                {quoteId && (!hasMedia || canAddMore) && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select from Quote Assets</label>
                    <AssetSelector
                      quoteId={quoteId}
                      postType={postType}
                      selectedAssetIds={selectedAssetIds}
                      onSelect={handleAssetSelect}
                      maxAssets={postType === 'carousel' ? maxAssets - selectedMockupIds.length - uploadedImages.length : 1}
                    />
                  </div>
                )}

                {/* Mockup Selector from Quote - show for carousel */}
                {quoteId && postType === 'carousel' && canAddMore && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Add Mockups</label>
                    <MockupSelector
                      quoteId={quoteId}
                      selectedMockupIds={selectedMockupIds}
                      onSelect={handleMockupSelect}
                      maxMockups={maxAssets - selectedAssetIds.length - uploadedImages.length}
                    />
                  </div>
                )}

                {/* Upload Option - show for carousel even with media selected */}
                {(!hasMedia || canAddMore) && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {quoteId ? 'Or upload custom image' : 'Upload Image'}
                      {postType === 'carousel' && hasMedia && ' (add more)'}
                    </label>
                    <ImageUpload
                      onUpload={handleImageUpload}
                      existingImages={uploadedImages}
                      postType={postType}
                      maxImages={maxAssets}
                    />
                  </div>
                )}

                {/* Change Asset button (non-carousel only) */}
                {hasMedia && postType !== 'carousel' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedAssetIds([]);
                      setSelectedAssets([]);
                      setSelectedMockupIds([]);
                      setSelectedMockups([]);
                      setUploadedImages([]);
                    }}
                  >
                    Change Media
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Alt Text */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Alt Text</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateAltTextMutation.mutate()}
                    disabled={generateAltTextMutation.isPending || !hasMedia}
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${generateAltTextMutation.isPending ? 'animate-spin' : ''}`} />
                    Auto-generate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <textarea
                  value={altText}
                  onChange={e => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility..."
                  className="w-full rounded-md border bg-surface px-3 py-2 text-sm resize-none"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {altText.length}/{CHARACTER_LIMITS.alt_text}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Content & Settings */}
          <div className="space-y-6">
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

                {/* Caption Template */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Caption Template (optional)</label>
                  <Select
                    value={templateId}
                    onChange={handleTemplateSelect}
                    options={[
                      { value: '', label: 'Select a template...' },
                      ...templates.map(t => ({
                        value: t.id,
                        label: t.name + (t.collection && t.collection !== 'general' ? ` (${t.collection})` : ''),
                      })),
                    ]}
                  />
                  {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No templates for this post type. <Link href="/dashboard/settings/instagram" className="text-sage hover:underline">Seed templates</Link>
                    </p>
                  )}
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
                    {caption.length} / {CHARACTER_LIMITS.caption} characters
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-sage" />
                    <h3 className="font-semibold">Hashtags</h3>
                    <Badge
                      size="sm"
                      variant={hashtags.length > CHARACTER_LIMITS.hashtags ? 'error' : 'secondary'}
                    >
                      {hashtags.length}/{CHARACTER_LIMITS.hashtags}
                    </Badge>
                  </div>
                  {hashtags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHashtags([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rotation Sets (Quick Apply) */}
                {hashtagData?.rotation_sets && hashtagData.rotation_sets.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Quick Apply Set</label>
                    <div className="flex flex-wrap gap-2">
                      {hashtagData.rotation_sets.map(set => (
                        <Button
                          key={set.id}
                          type="button"
                          variant={hashtagData.recommended_set_id === set.id ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            console.log('Button clicked for set:', set.name);
                            handleApplyRotationSet(set.id);
                          }}
                          title={set.description || `${set.hashtags.length} hashtags`}
                        >
                          {set.name}
                          {hashtagData.recommended_set_id === set.id && (
                            <Sparkles className="ml-1 h-3 w-3" />
                          )}
                          <span className="ml-1 text-xs opacity-70">({set.hashtags.length})</span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hashtagData.recommended_set_id && 'Recommended set highlighted based on content pillar'}
                    </p>
                  </div>
                )}

                {/* Individual Groups */}
                {hashtagData?.groups && hashtagData.groups.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Add by Group</label>
                    <div className="flex flex-wrap gap-2">
                      {hashtagData.groups.map(group => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleApplyHashtagGroup(group.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted/50 cursor-pointer transition-colors"
                          title={`${group.hashtags.length} tags - ${group.estimated_reach || ''}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            group.tier === 'brand' ? 'bg-sage' :
                            group.tier === 'mega' ? 'bg-purple-500' :
                            group.tier === 'large' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`} />
                          {group.name}
                          <span className="opacity-60">({group.hashtags.length})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Input */}
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
                        #{tag} <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hashtagsAsComment}
                    onChange={e => setHashtagsAsComment(e.target.checked)}
                    className="rounded"
                  />
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Post as first comment
                </label>
              </CardContent>
            </Card>

            {/* Shopping & Campaign */}
            <Card>
              <CardHeader className="pb-2">
                <h3 className="font-semibold">Tags</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Shopping Tag */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Shopping Tag</label>
                  </div>
                  <Select
                    value={productId}
                    onChange={value => setProductId(value as string)}
                    options={[
                      { value: '', label: 'No product tag' },
                      ...products.map(p => ({ value: p.id, label: p.title })),
                    ]}
                  />
                </div>

                {/* Campaign Tag */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Campaign</label>
                  </div>
                  <Select
                    value={campaignTag}
                    onChange={value => setCampaignTag(value as string)}
                    options={[
                      { value: '', label: 'No campaign' },
                      ...campaigns.map(c => ({ value: c.name, label: c.name })),
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sage" />
                  <h3 className="font-semibold">Schedule</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useBestTime}
                    onChange={e => setUseBestTime(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Use best available time</span>
                  <Sparkles className="h-4 w-4 text-sage" />
                </label>

                {useBestTime && optimalSlots.length > 0 && (
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

                {!useBestTime && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="w-full rounded-md border bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cross-post to Facebook */}
            <Card>
              <CardContent className="py-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crossPostFacebook}
                    onChange={e => setCrossPostFacebook(e.target.checked)}
                    className="rounded"
                  />
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Cross-post to Facebook</span>
                </label>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
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
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {createMutation.error.message}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
