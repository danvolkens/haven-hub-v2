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
// Hashtag Rotation Sets
// ============================================================================

export interface HashtagRotationSet {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  group_ids: string[];
  usage_count: number;
  last_used_at: string | null;
  avg_engagement_rate: number | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type HashtagRotationSetInsert = Omit<
  HashtagRotationSet,
  'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at' | 'avg_engagement_rate'
> & {
  usage_count?: number;
  last_used_at?: string | null;
  avg_engagement_rate?: number | null;
};

export type HashtagRotationSetUpdate = Partial<
  Omit<HashtagRotationSet, 'id' | 'user_id' | 'created_at' | 'updated_at'>
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

// ============================================================================
// Video Types (Prompt 1.2)
// ============================================================================

export type VideoTemplateStyle =
  | 'quote_fade'
  | 'quote_reveal'
  | 'quote_minimal'
  | 'before_after'
  | 'text_sequence'
  | 'collection_showcase'
  | 'split_screen'
  | 'transition_wipe'
  | 'talking_head_overlay';

export type VideoContentType = 'quote_reveal' | 'educational' | 'transformation' | 'brand_story';

export type HookType = 'pattern_interrupt' | 'question' | 'statement' | 'controversial' | 'story';

export type HookPosition = 'top' | 'center' | 'bottom';

export type Orientation = 'landscape' | 'portrait' | 'square';

// ============================================================================
// Video Templates
// ============================================================================

export interface VideoTemplate {
  id: string;
  user_id: string | null;
  creatomate_template_id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  template_style: VideoTemplateStyle | null;
  content_type: VideoContentType | null;
  output_formats: string[];
  duration_seconds: number | null;
  supports_hook_overlay: boolean;
  hook_position: HookPosition;
  collections: string[];
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  avg_completion_rate: number | null;
  created_at: string;
  updated_at: string;
}

export type VideoTemplateInsert = Omit<
  VideoTemplate,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'usage_count'
  | 'avg_completion_rate'
  | 'is_default'
  | 'is_system'
  | 'is_active'
> & {
  usage_count?: number;
  avg_completion_rate?: number | null;
  is_default?: boolean;
  is_system?: boolean;
  is_active?: boolean;
};

export type VideoTemplateUpdate = Partial<
  Omit<VideoTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// Video Hooks
// ============================================================================

export interface VideoHook {
  id: string;
  user_id: string | null;
  hook_text: string;
  hook_type: HookType | null;
  collections: string[];
  content_types: string[];
  usage_count: number;
  avg_completion_rate: number | null;
  avg_engagement_rate: number | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export type VideoHookInsert = Omit<
  VideoHook,
  'id' | 'created_at' | 'usage_count' | 'avg_completion_rate' | 'avg_engagement_rate'
> & {
  usage_count?: number;
  avg_completion_rate?: number | null;
  avg_engagement_rate?: number | null;
};

export type VideoHookUpdate = Partial<Omit<VideoHook, 'id' | 'user_id' | 'created_at'>>;

// ============================================================================
// Stock Footage
// ============================================================================

export interface StockFootage {
  id: string;
  user_id: string | null;
  source: string;
  source_id: string | null;
  source_url: string;
  video_url: string;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  orientation: Orientation | null;
  collection: Collection;
  mood_tags: string[];
  notes: string | null;
  usage_count: number;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StockFootageInsert = Omit<
  StockFootage,
  'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'
> & {
  usage_count?: number;
  last_used_at?: string | null;
};

export type StockFootageUpdate = Partial<
  Omit<StockFootage, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// Music Tracks
// ============================================================================

export interface MusicTrack {
  id: string;
  user_id: string | null;
  source: string;
  source_id: string | null;
  source_url: string;
  file_url: string;
  title: string;
  artist: string | null;
  duration_seconds: number | null;
  bpm: number | null;
  collection: Collection;
  mood_tags: string[];
  genre: string | null;
  notes: string | null;
  usage_count: number;
  last_used_at: string | null;
  license_type: string;
  license_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MusicTrackInsert = Omit<
  MusicTrack,
  'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'
> & {
  usage_count?: number;
  last_used_at?: string | null;
};

export type MusicTrackUpdate = Partial<
  Omit<MusicTrack, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// Video Thumbnails
// ============================================================================

export interface VideoThumbnail {
  id: string;
  user_id: string;
  video_asset_id: string | null;
  thumbnail_url: string;
  file_key: string | null;
  timestamp_seconds: number | null;
  is_selected: boolean;
  created_at: string;
}

export type VideoThumbnailInsert = Omit<VideoThumbnail, 'id' | 'created_at' | 'is_selected'> & {
  is_selected?: boolean;
};

export type VideoThumbnailUpdate = Partial<Omit<VideoThumbnail, 'id' | 'user_id' | 'created_at'>>;

// ============================================================================
// Video Content Type Strategy (for TikTok/Reels)
// ============================================================================

export const VIDEO_CONTENT_TYPE_TARGETS: Record<VideoContentType, number> = {
  quote_reveal: 0.4, // 40%
  educational: 0.3, // 30%
  transformation: 0.2, // 20%
  brand_story: 0.1, // 10%
};

// ============================================================================
// Pool Health Types
// ============================================================================

export interface PoolHealthAlert {
  pool_type: 'footage' | 'music';
  collection: Collection;
  total_count: number;
  unused_count: number;
  alert_level: 'ok' | 'warning' | 'critical';
  message: string;
}

// ============================================================================
// Mood Tags by Collection
// ============================================================================

export const COLLECTION_MOOD_TAGS: Record<Collection, string[]> = {
  grounding: ['cozy', 'warm', 'safe', 'anchored', 'stable'],
  wholeness: ['tender', 'nurturing', 'gentle', 'soft'],
  growth: ['emerging', 'hopeful', 'becoming', 'fresh'],
  general: ['calm', 'neutral', 'sanctuary', 'peaceful'],
};

// ============================================================================
// Stories Types (Prompt 1.3)
// ============================================================================

export type StoryType = 'quote_daily' | 'product_highlight' | 'poll' | 'quiz_cta' | 'bts' | 'ugc';

export type StoryScheduleType = 'auto' | 'manual_queue';

export type StoryTimeSlot = 'morning' | 'midday' | 'afternoon' | 'evening';

export type StoryStatus = 'pending' | 'scheduled' | 'posted' | 'expired' | 'failed';

export type BackgroundType = 'image' | 'video' | 'branded_solid';

export type TextPosition = 'top' | 'center' | 'bottom';

// ============================================================================
// Story Templates
// ============================================================================

export interface StoryTemplate {
  id: string;
  user_id: string | null;
  name: string;
  story_type: StoryType | null;
  background_type: BackgroundType | null;
  text_overlay_template: string | null;
  text_position: TextPosition;
  link_url: string | null;
  link_label: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export type StoryTemplateInsert = Omit<StoryTemplate, 'id' | 'created_at' | 'is_system' | 'is_active'> & {
  is_system?: boolean;
  is_active?: boolean;
};

export type StoryTemplateUpdate = Partial<Omit<StoryTemplate, 'id' | 'user_id' | 'created_at'>>;

// ============================================================================
// Instagram Stories
// ============================================================================

export interface InstagramStory {
  id: string;
  user_id: string;
  asset_id: string | null;
  story_type: StoryType | null;
  template_id: string | null;
  caption_overlay: string | null;
  quote_id: string | null;
  poll_question: string | null;
  poll_options: string[];
  schedule_type: StoryScheduleType | null;
  scheduled_at: string | null;
  target_time_slot: StoryTimeSlot | null;
  status: StoryStatus;
  posted_at: string | null;
  expires_at: string | null;
  instagram_media_id: string | null;
  error_message: string | null;
  created_at: string;
}

export type InstagramStoryInsert = Omit<
  InstagramStory,
  'id' | 'created_at' | 'status' | 'posted_at' | 'expires_at' | 'instagram_media_id' | 'error_message'
> & {
  status?: StoryStatus;
};

export type InstagramStoryUpdate = Partial<Omit<InstagramStory, 'id' | 'user_id' | 'created_at'>>;

// ============================================================================
// TikTok Types (Prompt 1.3)
// ============================================================================

export type TikTokContentType = 'quote_reveal' | 'educational' | 'transformation' | 'story';

export type TikTokSlotType = 'morning' | 'evening';

export type TikTokQueueStatus = 'pending' | 'ready' | 'downloaded' | 'posted';

// ============================================================================
// TikTok Queue
// ============================================================================

export interface TikTokQueueItem {
  id: string;
  user_id: string;
  quote_id: string | null;
  video_asset_id: string | null;
  content_type: TikTokContentType | null;
  hook_id: string | null;
  hook_text: string | null;
  caption: string;
  hashtags: string[];
  target_date: string | null; // DATE as string
  target_time: string | null; // TIME as string
  slot_type: TikTokSlotType | null;
  status: TikTokQueueStatus;
  downloaded_at: string | null;
  posted_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  created_at: string;
  updated_at: string;
}

export type TikTokQueueInsert = Omit<
  TikTokQueueItem,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'downloaded_at'
  | 'posted_at'
  | 'views'
  | 'likes'
  | 'comments'
  | 'shares'
> & {
  status?: TikTokQueueStatus;
};

export type TikTokQueueUpdate = Partial<
  Omit<TikTokQueueItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// TikTok Posting Log
// ============================================================================

export interface TikTokPostingLog {
  id: string;
  user_id: string;
  date: string; // DATE as string
  morning_posted: boolean;
  evening_posted: boolean;
  total_posted: number;
  created_at: string;
}

export type TikTokPostingLogInsert = Omit<TikTokPostingLog, 'id' | 'created_at'> & {
  morning_posted?: boolean;
  evening_posted?: boolean;
  total_posted?: number;
};

export type TikTokPostingLogUpdate = Partial<
  Omit<TikTokPostingLog, 'id' | 'user_id' | 'date' | 'created_at'>
>;

// ============================================================================
// Story Time Slot Configuration
// ============================================================================

export const STORY_TIME_SLOTS: Record<StoryTimeSlot, { start: string; end: string; description: string }> = {
  morning: { start: '08:00', end: '10:00', description: 'Quote of the day, inspiration' },
  midday: { start: '11:00', end: '13:00', description: 'Educational, polls' },
  afternoon: { start: '14:00', end: '16:00', description: 'Product highlights' },
  evening: { start: '18:00', end: '21:00', description: 'Quiz CTAs, engagement, BTS' },
};

// ============================================================================
// TikTok Hashtag Strategy (5-5-5 Method)
// ============================================================================

export const TIKTOK_HASHTAG_TARGET = 15; // 5 mega + 5 large + 5 niche

export const TIKTOK_CONTENT_TYPE_TARGETS: Record<TikTokContentType, number> = {
  quote_reveal: 0.4, // 40%
  educational: 0.3, // 30%
  transformation: 0.2, // 20%
  story: 0.1, // 10%
};
