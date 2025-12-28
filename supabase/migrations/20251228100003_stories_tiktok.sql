-- ============================================================================
-- Migration: 20251228100003_stories_tiktok
-- Description: Stories hybrid system and TikTok queue tables
-- Feature: Instagram & Video Automation (Prompt 1.3)
-- ============================================================================

-- ============================================================================
-- Story Templates Table
-- Templates for auto-scheduled story types
-- ============================================================================
CREATE TABLE story_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  story_type VARCHAR(50) CHECK (story_type IN (
    'quote_daily', 'product_highlight', 'quiz_cta', 'poll', 'bts'
  )),

  -- Visual template
  background_type VARCHAR(20) CHECK (background_type IN ('image', 'video', 'branded_solid')),
  text_overlay_template TEXT,
  text_position VARCHAR(20) DEFAULT 'center' CHECK (text_position IN ('top', 'center', 'bottom')),

  -- CTA configuration
  link_url TEXT,
  link_label TEXT, -- "See more", "Take quiz", etc.

  -- System vs user-created
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_story_templates_user ON story_templates(user_id);
CREATE INDEX idx_story_templates_type ON story_templates(story_type);

-- RLS
ALTER TABLE story_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_templates_select ON story_templates
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY story_templates_insert ON story_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY story_templates_update ON story_templates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY story_templates_delete ON story_templates
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- ============================================================================
-- Instagram Stories Table
-- Story scheduling (auto + manual queue)
-- ============================================================================
CREATE TABLE instagram_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  story_type VARCHAR(50) CHECK (story_type IN (
    'quote_daily', 'product_highlight', 'poll', 'quiz_cta', 'bts', 'ugc'
  )),

  -- For auto-scheduled stories
  template_id UUID REFERENCES story_templates(id) ON DELETE SET NULL,
  caption_overlay TEXT, -- Text to overlay on image/video
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- For polls/questions (manual)
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
  expires_at TIMESTAMPTZ, -- 24 hours after posting
  instagram_media_id VARCHAR(100),

  -- Error handling
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_instagram_stories_user ON instagram_stories(user_id);
CREATE INDEX idx_instagram_stories_status ON instagram_stories(status, scheduled_at);
CREATE INDEX idx_instagram_stories_queue ON instagram_stories(scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX idx_instagram_stories_today ON instagram_stories(user_id, scheduled_at)
  WHERE status IN ('scheduled', 'posted');

-- RLS
ALTER TABLE instagram_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY instagram_stories_select ON instagram_stories
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY instagram_stories_insert ON instagram_stories
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY instagram_stories_update ON instagram_stories
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY instagram_stories_delete ON instagram_stories
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- TikTok Queue Table
-- Manual posting queue for TikTok content
-- ============================================================================
CREATE TABLE tiktok_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content references
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  video_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- Content classification
  content_type VARCHAR(50) CHECK (content_type IN (
    'quote_reveal', 'educational', 'transformation', 'story'
  )),

  -- Hook (from hooks library)
  hook_id UUID REFERENCES video_hooks(id) ON DELETE SET NULL,
  hook_text TEXT,

  -- Generated content
  caption TEXT NOT NULL,
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

  -- Performance (manual entry after posting)
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tiktok_queue_user ON tiktok_queue(user_id);
CREATE INDEX idx_tiktok_queue_date ON tiktok_queue(target_date, slot_type);
CREATE INDEX idx_tiktok_queue_status ON tiktok_queue(status);
CREATE INDEX idx_tiktok_queue_pending ON tiktok_queue(user_id, target_date)
  WHERE status = 'pending';

-- RLS
ALTER TABLE tiktok_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiktok_queue_select ON tiktok_queue
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tiktok_queue_insert ON tiktok_queue
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tiktok_queue_update ON tiktok_queue
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY tiktok_queue_delete ON tiktok_queue
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER tiktok_queue_updated_at
  BEFORE UPDATE ON tiktok_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TikTok Posting Log Table
-- Track daily posting to ensure consistency and streaks
-- ============================================================================
CREATE TABLE tiktok_posting_log (
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
CREATE INDEX idx_tiktok_posting_log_user ON tiktok_posting_log(user_id, date DESC);
CREATE INDEX idx_tiktok_posting_log_streak ON tiktok_posting_log(user_id, date)
  WHERE total_posted > 0;

-- RLS
ALTER TABLE tiktok_posting_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiktok_posting_log_select ON tiktok_posting_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tiktok_posting_log_insert ON tiktok_posting_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tiktok_posting_log_update ON tiktok_posting_log
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- Seed Data: Story Templates
-- ============================================================================

-- Daily Quote Story template
INSERT INTO story_templates (name, story_type, background_type, text_overlay_template, text_position, link_label, is_system) VALUES
('Daily Quote Story', 'quote_daily', 'image', '{{quote_text}}', 'center', 'Shop now', true),
('Product Highlight', 'product_highlight', 'image', 'New arrival: {{product_name}}', 'bottom', 'See collection', true),
('Quiz CTA', 'quiz_cta', 'branded_solid', 'Which collection speaks to you?', 'center', 'Take the quiz', true),
('Poll Template', 'poll', 'branded_solid', NULL, 'center', NULL, true),
('Behind the Scenes', 'bts', 'video', NULL, 'bottom', 'Learn more', true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Calculate current posting streak for TikTok
CREATE OR REPLACE FUNCTION get_tiktok_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_current_date DATE := CURRENT_DATE;
  v_check_date DATE;
  v_has_post BOOLEAN;
BEGIN
  -- Start from yesterday (today may not be complete yet)
  v_check_date := v_current_date - INTERVAL '1 day';

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM tiktok_posting_log
      WHERE user_id = p_user_id
        AND date = v_check_date
        AND total_posted > 0
    ) INTO v_has_post;

    IF v_has_post THEN
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;

    -- Safety limit to prevent infinite loop
    IF v_streak > 365 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$;

-- Get next available TikTok slot
CREATE OR REPLACE FUNCTION get_next_tiktok_slot(p_user_id UUID)
RETURNS TABLE (
  target_date DATE,
  slot_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_date DATE := CURRENT_DATE;
  v_max_days INTEGER := 14;
  v_days_checked INTEGER := 0;
BEGIN
  WHILE v_days_checked < v_max_days LOOP
    -- Check morning slot
    IF NOT EXISTS (
      SELECT 1 FROM tiktok_queue
      WHERE user_id = p_user_id
        AND tiktok_queue.target_date = v_check_date
        AND tiktok_queue.slot_type = 'morning'
        AND status != 'posted'
    ) THEN
      RETURN QUERY SELECT v_check_date, 'morning'::TEXT;
      RETURN;
    END IF;

    -- Check evening slot
    IF NOT EXISTS (
      SELECT 1 FROM tiktok_queue
      WHERE user_id = p_user_id
        AND tiktok_queue.target_date = v_check_date
        AND tiktok_queue.slot_type = 'evening'
        AND status != 'posted'
    ) THEN
      RETURN QUERY SELECT v_check_date, 'evening'::TEXT;
      RETURN;
    END IF;

    v_check_date := v_check_date + INTERVAL '1 day';
    v_days_checked := v_days_checked + 1;
  END LOOP;

  -- Fallback: return next day morning
  RETURN QUERY SELECT v_check_date, 'morning'::TEXT;
END;
$$;

-- Get today's stories for a user
CREATE OR REPLACE FUNCTION get_todays_stories(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  story_type TEXT,
  schedule_type TEXT,
  scheduled_at TIMESTAMPTZ,
  target_time_slot TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.story_type::TEXT,
    s.schedule_type::TEXT,
    s.scheduled_at,
    s.target_time_slot::TEXT,
    s.status::TEXT
  FROM instagram_stories s
  WHERE s.user_id = p_user_id
    AND s.scheduled_at::DATE = CURRENT_DATE
  ORDER BY s.scheduled_at ASC;
END;
$$;

-- Story time slots
COMMENT ON TABLE instagram_stories IS 'Time slots: morning (8-10 AM), midday (11 AM-1 PM), afternoon (2-4 PM), evening (6-9 PM)';
