-- ============================================================================
-- Migration: 027_creative_health
-- Description: Creative fatigue detection and health tracking
-- Feature: Creative Health Monitoring
-- ============================================================================

-- ============================================================================
-- Creative Health Table
-- Tracks baseline performance and fatigue scores for pins/ads/assets
-- ============================================================================
CREATE TABLE creative_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Content identification
  content_type TEXT NOT NULL CHECK (content_type IN ('pin', 'ad_creative', 'asset')),
  content_id UUID NOT NULL,

  -- Baseline metrics (captured after 7 days or 1000 impressions)
  baseline_ctr DECIMAL(6,4),
  baseline_engagement_rate DECIMAL(6,4),
  baseline_save_rate DECIMAL(6,4),
  baseline_captured_at TIMESTAMPTZ,
  baseline_impressions INTEGER,

  -- Current metrics (rolling 7-day window)
  current_ctr DECIMAL(6,4),
  current_engagement_rate DECIMAL(6,4),
  current_save_rate DECIMAL(6,4),
  current_impressions INTEGER,
  last_metrics_update TIMESTAMPTZ,

  -- Fatigue tracking
  fatigue_score INTEGER DEFAULT 0 CHECK (fatigue_score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'pending_baseline' CHECK (status IN (
    'pending_baseline',  -- Not enough data yet
    'healthy',           -- 0-25% fatigue
    'declining',         -- 26-50% fatigue
    'fatigued',          -- 51-75% fatigue
    'critical'           -- 76-100% fatigue
  )),

  -- Historical metrics for trend analysis
  metrics_history JSONB DEFAULT '[]',

  -- Activity tracking
  days_active INTEGER DEFAULT 0,
  days_since_baseline INTEGER DEFAULT 0,

  -- Refresh recommendations
  refresh_recommended BOOLEAN DEFAULT false,
  refresh_recommended_at TIMESTAMPTZ,
  refresh_reason TEXT,

  -- Refresh history
  last_refresh_at TIMESTAMPTZ,
  refresh_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Unique constraint: one health record per content item per user
CREATE UNIQUE INDEX idx_creative_health_content
  ON creative_health(user_id, content_type, content_id);

-- Quick lookup by status
CREATE INDEX idx_creative_health_status
  ON creative_health(user_id, status);

-- Find fatigued content quickly
CREATE INDEX idx_creative_health_fatigued
  ON creative_health(user_id, fatigue_score DESC)
  WHERE fatigue_score > 50;

-- Find content needing refresh
CREATE INDEX idx_creative_health_refresh
  ON creative_health(user_id, refresh_recommended)
  WHERE refresh_recommended = true;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE creative_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY creative_health_all
  ON creative_health
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Trigger: Auto-update status based on fatigue score
-- ============================================================================
CREATE OR REPLACE FUNCTION update_creative_health_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine status based on fatigue score
  IF NEW.baseline_ctr IS NULL THEN
    NEW.status := 'pending_baseline';
  ELSIF NEW.fatigue_score <= 25 THEN
    NEW.status := 'healthy';
  ELSIF NEW.fatigue_score <= 50 THEN
    NEW.status := 'declining';
  ELSIF NEW.fatigue_score <= 75 THEN
    NEW.status := 'fatigued';
  ELSE
    NEW.status := 'critical';
  END IF;

  -- Auto-recommend refresh when critical
  IF NEW.fatigue_score >= 75 AND (OLD.refresh_recommended IS NULL OR NOT OLD.refresh_recommended) THEN
    NEW.refresh_recommended := true;
    NEW.refresh_recommended_at := NOW();
    NEW.refresh_reason := 'Fatigue score exceeded 75%';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creative_health_status_trigger
  BEFORE UPDATE OF fatigue_score ON creative_health
  FOR EACH ROW EXECUTE FUNCTION update_creative_health_status();

-- ============================================================================
-- Trigger: Updated at timestamp
-- ============================================================================
CREATE TRIGGER creative_health_updated_at
  BEFORE UPDATE ON creative_health
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Get creative health summary for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_creative_health_summary(p_user_id UUID)
RETURNS TABLE (
  total_tracked BIGINT,
  pending_baseline BIGINT,
  healthy BIGINT,
  declining BIGINT,
  fatigued BIGINT,
  critical BIGINT,
  refresh_recommended BIGINT,
  avg_fatigue_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tracked,
    COUNT(*) FILTER (WHERE status = 'pending_baseline')::BIGINT as pending_baseline,
    COUNT(*) FILTER (WHERE status = 'healthy')::BIGINT as healthy,
    COUNT(*) FILTER (WHERE status = 'declining')::BIGINT as declining,
    COUNT(*) FILTER (WHERE status = 'fatigued')::BIGINT as fatigued,
    COUNT(*) FILTER (WHERE status = 'critical')::BIGINT as critical,
    COUNT(*) FILTER (WHERE ch.refresh_recommended = true)::BIGINT as refresh_recommended,
    COALESCE(AVG(fatigue_score) FILTER (WHERE baseline_ctr IS NOT NULL), 0)::NUMERIC as avg_fatigue_score
  FROM creative_health ch
  WHERE ch.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
