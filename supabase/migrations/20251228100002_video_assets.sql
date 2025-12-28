-- ============================================================================
-- Migration: 20251228100002_video_assets
-- Description: Video generation pipeline tables - templates, hooks, footage,
--              music, and thumbnails
-- Feature: Instagram & Video Automation (Prompt 1.2)
-- ============================================================================

-- ============================================================================
-- Video Templates Table
-- Creatomate template metadata and configuration
-- ============================================================================
CREATE TABLE video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Creatomate reference
  creatomate_template_id VARCHAR(100) NOT NULL,

  -- Metadata
  name VARCHAR(100) NOT NULL,
  description TEXT,
  preview_url TEXT,

  -- Categorization
  template_style VARCHAR(50) CHECK (template_style IN (
    'quote_fade', 'quote_reveal', 'quote_minimal',
    'before_after', 'text_sequence', 'collection_showcase',
    'split_screen', 'transition_wipe', 'talking_head_overlay'
  )),
  content_type VARCHAR(50) CHECK (content_type IN (
    'quote_reveal', 'educational', 'transformation', 'brand_story'
  )),
  output_formats TEXT[] DEFAULT ARRAY['9:16', '4:5'],
  duration_seconds INTEGER,

  -- Hook configuration
  supports_hook_overlay BOOLEAN DEFAULT true,
  hook_position VARCHAR(20) DEFAULT 'top' CHECK (hook_position IN ('top', 'center', 'bottom')),

  -- Collection mapping
  collections TEXT[] DEFAULT ARRAY['general'],

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_video_templates_user ON video_templates(user_id);
CREATE INDEX idx_video_templates_style ON video_templates(template_style);
CREATE INDEX idx_video_templates_content ON video_templates(content_type);
CREATE INDEX idx_video_templates_active ON video_templates(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE video_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_templates_select ON video_templates
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY video_templates_insert ON video_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY video_templates_update ON video_templates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY video_templates_delete ON video_templates
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

CREATE TRIGGER video_templates_updated_at
  BEFORE UPDATE ON video_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Video Hooks Table
-- Hook library with performance tracking
-- ============================================================================
CREATE TABLE video_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  hook_text TEXT NOT NULL,
  hook_type VARCHAR(50) CHECK (hook_type IN (
    'pattern_interrupt', 'question', 'statement', 'controversial', 'story'
  )),

  -- Targeting
  collections TEXT[] DEFAULT ARRAY['general'],
  content_types TEXT[] DEFAULT ARRAY['quote_reveal'],

  -- Performance tracking
  usage_count INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(5,4),
  avg_engagement_rate DECIMAL(5,4),

  -- System vs user-created
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for hook selection (prioritize unused hooks)
CREATE INDEX idx_video_hooks_user ON video_hooks(user_id);
CREATE INDEX idx_video_hooks_selection ON video_hooks(is_active, usage_count ASC)
  WHERE is_active = true;
CREATE INDEX idx_video_hooks_collections ON video_hooks USING GIN (collections);
CREATE INDEX idx_video_hooks_content_types ON video_hooks USING GIN (content_types);

-- RLS
ALTER TABLE video_hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_hooks_select ON video_hooks
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY video_hooks_insert ON video_hooks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY video_hooks_update ON video_hooks
  FOR UPDATE USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY video_hooks_delete ON video_hooks
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- ============================================================================
-- Stock Footage Table
-- Pexels video pool with smart rotation
-- ============================================================================
CREATE TABLE stock_footage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source tracking
  source VARCHAR(50) NOT NULL DEFAULT 'pexels',
  source_id VARCHAR(100),
  source_url TEXT NOT NULL,
  video_url TEXT NOT NULL,

  -- Metadata
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  aspect_ratio VARCHAR(10),
  orientation VARCHAR(20) CHECK (orientation IN ('landscape', 'portrait', 'square')),

  -- Categorization
  collection VARCHAR(50) NOT NULL CHECK (collection IN (
    'grounding', 'wholeness', 'growth', 'general'
  )),
  mood_tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Usage tracking (for LRU selection)
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for LRU selection (prioritize unused, then least recently used)
CREATE INDEX idx_stock_footage_user ON stock_footage(user_id);
CREATE INDEX idx_stock_footage_collection ON stock_footage(collection);
CREATE INDEX idx_stock_footage_lru ON stock_footage(collection, is_active, last_used_at NULLS FIRST)
  WHERE is_active = true;
CREATE INDEX idx_stock_footage_unused ON stock_footage(collection, usage_count)
  WHERE is_active = true AND usage_count = 0;
CREATE INDEX idx_stock_footage_mood ON stock_footage USING GIN (mood_tags);

-- RLS
ALTER TABLE stock_footage ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_footage_select ON stock_footage
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY stock_footage_insert ON stock_footage
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY stock_footage_update ON stock_footage
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY stock_footage_delete ON stock_footage
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER stock_footage_updated_at
  BEFORE UPDATE ON stock_footage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Music Tracks Table
-- Epidemic Sound pool with rotation
-- ============================================================================
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source tracking
  source VARCHAR(50) NOT NULL DEFAULT 'epidemic_sound',
  source_id VARCHAR(100),
  source_url TEXT NOT NULL,
  file_url TEXT NOT NULL,

  -- Metadata
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(200),
  duration_seconds INTEGER,
  bpm INTEGER,

  -- Categorization
  collection VARCHAR(50) NOT NULL CHECK (collection IN (
    'grounding', 'wholeness', 'growth', 'general'
  )),
  mood_tags TEXT[] DEFAULT '{}',
  genre VARCHAR(100),
  notes TEXT,

  -- Usage tracking (for LRU selection)
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- License tracking
  license_type VARCHAR(50) DEFAULT 'epidemic_subscription',
  license_expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for LRU selection
CREATE INDEX idx_music_tracks_user ON music_tracks(user_id);
CREATE INDEX idx_music_tracks_collection ON music_tracks(collection);
CREATE INDEX idx_music_tracks_lru ON music_tracks(collection, is_active, last_used_at NULLS FIRST)
  WHERE is_active = true;
CREATE INDEX idx_music_tracks_unused ON music_tracks(collection, usage_count)
  WHERE is_active = true AND usage_count = 0;
CREATE INDEX idx_music_tracks_mood ON music_tracks USING GIN (mood_tags);

-- RLS
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY music_tracks_select ON music_tracks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY music_tracks_insert ON music_tracks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY music_tracks_update ON music_tracks
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY music_tracks_delete ON music_tracks
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER music_tracks_updated_at
  BEFORE UPDATE ON music_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Video Thumbnails Table
-- Generated thumbnail options for cover selection
-- ============================================================================
CREATE TABLE video_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,

  -- Thumbnail data
  thumbnail_url TEXT NOT NULL,
  file_key TEXT, -- R2 storage key
  timestamp_seconds DECIMAL(5,2), -- When in video this was captured

  -- Selection
  is_selected BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_video_thumbnails_asset ON video_thumbnails(video_asset_id);
CREATE INDEX idx_video_thumbnails_selected ON video_thumbnails(video_asset_id, is_selected)
  WHERE is_selected = true;

-- RLS
ALTER TABLE video_thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_thumbnails_select ON video_thumbnails
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY video_thumbnails_insert ON video_thumbnails
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY video_thumbnails_update ON video_thumbnails
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY video_thumbnails_delete ON video_thumbnails
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Add selected_thumbnail_id to instagram_scheduled_posts
-- ============================================================================
ALTER TABLE instagram_scheduled_posts
ADD COLUMN selected_thumbnail_id UUID REFERENCES video_thumbnails(id) ON DELETE SET NULL;

-- ============================================================================
-- Seed Data: Video Hooks (22 pre-built hooks)
-- ============================================================================

-- Pattern Interrupt Hooks (5)
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types, is_system) VALUES
('Stop scrolling if you''re in therapy', 'pattern_interrupt', ARRAY['grounding', 'wholeness', 'growth'], ARRAY['quote_reveal'], true),
('POV: You finally found wall art that doesn''t say "good vibes only"', 'pattern_interrupt', ARRAY['general'], ARRAY['quote_reveal'], true),
('If your walls say "rise and grind" we need to talk', 'pattern_interrupt', ARRAY['general'], ARRAY['quote_reveal'], true),
('This is for people who can''t "just stay positive"', 'pattern_interrupt', ARRAY['wholeness'], ARRAY['quote_reveal'], true),
('POV: Your bedroom finally feels safe', 'pattern_interrupt', ARRAY['grounding'], ARRAY['quote_reveal'], true);

