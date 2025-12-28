-- ============================================================================
-- Migration: 20251228300001_repair_instagram_tiktok
-- Description: Repair migration to create Instagram/TikTok tables if missing
-- ============================================================================

-- Create instagram_scheduled_posts if it doesn't exist
CREATE TABLE IF NOT EXISTS instagram_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content references
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  template_id UUID,

  -- Content classification
  content_pillar VARCHAR(50) NOT NULL DEFAULT 'product_showcase' CHECK (content_pillar IN (
    'product_showcase', 'brand_story', 'educational', 'community'
  )),

  -- Assets
  primary_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  additional_assets UUID[] DEFAULT '{}',
  video_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  thumbnail_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  media_urls TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,

  -- Post type
  post_type VARCHAR(20) NOT NULL DEFAULT 'feed' CHECK (post_type IN ('feed', 'reel', 'story', 'carousel')),

  -- Generated content
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  alt_text TEXT,

  -- Shopping
  product_id VARCHAR(100),
  include_shopping_tag BOOLEAN DEFAULT true,

  -- Location
  location_id VARCHAR(100),
  location_name VARCHAR(200),

  -- Cross-posting
  crosspost_to_facebook BOOLEAN DEFAULT true,

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'publishing', 'published', 'failed'
  )),
  published_at TIMESTAMPTZ,
  instagram_media_id VARCHAR(100),
  facebook_media_id VARCHAR(100),

  -- Operator mode
  requires_review BOOLEAN DEFAULT true,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Campaigns
  campaign_tag VARCHAR(100),

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON instagram_scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON instagram_scheduled_posts(status, scheduled_at);

-- RLS
ALTER TABLE instagram_scheduled_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_scheduled_posts' AND policyname = 'instagram_scheduled_posts_select') THEN
    CREATE POLICY instagram_scheduled_posts_select ON instagram_scheduled_posts FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_scheduled_posts' AND policyname = 'instagram_scheduled_posts_insert') THEN
    CREATE POLICY instagram_scheduled_posts_insert ON instagram_scheduled_posts FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_scheduled_posts' AND policyname = 'instagram_scheduled_posts_update') THEN
    CREATE POLICY instagram_scheduled_posts_update ON instagram_scheduled_posts FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_scheduled_posts' AND policyname = 'instagram_scheduled_posts_delete') THEN
    CREATE POLICY instagram_scheduled_posts_delete ON instagram_scheduled_posts FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Create tiktok_queue if it doesn't exist
CREATE TABLE IF NOT EXISTS tiktok_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content references
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  video_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- Content classification
  content_type VARCHAR(50) CHECK (content_type IN (
    'quote_reveal', 'educational', 'transformation', 'story'
  )),

  -- Hook
  hook_id UUID,
  hook_text TEXT,

  -- Generated content
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',

  -- Scheduling
  target_date DATE,
  target_time TIME,
  slot_type VARCHAR(20) CHECK (slot_type IN ('morning', 'evening')),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'ready', 'downloaded', 'posted'
  )),
  downloaded_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,

  -- Performance
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_queue_user ON tiktok_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_queue_date ON tiktok_queue(target_date, slot_type);
CREATE INDEX IF NOT EXISTS idx_tiktok_queue_status ON tiktok_queue(status);

-- RLS
ALTER TABLE tiktok_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiktok_queue' AND policyname = 'tiktok_queue_select') THEN
    CREATE POLICY tiktok_queue_select ON tiktok_queue FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiktok_queue' AND policyname = 'tiktok_queue_insert') THEN
    CREATE POLICY tiktok_queue_insert ON tiktok_queue FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiktok_queue' AND policyname = 'tiktok_queue_update') THEN
    CREATE POLICY tiktok_queue_update ON tiktok_queue FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiktok_queue' AND policyname = 'tiktok_queue_delete') THEN
    CREATE POLICY tiktok_queue_delete ON tiktok_queue FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Create tiktok_posting_log if it doesn't exist
CREATE TABLE IF NOT EXISTS tiktok_posting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  date DATE NOT NULL,
  morning_posted BOOLEAN DEFAULT false,
  evening_posted BOOLEAN DEFAULT false,
  total_posted INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_posting_log_user ON tiktok_posting_log(user_id, date DESC);

-- RLS
ALTER TABLE tiktok_posting_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiktok_posting_log' AND policyname = 'tiktok_posting_log_select') THEN
    CREATE POLICY tiktok_posting_log_select ON tiktok_posting_log FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiktok_posting_log' AND policyname = 'tiktok_posting_log_insert') THEN
    CREATE POLICY tiktok_posting_log_insert ON tiktok_posting_log FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tiktok_posting_log' AND policyname = 'tiktok_posting_log_update') THEN
    CREATE POLICY tiktok_posting_log_update ON tiktok_posting_log FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- Create instagram_stories if it doesn't exist
CREATE TABLE IF NOT EXISTS instagram_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  story_type VARCHAR(50) CHECK (story_type IN (
    'quote_daily', 'product_highlight', 'poll', 'quiz_cta', 'bts', 'ugc'
  )),

  -- For auto-scheduled stories
  template_id UUID,
  caption_overlay TEXT,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- For polls/questions
  poll_question TEXT,
  poll_options TEXT[] DEFAULT '{}',

  -- Scheduling
  schedule_type VARCHAR(20) CHECK (schedule_type IN ('auto', 'manual_queue')),
  scheduled_at TIMESTAMPTZ,
  target_time_slot VARCHAR(20) CHECK (target_time_slot IN (
    'morning', 'midday', 'afternoon', 'evening'
  )),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'posted', 'expired', 'failed'
  )),
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  instagram_media_id VARCHAR(100),

  -- Error handling
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_instagram_stories_user ON instagram_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_stories_status ON instagram_stories(status, scheduled_at);

-- RLS
ALTER TABLE instagram_stories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_stories' AND policyname = 'instagram_stories_select') THEN
    CREATE POLICY instagram_stories_select ON instagram_stories FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_stories' AND policyname = 'instagram_stories_insert') THEN
    CREATE POLICY instagram_stories_insert ON instagram_stories FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_stories' AND policyname = 'instagram_stories_update') THEN
    CREATE POLICY instagram_stories_update ON instagram_stories FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_stories' AND policyname = 'instagram_stories_delete') THEN
    CREATE POLICY instagram_stories_delete ON instagram_stories FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;
