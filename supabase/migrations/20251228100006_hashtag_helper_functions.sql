-- ============================================================================
-- Migration: 20251228100006_hashtag_helper_functions
-- Description: Additional helper functions for hashtag generation
-- Feature: Instagram & Video Automation (Prompt 2.4)
-- ============================================================================

-- Increment rotation set usage
CREATE OR REPLACE FUNCTION increment_rotation_set_usage(p_set_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hashtag_rotation_sets
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_set_id;
END;
$$;

-- Increment hashtag group usage
CREATE OR REPLACE FUNCTION increment_hashtag_group_usage(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hashtag_groups
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_group_id;
END;
$$;

-- Get hashtag statistics
CREATE OR REPLACE FUNCTION get_hashtag_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  tier VARCHAR,
  group_count BIGINT,
  total_hashtags BIGINT,
  total_usage BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hg.tier,
    COUNT(DISTINCT hg.id) as group_count,
    SUM(array_length(hg.hashtags, 1))::BIGINT as total_hashtags,
    SUM(hg.usage_count)::BIGINT as total_usage
  FROM hashtag_groups hg
  WHERE hg.is_active = true
    AND (hg.user_id IS NULL OR hg.user_id = p_user_id)
  GROUP BY hg.tier
  ORDER BY
    CASE hg.tier
      WHEN 'brand' THEN 1
      WHEN 'mega' THEN 2
      WHEN 'large' THEN 3
      WHEN 'niche' THEN 4
    END;
END;
$$;