-- Question Hooks (4)
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types, is_system) VALUES
('Do your walls stress you out or hold you?', 'question', ARRAY['general'], ARRAY['quote_reveal', 'educational'], true),
('Which do you need: grounding, wholeness, or growth?', 'question', ARRAY['general'], ARRAY['educational'], true),
('What''s on your bedroom walls right now?', 'question', ARRAY['general'], ARRAY['quote_reveal'], true),
('Why do therapists'' offices always have generic art?', 'question', ARRAY['general'], ARRAY['educational'], true);

-- Statement Hooks (4)
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types, is_system) VALUES
('Your walls should hold you, not motivate you', 'statement', ARRAY['general'], ARRAY['quote_reveal'], true),
('I made the opposite of hustle culture wall art', 'statement', ARRAY['general'], ARRAY['brand_story'], true),
('Not motivation. Just holding.', 'statement', ARRAY['grounding'], ARRAY['quote_reveal'], true),
('Therapy-informed wall art is now a thing', 'statement', ARRAY['general'], ARRAY['educational'], true);

-- Controversial/Hot Take Hooks (4)
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types, is_system) VALUES
('Unpopular opinion: motivational quotes are toxic', 'controversial', ARRAY['general'], ARRAY['brand_story'], true),
('Your "good vibes only" sign is gaslighting you', 'controversial', ARRAY['general'], ARRAY['brand_story'], true),
('If you''re tired, you don''t need inspiration', 'controversial', ARRAY['wholeness'], ARRAY['quote_reveal'], true),
('Stop telling anxious people to "just breathe"', 'controversial', ARRAY['grounding'], ARRAY['brand_story'], true);

