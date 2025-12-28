-- ============================================================================
-- Migration: 20251228100001_instagram_core
-- Description: Core Instagram automation tables - connections, templates,
--              hashtags, and scheduled posts
-- Feature: Instagram & Video Automation (Prompt 1.1)
-- ============================================================================

-- ============================================================================
-- Instagram Connections Table
-- OAuth tokens and account info for Instagram Business accounts
-- ============================================================================
CREATE TABLE instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Account info
  instagram_account_id VARCHAR(100) NOT NULL,
  instagram_username VARCHAR(100),
  facebook_page_id VARCHAR(100) NOT NULL,

  -- Tokens (encrypted via Supabase vault)
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, instagram_account_id)
);

-- Indexes
CREATE INDEX idx_instagram_connections_user ON instagram_connections(user_id);
CREATE INDEX idx_instagram_connections_active ON instagram_connections(user_id) WHERE is_active = true;

-- RLS
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY instagram_connections_select ON instagram_connections
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY instagram_connections_insert ON instagram_connections
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY instagram_connections_update ON instagram_connections
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY instagram_connections_delete ON instagram_connections
  FOR DELETE USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER instagram_connections_updated_at
  BEFORE UPDATE ON instagram_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Hashtag Groups Table
-- Tiered hashtag system (brand/mega/large/niche)
-- ============================================================================
CREATE TABLE hashtag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('brand', 'mega', 'large', 'niche')),
  estimated_reach VARCHAR(50), -- '1B+', '100M-1B', '10M-100M', 'N/A'
  hashtags TEXT[] NOT NULL,

  -- Rotation tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Performance
  avg_engagement_rate DECIMAL(5,4),

  -- System vs user-created
  is_system BOOLEAN DEFAULT false, -- true for default hashtags, false for user-created
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hashtag_groups_user ON hashtag_groups(user_id);
CREATE INDEX idx_hashtag_groups_tier ON hashtag_groups(user_id, tier);
CREATE INDEX idx_hashtag_groups_active ON hashtag_groups(user_id) WHERE is_active = true;

-- RLS
ALTER TABLE hashtag_groups ENABLE ROW LEVEL SECURITY;

-- Allow access to own groups OR system groups
CREATE POLICY hashtag_groups_select ON hashtag_groups
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY hashtag_groups_insert ON hashtag_groups
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY hashtag_groups_update ON hashtag_groups
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY hashtag_groups_delete ON hashtag_groups
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- ============================================================================
-- Banned Hashtags Table
-- Track hashtags to avoid (shadowbanned, off-brand, spam)
-- ============================================================================
CREATE TABLE banned_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  hashtag VARCHAR(100) NOT NULL,
  reason TEXT, -- 'shadowban', 'off_brand', 'spam'

  -- System vs user-added
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, hashtag)
);

-- RLS
ALTER TABLE banned_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY banned_hashtags_select ON banned_hashtags
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY banned_hashtags_insert ON banned_hashtags
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY banned_hashtags_delete ON banned_hashtags
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- ============================================================================
-- Instagram Templates Table
-- Caption templates with content pillars and day affinity
-- ============================================================================
CREATE TABLE instagram_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identification
  name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('feed', 'reel', 'story', 'carousel')),
  content_pillar VARCHAR(50) NOT NULL CHECK (content_pillar IN ('product_showcase', 'brand_story', 'educational', 'community')),
  collection VARCHAR(50) CHECK (collection IN ('grounding', 'wholeness', 'growth', 'general')),

  -- Template content
  caption_template TEXT NOT NULL,

  -- Caption formula reference
  caption_formula VARCHAR(50) CHECK (caption_formula IN (
    'single_quote', 'lifestyle', 'collection_highlight',
    'behind_quote', 'educational_value', 'ugc_feature'
  )),

  -- Hashtag configuration
  hashtag_group_ids UUID[], -- References to hashtag_groups
  hashtags_in_caption BOOLEAN DEFAULT false, -- false = first comment (recommended)

  -- Shopping
  include_shopping_tag BOOLEAN DEFAULT true,

  -- Day affinity (for smart scheduling: 0=Sun, 1=Mon, etc.)
  preferred_days INTEGER[] DEFAULT '{}',

  -- Status
  is_default BOOLEAN DEFAULT false, -- System-provided templates
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Performance tracking
  usage_count INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_instagram_templates_user ON instagram_templates(user_id);
