/**
 * Instagram Automation Types
 * Generated for Prompt 1.1: Core Instagram Tables
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type HashtagTier = 'brand' | 'mega' | 'large' | 'niche';

export type ContentPillar = 'product_showcase' | 'brand_story' | 'educational' | 'community';

export type TemplateType = 'feed' | 'reel' | 'story' | 'carousel';

export type PostType = 'feed' | 'reel' | 'story' | 'carousel';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export type CaptionFormula =
  | 'single_quote'
  | 'lifestyle'
  | 'collection_highlight'
  | 'behind_quote'
  | 'educational_value'
  | 'ugc_feature';

export type Collection = 'grounding' | 'wholeness' | 'growth' | 'general';

// ============================================================================
// Instagram Connections
// ============================================================================

export interface InstagramConnection {
  id: string;
  user_id: string;
  instagram_account_id: string;
  instagram_username: string | null;
  facebook_page_id: string;
  access_token_encrypted: string;
  token_expires_at: string;
  is_active: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InstagramConnectionInsert = Omit<
  InstagramConnection,
  'id' | 'created_at' | 'updated_at' | 'is_active' | 'last_validated_at'
> & {
  is_active?: boolean;
  last_validated_at?: string | null;
};

export type InstagramConnectionUpdate = Partial<
  Omit<InstagramConnection, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// Hashtag Groups
// ============================================================================

export interface HashtagGroup {
  id: string;
  user_id: string | null;
  name: string;
  tier: HashtagTier;
  estimated_reach: string | null;
  hashtags: string[];
  usage_count: number;
  last_used_at: string | null;
  avg_engagement_rate: number | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export type HashtagGroupInsert = Omit<
  HashtagGroup,
  'id' | 'created_at' | 'usage_count' | 'last_used_at' | 'avg_engagement_rate'
> & {
  usage_count?: number;
  last_used_at?: string | null;
  avg_engagement_rate?: number | null;
};

export type HashtagGroupUpdate = Partial<
  Omit<HashtagGroup, 'id' | 'user_id' | 'created_at'>
>;

// ============================================================================
// Banned Hashtags
// ============================================================================

export interface BannedHashtag {
  id: string;
  user_id: string | null;
  hashtag: string;
  reason: string | null;
  is_system: boolean;
  created_at: string;
}

export type BannedHashtagInsert = Omit<BannedHashtag, 'id' | 'created_at'>;

// ============================================================================
// Instagram Templates
// ============================================================================

export interface InstagramTemplate {
  id: string;
  user_id: string | null;
  name: string;
  template_type: TemplateType;
  content_pillar: ContentPillar;
  collection: Collection | null;
  caption_template: string;
  caption_formula: CaptionFormula | null;
  hashtag_group_ids: string[] | null;
  hashtags_in_caption: boolean;
  include_shopping_tag: boolean;
  preferred_days: number[];
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  avg_engagement_rate: number | null;
  created_at: string;
  updated_at: string;
}

export type InstagramTemplateInsert = Omit<
  InstagramTemplate,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'usage_count'
  | 'avg_engagement_rate'
  | 'is_default'
  | 'is_system'
  | 'is_active'
> & {
  usage_count?: number;
  avg_engagement_rate?: number | null;
  is_default?: boolean;
  is_system?: boolean;
  is_active?: boolean;
};

export type InstagramTemplateUpdate = Partial<
  Omit<InstagramTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// Instagram Scheduled Posts
// ============================================================================

export interface InstagramScheduledPost {
  id: string;
  user_id: string;
  quote_id: string | null;
  template_id: string | null;
  content_pillar: ContentPillar;
  primary_asset_id: string | null;
  additional_assets: string[];
  video_asset_id: string | null;
  thumbnail_asset_id: string | null;
  post_type: PostType;
  caption: string;
  hashtags: string[];
  alt_text: string | null;
  product_id: string | null;
  include_shopping_tag: boolean;
  location_id: string | null;
  location_name: string | null;
  crosspost_to_facebook: boolean;
  scheduled_at: string;
  timezone: string;
  status: PostStatus;
  published_at: string | null;
  instagram_media_id: string | null;
  facebook_media_id: string | null;
  requires_review: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  campaign_tag: string | null;
  error_message: string | null;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InstagramScheduledPostInsert = Omit<
  InstagramScheduledPost,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'published_at'
  | 'instagram_media_id'
  | 'facebook_media_id'
  | 'reviewed_at'
  | 'reviewed_by'
  | 'error_message'
  | 'retry_count'
  | 'last_retry_at'
> & {
  status?: PostStatus;
  requires_review?: boolean;
  retry_count?: number;
};

export type InstagramScheduledPostUpdate = Partial<
  Omit<InstagramScheduledPost, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// Content Pillar Strategy
// ============================================================================

export const CONTENT_PILLAR_TARGETS: Record<ContentPillar, number> = {
  product_showcase: 0.4, // 40%
  brand_story: 0.2, // 20%
  educational: 0.2, // 20%
  community: 0.2, // 20%
};

export interface PillarBalance {
  pillar: ContentPillar;
  actual: number;
  target: number;
  count: number;
  status: 'balanced' | 'low' | 'high';
}

// ============================================================================
// Day Content Map (for smart scheduling)
// ============================================================================

export interface DayContentConfig {
  primary: {
    type: PostType;
    pillar: ContentPillar;
    time: string; // HH:mm format
  };
  secondary?: {
    type: PostType;
    pillar: ContentPillar;
    time: string;
  };
  theme: string;
}

export const DAY_CONTENT_MAP: Record<number, DayContentConfig> = {
  0: {
    // Sunday
    primary: { type: 'carousel', pillar: 'brand_story', time: '10:00' },
    theme: 'reflection',
  },
  1: {
    // Monday
    primary: { type: 'carousel', pillar: 'educational', time: '11:00' },
    theme: 'fresh_start',
  },
  2: {
    // Tuesday
    primary: { type: 'reel', pillar: 'product_showcase', time: '09:00' },
    theme: 'transformation',
  },
  3: {
    // Wednesday
    primary: { type: 'feed', pillar: 'product_showcase', time: '13:00' },
    theme: 'bestseller',
  },
  4: {
    // Thursday
    primary: { type: 'reel', pillar: 'brand_story', time: '12:00' },
    secondary: { type: 'carousel', pillar: 'educational', time: '19:00' },
    theme: 'storytelling',
  },
  5: {
    // Friday
    primary: { type: 'feed', pillar: 'community', time: '11:00' },
    theme: 'feature',
  },
  6: {
    // Saturday
    primary: { type: 'reel', pillar: 'product_showcase', time: '09:00' },
    secondary: { type: 'feed', pillar: 'product_showcase', time: '13:00' },
    theme: 'discovery',
  },
};

// ============================================================================
// Collection Meanings (for template variable substitution)
// ============================================================================

export const COLLECTION_MEANINGS: Record<Exclude<Collection, 'general'>, string> = {
  grounding: 'stability and safety',
  wholeness: 'self-compassion and acceptance',
  growth: 'transformation and becoming',
};

// ============================================================================
// Hashtag Tier Configuration
// ============================================================================

export const HASHTAG_TIER_CONFIG: Record<HashtagTier, { min: number; max: number }> = {
  brand: { min: 2, max: 2 }, // Always exactly 2
  mega: { min: 4, max: 5 }, // 1B+ views
  large: { min: 4, max: 5 }, // 100M-1B views
  niche: { min: 5, max: 7 }, // 10M-100M views
};

// Total hashtags per post: 15-20
export const HASHTAG_TARGET = { min: 15, max: 20 };
