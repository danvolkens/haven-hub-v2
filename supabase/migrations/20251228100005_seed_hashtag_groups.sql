-- ============================================================================
-- Migration: 20251228100005_seed_hashtag_groups
-- Description: Seed tiered hashtag groups and rotation sets
-- Feature: Instagram & Video Automation (Prompt 2.3)
-- ============================================================================

-- ============================================================================
-- Hashtag Rotation Sets Table
-- Pre-built combinations of hashtag groups
-- ============================================================================
CREATE TABLE hashtag_rotation_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- References to hashtag groups (stored as array of group IDs)
  group_ids UUID[] NOT NULL DEFAULT '{}',

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Performance
  avg_engagement_rate DECIMAL(5,4),

  -- System vs user-created
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hashtag_rotation_sets_user ON hashtag_rotation_sets(user_id);
CREATE INDEX idx_hashtag_rotation_sets_active ON hashtag_rotation_sets(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE hashtag_rotation_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY hashtag_rotation_sets_select ON hashtag_rotation_sets
  FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY hashtag_rotation_sets_insert ON hashtag_rotation_sets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY hashtag_rotation_sets_update ON hashtag_rotation_sets
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY hashtag_rotation_sets_delete ON hashtag_rotation_sets
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- Updated at trigger
CREATE TRIGGER hashtag_rotation_sets_updated_at
  BEFORE UPDATE ON hashtag_rotation_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED: Hashtag Groups
-- ============================================================================

-- BRAND TIER (always include - 2 tags)
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_active)
VALUES (
  'Brand Core',
  'brand',
  'Brand tags',
  ARRAY['#havenandhold', '#quietanchors'],
  true
);

-- MEGA TIER (1B+ views - 5 tags)
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_active)
VALUES (
  'Mega General',
  'mega',
  '1B+',
  ARRAY['#homedecor', '#wallart', '#diy', '#smallbusiness', '#fyp'],
  true
);

-- LARGE TIER (100M-1B views)
-- Large Home & Art (5 tags)
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_active)
VALUES (
  'Large Home & Art',
  'large',
  '100M-1B',
  ARRAY['#minimalistart', '#roomtransformation', '#homeoffice', '#digitaldownload', '#printableart'],
  true
);

-- Large Mental Health (5 tags)
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_active)
VALUES (
  'Large Mental Health',
  'large',
  '100M-1B',
  ARRAY['#mentalhealthmatters', '#selfcare', '#healingjourney', '#anxietyrelief', '#therapytok'],
  true
);

-- NICHE TIER (10M-100M views)
-- Niche Therapeutic (7 tags)
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_active)
VALUES (
  'Niche Therapeutic',
  'niche',
  '10M-100M',
  ARRAY['#therapyoffice', '#traumahealing', '#mindfulhome', '#quoteart', '#calmspaces', '#sanctuaryhome', '#intentionalliving'],
  true
);

-- Niche Decor (7 tags)
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_active)
VALUES (
  'Niche Decor',
  'niche',
  '10M-100M',
  ARRAY['#bedroomdecor', '#minimalistdecor', '#apartmentdecor', '#gallerywall', '#neutraldecor', '#cozyhome', '#peacefulspaces'],
  true
);

-- ============================================================================
-- SEED: Rotation Sets
-- Each set combines groups to achieve 15-18 hashtags total
-- ============================================================================

-- Set A: Therapeutic Focus
-- Brand (2) + Mega (5) + Large Mental Health (5) + Niche Therapeutic (7) = 19 tags
-- We'll use this as the therapeutic-focused set
INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
SELECT
  'Therapeutic Focus',
  'For mental health, healing, and therapeutic content. Best for brand_story and educational pillars.',
  ARRAY[
    (SELECT id FROM hashtag_groups WHERE name = 'Brand Core'),
    (SELECT id FROM hashtag_groups WHERE name = 'Mega General'),
    (SELECT id FROM hashtag_groups WHERE name = 'Large Mental Health'),
    (SELECT id FROM hashtag_groups WHERE name = 'Niche Therapeutic')
  ],
  true,
  true;

