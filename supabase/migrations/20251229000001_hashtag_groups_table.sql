-- ============================================================================
-- Migration: Create hashtag_groups table
-- The original seed migration assumed this table existed but it was never created
-- ============================================================================

-- Create hashtag_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS hashtag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('brand', 'mega', 'large', 'niche')),
  estimated_reach TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',

  -- Content targeting
  content_type VARCHAR(50),
  collection_affinity VARCHAR(50),

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- System vs user-created
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hashtag_groups_user ON hashtag_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_hashtag_groups_tier ON hashtag_groups(tier) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hashtag_groups_active ON hashtag_groups(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE hashtag_groups ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "hashtag_groups_select" ON hashtag_groups;
DROP POLICY IF EXISTS "hashtag_groups_insert" ON hashtag_groups;
DROP POLICY IF EXISTS "hashtag_groups_update" ON hashtag_groups;
DROP POLICY IF EXISTS "hashtag_groups_delete" ON hashtag_groups;

CREATE POLICY "hashtag_groups_select" ON hashtag_groups
  FOR SELECT USING (user_id = auth.uid() OR is_system = true OR user_id IS NULL);
CREATE POLICY "hashtag_groups_insert" ON hashtag_groups
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "hashtag_groups_update" ON hashtag_groups
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "hashtag_groups_delete" ON hashtag_groups
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- Updated at trigger
DROP TRIGGER IF EXISTS hashtag_groups_updated_at ON hashtag_groups;
CREATE TRIGGER hashtag_groups_updated_at
  BEFORE UPDATE ON hashtag_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed system hashtag groups (only if not already seeded)
-- ============================================================================

-- Check if already seeded
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hashtag_groups WHERE is_system = true LIMIT 1) THEN
    -- BRAND TIER (always include - 2 tags)
    INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_system, is_active)
    VALUES ('Brand Core', 'brand', 'Brand tags', ARRAY['#havenandhold', '#quietanchors'], true, true);

    -- MEGA TIER (1B+ views - 5 tags)
    INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_system, is_active)
    VALUES ('Mega General', 'mega', '1B+', ARRAY['#homedecor', '#wallart', '#diy', '#smallbusiness', '#fyp'], true, true);

    -- LARGE TIER (100M-1B views)
    INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_system, is_active)
    VALUES ('Large Home & Art', 'large', '100M-1B', ARRAY['#minimalistart', '#roomtransformation', '#homeoffice', '#digitaldownload', '#printableart'], true, true);

    INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_system, is_active)
    VALUES ('Large Mental Health', 'large', '100M-1B', ARRAY['#mentalhealthmatters', '#selfcare', '#healingjourney', '#anxietyrelief', '#therapytok'], true, true);

    -- NICHE TIER (10M-100M views)
    INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_system, is_active)
    VALUES ('Niche Therapeutic', 'niche', '10M-100M', ARRAY['#therapyoffice', '#traumahealing', '#mindfulhome', '#quoteart', '#calmspaces', '#sanctuaryhome', '#intentionalliving'], true, true);

    INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags, is_system, is_active)
    VALUES ('Niche Decor', 'niche', '10M-100M', ARRAY['#bedroomdecor', '#minimalistdecor', '#apartmentdecor', '#gallerywall', '#neutraldecor', '#cozyhome', '#peacefulspaces'], true, true);

    RAISE NOTICE 'Seeded 6 system hashtag groups';
  ELSE
    RAISE NOTICE 'System hashtag groups already exist, skipping seed';
  END IF;
END $$;

-- ============================================================================
-- Seed rotation sets (only if not already seeded)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hashtag_rotation_sets WHERE is_system = true LIMIT 1) THEN
    -- Set A: Therapeutic Focus
    INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
    SELECT
      'Therapeutic Focus',
      'For mental health, healing, and therapeutic content. Best for brand_story and educational pillars.',
      ARRAY[
        (SELECT id FROM hashtag_groups WHERE name = 'Brand Core' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Mega General' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Large Mental Health' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Niche Therapeutic' AND is_system = true)
      ],
      true,
      true;

    -- Set B: Home Decor Focus
    INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
    SELECT
      'Home Decor Focus',
      'For home styling, decor, and product showcase content. Best for product_showcase and community pillars.',
      ARRAY[
        (SELECT id FROM hashtag_groups WHERE name = 'Brand Core' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Mega General' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Large Home & Art' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Niche Decor' AND is_system = true)
      ],
      true,
      true;

    -- Set C: Balanced Mix
    INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
    SELECT
      'Balanced Mix',
      'Balanced mix of home decor and therapeutic hashtags. Good all-purpose set.',
      ARRAY[
        (SELECT id FROM hashtag_groups WHERE name = 'Brand Core' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Mega General' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Large Home & Art' AND is_system = true),
        (SELECT id FROM hashtag_groups WHERE name = 'Niche Therapeutic' AND is_system = true)
      ],
      true,
      true;

    RAISE NOTICE 'Seeded 3 system rotation sets';
  ELSE
    RAISE NOTICE 'System rotation sets already exist, skipping seed';
  END IF;
END $$;