CREATE INDEX idx_instagram_templates_type ON instagram_templates(user_id, template_type);
CREATE INDEX idx_instagram_templates_pillar ON instagram_templates(user_id, content_pillar);
CREATE INDEX idx_instagram_templates_collection ON instagram_templates(user_id, collection);
CREATE INDEX idx_instagram_templates_active ON instagram_templates(user_id) WHERE is_active = true;

-- RLS
ALTER TABLE instagram_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY instagram_templates_select ON instagram_templates
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY instagram_templates_insert ON instagram_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY instagram_templates_update ON instagram_templates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY instagram_templates_delete ON instagram_templates
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- Updated at trigger
CREATE TRIGGER instagram_templates_updated_at
  BEFORE UPDATE ON instagram_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Instagram Scheduled Posts Table
-- Main scheduling table for all Instagram content
-- ============================================================================
CREATE TABLE instagram_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content references
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  template_id UUID REFERENCES instagram_templates(id) ON DELETE SET NULL,

  -- Content classification
  content_pillar VARCHAR(50) NOT NULL CHECK (content_pillar IN (
    'product_showcase', 'brand_story', 'educational', 'community'
  )),

  -- Assets
  primary_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  additional_assets UUID[] DEFAULT '{}', -- For carousels (up to 10)
  video_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  thumbnail_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- Post type
  post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('feed', 'reel', 'story', 'carousel')),

  -- Generated content
  caption TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  alt_text TEXT,

  -- Shopping
  product_id VARCHAR(100), -- Shopify product ID
  include_shopping_tag BOOLEAN DEFAULT true,

  -- Location
  location_id VARCHAR(100),
  location_name VARCHAR(200),

  -- Cross-posting
  crosspost_to_facebook BOOLEAN DEFAULT true,

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'publishing', 'published', 'failed'
  )),
  published_at TIMESTAMPTZ,
  instagram_media_id VARCHAR(100),
  facebook_media_id VARCHAR(100),

  -- Operator mode (supervised = requires review)
  requires_review BOOLEAN DEFAULT true,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Campaigns/Tags
  campaign_tag VARCHAR(100),

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_scheduled_posts_user ON instagram_scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status ON instagram_scheduled_posts(status, scheduled_at);
CREATE INDEX idx_scheduled_posts_queue ON instagram_scheduled_posts(scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_posts_pillar ON instagram_scheduled_posts(content_pillar, scheduled_at);
CREATE INDEX idx_scheduled_posts_review ON instagram_scheduled_posts(user_id, requires_review)
  WHERE status = 'draft' AND requires_review = true;
CREATE INDEX idx_scheduled_posts_published ON instagram_scheduled_posts(published_at DESC)
  WHERE status = 'published';

-- RLS
ALTER TABLE instagram_scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY instagram_scheduled_posts_select ON instagram_scheduled_posts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY instagram_scheduled_posts_insert ON instagram_scheduled_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY instagram_scheduled_posts_update ON instagram_scheduled_posts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY instagram_scheduled_posts_delete ON instagram_scheduled_posts
  FOR DELETE USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER instagram_scheduled_posts_updated_at
  BEFORE UPDATE ON instagram_scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get count of posts by content pillar for a week
CREATE OR REPLACE FUNCTION get_weekly_pillar_counts(
  p_user_id UUID,
  p_week_start TIMESTAMPTZ
)
RETURNS TABLE (
  pillar TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    content_pillar::TEXT as pillar,
    COUNT(*)::BIGINT as count
  FROM instagram_scheduled_posts
  WHERE user_id = p_user_id
    AND scheduled_at >= p_week_start
    AND scheduled_at < p_week_start + INTERVAL '7 days'
    AND status IN ('scheduled', 'published')
  GROUP BY content_pillar;
END;
$$;

-- Check if a time slot is available
CREATE OR REPLACE FUNCTION is_slot_available(
  p_user_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM instagram_scheduled_posts
    WHERE user_id = p_user_id
      AND scheduled_at = p_scheduled_at
      AND status IN ('draft', 'scheduled')
  );
END;
$$;