-- Set B: Home Decor Focus
-- Brand (2) + Mega (5) + Large Home & Art (5) + Niche Decor (7) = 19 tags
INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
SELECT
  'Home Decor Focus',
  'For home styling, decor, and product showcase content. Best for product_showcase and community pillars.',
  ARRAY[
    (SELECT id FROM hashtag_groups WHERE name = 'Brand Core'),
    (SELECT id FROM hashtag_groups WHERE name = 'Mega General'),
    (SELECT id FROM hashtag_groups WHERE name = 'Large Home & Art'),
    (SELECT id FROM hashtag_groups WHERE name = 'Niche Decor')
  ],
  true,
  true;

-- Set C: Balanced Mix
-- Brand (2) + Mega (5) + Large Home & Art (5) + Niche Therapeutic (7) = 19 tags
INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
SELECT
  'Balanced Mix',
  'Balanced mix of home decor and therapeutic hashtags. Good all-purpose set.',
  ARRAY[
    (SELECT id FROM hashtag_groups WHERE name = 'Brand Core'),
    (SELECT id FROM hashtag_groups WHERE name = 'Mega General'),
    (SELECT id FROM hashtag_groups WHERE name = 'Large Home & Art'),
    (SELECT id FROM hashtag_groups WHERE name = 'Niche Therapeutic')
  ],
  true,
  true;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get hashtags for a rotation set
CREATE OR REPLACE FUNCTION get_rotation_set_hashtags(p_set_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hashtags TEXT[] := '{}';
  v_group_id UUID;
  v_group_hashtags TEXT[];
BEGIN
  -- Get the group IDs from the rotation set
  FOR v_group_id IN
    SELECT UNNEST(group_ids) FROM hashtag_rotation_sets WHERE id = p_set_id
  LOOP
    -- Get hashtags from each group
    SELECT hashtags INTO v_group_hashtags
    FROM hashtag_groups
    WHERE id = v_group_id AND is_active = true;

    IF v_group_hashtags IS NOT NULL THEN
      v_hashtags := v_hashtags || v_group_hashtags;
    END IF;
  END LOOP;

  RETURN v_hashtags;
END;
$$;

-- Get hashtags by tier
CREATE OR REPLACE FUNCTION get_hashtags_by_tier(p_tier VARCHAR)
RETURNS TABLE (
  group_name VARCHAR,
  hashtags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT name, hg.hashtags
  FROM hashtag_groups hg
  WHERE tier = p_tier AND is_active = true;
END;
$$;

-- Get recommended rotation set based on content pillar and collection
CREATE OR REPLACE FUNCTION get_recommended_rotation_set(
  p_content_pillar VARCHAR,
  p_collection VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_set_id UUID;
BEGIN
  -- Logic from spec:
  -- educational or brand_story → Therapeutic Focus
  -- product_showcase with grounding/wholeness → Balanced Mix
  -- product_showcase with growth/general → Home Decor Focus
  -- community → Home Decor Focus

  IF p_content_pillar IN ('educational', 'brand_story') THEN
    SELECT id INTO v_set_id FROM hashtag_rotation_sets
    WHERE name = 'Therapeutic Focus' AND is_system = true;
  ELSIF p_content_pillar = 'product_showcase' AND p_collection IN ('grounding', 'wholeness') THEN
    SELECT id INTO v_set_id FROM hashtag_rotation_sets
    WHERE name = 'Balanced Mix' AND is_system = true;
  ELSE
    -- product_showcase with growth/general, or community
    SELECT id INTO v_set_id FROM hashtag_rotation_sets
    WHERE name = 'Home Decor Focus' AND is_system = true;
  END IF;

  RETURN v_set_id;
END;
$$;

-- ============================================================================
-- Verify: Count groups and sets
-- ============================================================================
DO $$
DECLARE
  group_count INTEGER;
  set_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO group_count FROM hashtag_groups;
  SELECT COUNT(*) INTO set_count FROM hashtag_rotation_sets WHERE is_system = true;

  IF group_count != 6 THEN
    RAISE EXCEPTION 'Expected 6 hashtag groups, found %', group_count;
  END IF;

  IF set_count != 3 THEN
    RAISE EXCEPTION 'Expected 3 rotation sets, found %', set_count;
  END IF;

  RAISE NOTICE 'Successfully seeded 6 hashtag groups and 3 rotation sets';
END $$;
