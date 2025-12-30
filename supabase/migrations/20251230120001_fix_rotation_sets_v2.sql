-- ============================================================================
-- Migration: Fix rotation sets with correct group names
-- The previous migration used wrong group names that don't match actual data
-- ============================================================================

-- Delete system rotation sets and recreate with correct groups
DELETE FROM hashtag_rotation_sets WHERE is_system = true;

-- Therapeutic Focus: Mental health & therapy focused
-- Brand + Mega + Large Mental Health + Niche Therapy + Niche Sanctuary
INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
SELECT
  'Therapeutic Focus',
  'For mental health, healing, and therapeutic content. Best for brand_story and educational pillars.',
  ARRAY(
    SELECT id FROM hashtag_groups
    WHERE (is_system = true OR user_id IS NULL)
    AND is_active = true
    AND name IN ('Brand Core', 'Mega Lifestyle', 'Large Mental Health', 'Niche Therapy', 'Niche Sanctuary')
  ),
  true,
  true
WHERE EXISTS (SELECT 1 FROM hashtag_groups WHERE name = 'Brand Core');

-- Home Decor Focus: Home styling & decor focused
-- Brand + Mega Home + Large Wall Art + Large Minimalist + Niche Bedroom + Niche Office
INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
SELECT
  'Home Decor Focus',
  'For home styling, decor, and product showcase content. Best for product_showcase and community pillars.',
  ARRAY(
    SELECT id FROM hashtag_groups
    WHERE (is_system = true OR user_id IS NULL)
    AND is_active = true
    AND name IN ('Brand Core', 'Mega Home', 'Large Wall Art', 'Large Minimalist', 'Niche Bedroom', 'Niche Office')
  ),
  true,
  true
WHERE EXISTS (SELECT 1 FROM hashtag_groups WHERE name = 'Brand Core');

-- Balanced Mix: Combination of both
-- Brand + Mega Home + Large Quotes + Niche Quote Art + Niche Sanctuary
INSERT INTO hashtag_rotation_sets (name, description, group_ids, is_system, is_active)
SELECT
  'Balanced Mix',
  'Balanced mix of home decor and therapeutic hashtags. Good all-purpose set.',
  ARRAY(
    SELECT id FROM hashtag_groups
    WHERE (is_system = true OR user_id IS NULL)
    AND is_active = true
    AND name IN ('Brand Core', 'Mega Home', 'Large Quotes', 'Niche Quote Art', 'Niche Sanctuary')
  ),
  true,
  true
WHERE EXISTS (SELECT 1 FROM hashtag_groups WHERE name = 'Brand Core');