-- Story Hooks (4)
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types, is_system) VALUES
('I launched a business for my therapist''s office', 'story', ARRAY['general'], ARRAY['brand_story'], true),
('This print saved my bedroom from becoming a panic room', 'story', ARRAY['grounding'], ARRAY['quote_reveal'], true),
('After 30 years as a designer, I made this', 'story', ARRAY['general'], ARRAY['brand_story'], true),
('What my therapist has on her walls vs what mine say now', 'story', ARRAY['general'], ARRAY['transformation'], true);

-- Additional hooks to reach 22+ (1 more)
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types, is_system) VALUES
('The art on your walls is either healing you or hurting you', 'statement', ARRAY['general'], ARRAY['quote_reveal', 'educational'], true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Select least recently used footage for a collection
CREATE OR REPLACE FUNCTION select_stock_footage(
  p_user_id UUID,
  p_collection VARCHAR(50)
)
RETURNS TABLE (
  id UUID,
  video_url TEXT,
  usage_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sf.id, sf.video_url, sf.usage_count
  FROM stock_footage sf
  WHERE sf.user_id = p_user_id
    AND sf.collection = p_collection
    AND sf.is_active = true
    AND sf.orientation = 'portrait'
  ORDER BY
    sf.usage_count ASC,
    sf.last_used_at ASC NULLS FIRST
  LIMIT 1;
END;
$$;

-- Select least recently used music for a collection
CREATE OR REPLACE FUNCTION select_music_track(
  p_user_id UUID,
  p_collection VARCHAR(50)
)
RETURNS TABLE (
  id UUID,
  file_url TEXT,
  title VARCHAR(200),
  usage_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT mt.id, mt.file_url, mt.title, mt.usage_count
  FROM music_tracks mt
  WHERE mt.user_id = p_user_id
    AND mt.collection = p_collection
    AND mt.is_active = true
    AND (mt.license_expires_at IS NULL OR mt.license_expires_at > NOW())
  ORDER BY
    mt.usage_count ASC,
    mt.last_used_at ASC NULLS FIRST
  LIMIT 1;
END;
$$;

-- Check pool health (returns alerts for low pools)
CREATE OR REPLACE FUNCTION check_pool_health(
  p_user_id UUID
)
RETURNS TABLE (
  pool_type TEXT,
  collection TEXT,
  total_count BIGINT,
  unused_count BIGINT,
  alert_level TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Stock footage health
  RETURN QUERY
  SELECT
    'footage'::TEXT as pool_type,
    sf.collection::TEXT,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE sf.usage_count = 0)::BIGINT as unused_count,
    CASE
      WHEN COUNT(*) < 5 THEN 'critical'
      WHEN COUNT(*) < 10 THEN 'warning'
      WHEN COUNT(*) FILTER (WHERE sf.usage_count = 0) = 0 THEN 'warning'
      ELSE 'ok'
    END as alert_level,
    CASE
      WHEN COUNT(*) < 5 THEN 'Very low footage count'
      WHEN COUNT(*) < 10 THEN 'Low footage count'
      WHEN COUNT(*) FILTER (WHERE sf.usage_count = 0) = 0 THEN 'All footage used, will repeat'
      ELSE 'Pool healthy'
    END as message
  FROM stock_footage sf
  WHERE sf.user_id = p_user_id AND sf.is_active = true
  GROUP BY sf.collection;

  -- Music tracks health
  RETURN QUERY
  SELECT
    'music'::TEXT as pool_type,
    mt.collection::TEXT,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE mt.usage_count = 0)::BIGINT as unused_count,
    CASE
      WHEN COUNT(*) < 3 THEN 'critical'
      WHEN COUNT(*) < 5 THEN 'warning'
      WHEN COUNT(*) FILTER (WHERE mt.usage_count = 0) = 0 THEN 'warning'
      ELSE 'ok'
    END as alert_level,
    CASE
      WHEN COUNT(*) < 3 THEN 'Very low music count'
      WHEN COUNT(*) < 5 THEN 'Low music count'
      WHEN COUNT(*) FILTER (WHERE mt.usage_count = 0) = 0 THEN 'All tracks used, will repeat'
      ELSE 'Pool healthy'
    END as message
  FROM music_tracks mt
  WHERE mt.user_id = p_user_id AND mt.is_active = true
  GROUP BY mt.collection;
END;
$$;
