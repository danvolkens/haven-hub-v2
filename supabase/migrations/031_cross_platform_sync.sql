-- ============================================================================
-- Migration: 031_cross_platform_sync
-- Description: Platform connections and cross-platform metrics for TikTok/Instagram
-- Feature: Cross-Platform Performance Sync with Winner Detection
-- ============================================================================

-- ============================================================================
-- Platform Connections Table
-- Stores OAuth credentials for TikTok and Instagram
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'pinterest')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- ============================================================================
-- Cross-Platform Metrics Table
-- Daily metrics snapshots for cross-platform content
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES cross_platform_content(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(6,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, metric_date)
);

-- ============================================================================
-- Add columns to existing cross_platform_content if they don't exist
-- ============================================================================
DO $$
BEGIN
  -- Add platform_content_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cross_platform_content' AND column_name = 'platform_content_id'
  ) THEN
    ALTER TABLE cross_platform_content ADD COLUMN platform_content_id TEXT;
  END IF;

  -- Add thumbnail_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cross_platform_content' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE cross_platform_content ADD COLUMN thumbnail_url TEXT;
  END IF;

  -- Add caption if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cross_platform_content' AND column_name = 'caption'
  ) THEN
    ALTER TABLE cross_platform_content ADD COLUMN caption TEXT;
  END IF;

  -- Add quote_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cross_platform_content' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE cross_platform_content ADD COLUMN quote_id UUID REFERENCES quotes(id);
  END IF;

  -- Add published_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cross_platform_content' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE cross_platform_content ADD COLUMN published_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_platform_conn_user ON platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_conn_status ON platform_connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_xp_metrics_content ON cross_platform_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_xp_metrics_date ON cross_platform_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_xp_metrics_user ON cross_platform_metrics(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create
DROP POLICY IF EXISTS platform_conn_all ON platform_connections;
CREATE POLICY platform_conn_all ON platform_connections FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS xp_metrics_all ON cross_platform_metrics;
CREATE POLICY xp_metrics_all ON cross_platform_metrics FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- Triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_platform_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_connections_updated_at ON platform_connections;
CREATE TRIGGER platform_connections_updated_at
  BEFORE UPDATE ON platform_connections
  FOR EACH ROW EXECUTE FUNCTION update_platform_connections_updated_at();

-- ============================================================================
-- Function: Detect cross-platform winners
-- Content is a winner if engagement_rate > 5% or performance_score > 70
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_cross_platform_winners(p_user_id UUID)
RETURNS TABLE (
  content_id UUID,
  platform TEXT,
  engagement_rate DECIMAL,
  performance_score INTEGER,
  is_new_winner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH winner_candidates AS (
    SELECT
      c.id,
      c.platform,
      c.engagement_rate,
      c.performance_score,
      c.is_winner AS was_winner,
      CASE
        WHEN c.engagement_rate >= 0.05 OR c.performance_score >= 70 THEN true
        ELSE false
      END AS should_be_winner
    FROM cross_platform_content c
    WHERE c.user_id = p_user_id
      AND c.views >= 1000  -- Minimum views threshold
  )
  SELECT
    wc.id AS content_id,
    wc.platform,
    wc.engagement_rate,
    wc.performance_score,
    (wc.should_be_winner AND NOT wc.was_winner) AS is_new_winner
  FROM winner_candidates wc
  WHERE wc.should_be_winner;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Get cross-platform analytics summary
-- ============================================================================
CREATE OR REPLACE FUNCTION get_cross_platform_summary(
  p_user_id UUID,
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  platform TEXT,
  total_content INTEGER,
  total_views BIGINT,
  total_engagement BIGINT,
  avg_engagement_rate DECIMAL,
  winners_count INTEGER,
  adapted_to_pinterest INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.platform,
    COUNT(DISTINCT c.id)::INTEGER AS total_content,
    COALESCE(SUM(c.views), 0) AS total_views,
    COALESCE(SUM(c.likes + c.comments + c.shares + c.saves), 0) AS total_engagement,
    ROUND(AVG(c.engagement_rate), 4) AS avg_engagement_rate,
    COUNT(DISTINCT CASE WHEN c.is_winner THEN c.id END)::INTEGER AS winners_count,
    COUNT(DISTINCT CASE WHEN c.adapted_to_pinterest THEN c.id END)::INTEGER AS adapted_to_pinterest
  FROM cross_platform_content c
  WHERE c.user_id = p_user_id
    AND c.posted_at >= p_start_date
    AND c.posted_at <= p_end_date
  GROUP BY c.platform;
END;
$$ LANGUAGE plpgsql;
