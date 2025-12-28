-- ============================================================================
-- Video Selection Helper Functions
-- Prompt 4.1-4.3: Helper RPCs for footage, music, and hook selection
-- ============================================================================

-- Function to increment footage usage count
CREATE OR REPLACE FUNCTION increment_footage_usage(footage_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stock_footage
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = footage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment music track usage count
CREATE OR REPLACE FUNCTION increment_music_usage(track_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE music_tracks
  SET
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment hook usage count
CREATE OR REPLACE FUNCTION increment_hook_usage(hook_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE video_hooks
  SET
    usage_count = usage_count + 1
  WHERE id = hook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Pool Health Query Functions
-- ============================================================================

-- Get footage pool health for all collections
CREATE OR REPLACE FUNCTION get_footage_pool_health()
RETURNS TABLE (
  collection TEXT,
  total_count BIGINT,
  unused_count BIGINT,
  active_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sf.collection::TEXT,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE sf.usage_count = 0)::BIGINT as unused_count,
    COUNT(*) FILTER (WHERE sf.is_active = true)::BIGINT as active_count
  FROM stock_footage sf
  WHERE sf.orientation = 'portrait'
  GROUP BY sf.collection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get music pool health for all collections
CREATE OR REPLACE FUNCTION get_music_pool_health()
RETURNS TABLE (
  collection TEXT,
  total_count BIGINT,
  unused_count BIGINT,
  active_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.collection::TEXT,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE mt.usage_count = 0)::BIGINT as unused_count,
    COUNT(*) FILTER (WHERE mt.is_active = true)::BIGINT as active_count
  FROM music_tracks mt
  GROUP BY mt.collection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_footage_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_music_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_hook_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_footage_pool_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_music_pool_health() TO authenticated;
