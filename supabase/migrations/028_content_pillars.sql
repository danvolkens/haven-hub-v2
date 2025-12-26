-- ============================================================================
-- Migration: 028_content_pillars
-- Description: Content pillar tracking and performance optimization
-- Feature: Content mix strategy based on pillar performance
-- ============================================================================

-- ============================================================================
-- Content Pillars Definition Table
-- ============================================================================
CREATE TABLE content_pillars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  recommended_percentage INTEGER DEFAULT 20,
  display_order INTEGER DEFAULT 0
);

-- Seed with standard content pillars
INSERT INTO content_pillars (id, name, description, recommended_percentage, display_order) VALUES
  ('quote_reveal', 'Quote Reveal', 'Simple quote image with text reveal', 25, 1),
  ('transformation', 'Transformation', 'Before/after or journey content', 20, 2),
  ('educational', 'Educational', 'Tips, explanations, how-tos', 15, 3),
  ('lifestyle', 'Lifestyle', 'Styled room mockups, aesthetic content', 20, 4),
  ('behind_scenes', 'Behind the Scenes', 'Process, authenticity content', 10, 5),
  ('user_generated', 'User Generated', 'Customer photos and testimonials', 10, 6);

-- ============================================================================
-- Add content_pillar column to pins and assets tables
-- ============================================================================
ALTER TABLE pins ADD COLUMN content_pillar TEXT REFERENCES content_pillars(id);
ALTER TABLE assets ADD COLUMN content_pillar TEXT REFERENCES content_pillars(id);

-- Create index for filtering pins by content pillar
CREATE INDEX idx_pins_content_pillar ON pins(user_id, content_pillar) WHERE content_pillar IS NOT NULL;
CREATE INDEX idx_assets_content_pillar ON assets(user_id, content_pillar) WHERE content_pillar IS NOT NULL;

-- ============================================================================
-- Content Pillar Performance Table
-- Stores aggregated metrics by pillar per period
-- ============================================================================
CREATE TABLE content_pillar_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  pillar_id TEXT REFERENCES content_pillars(id) NOT NULL,
  platform TEXT NOT NULL DEFAULT 'pinterest',

  -- Period tracking
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'quarter')),
  period_start DATE NOT NULL,

  -- Raw metrics
  content_count INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,

  -- Calculated rates (stored for quick access)
  avg_ctr DECIMAL(6,4),
  avg_save_rate DECIMAL(6,4),

  -- Winner tracking
  winner_count INTEGER DEFAULT 0,
  winner_percentage DECIMAL(5,2),
  current_percentage DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, pillar_id, platform, period_type, period_start)
);

-- ============================================================================
-- Content Mix Recommendations Table
-- AI-generated recommendations for optimal content mix
-- ============================================================================
CREATE TABLE content_mix_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  pillar_id TEXT REFERENCES content_pillars(id) NOT NULL,
  platform TEXT NOT NULL DEFAULT 'pinterest',

  -- Recommendation data
  recommended_percentage INTEGER NOT NULL,
  current_percentage INTEGER,

  -- Reasoning and confidence
  reasoning JSONB,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  UNIQUE(user_id, pillar_id, platform)
);

-- ============================================================================
-- Indexes for efficient querying
-- ============================================================================
CREATE INDEX idx_pillar_perf_user ON content_pillar_performance(user_id, period_type, period_start DESC);
CREATE INDEX idx_pillar_perf_period ON content_pillar_performance(period_type, period_start);
CREATE INDEX idx_content_mix_user ON content_mix_recommendations(user_id, platform);
CREATE INDEX idx_content_mix_valid ON content_mix_recommendations(user_id, valid_until);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE content_pillar_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_mix_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for content_pillar_performance
CREATE POLICY pillar_perf_select ON content_pillar_performance
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY pillar_perf_insert ON content_pillar_performance
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY pillar_perf_update ON content_pillar_performance
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY pillar_perf_delete ON content_pillar_performance
  FOR DELETE USING (user_id = auth.uid());

-- Policies for content_mix_recommendations
CREATE POLICY content_mix_select ON content_mix_recommendations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY content_mix_insert ON content_mix_recommendations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY content_mix_update ON content_mix_recommendations
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY content_mix_delete ON content_mix_recommendations
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE TRIGGER pillar_perf_updated_at BEFORE UPDATE ON content_pillar_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER content_mix_updated_at BEFORE UPDATE ON content_mix_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Aggregate pillar performance for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION aggregate_pillar_performance(
  p_user_id UUID,
  p_period_type TEXT,
  p_period_start DATE
)
RETURNS VOID AS $$
DECLARE
  v_pillar RECORD;
  v_metrics RECORD;
  v_total_count INTEGER;
BEGIN
  -- Get total pin count for percentage calculation
  SELECT COUNT(*) INTO v_total_count
  FROM pins
  WHERE user_id = p_user_id
    AND status = 'published'
    AND content_pillar IS NOT NULL
    AND published_at >= p_period_start
    AND published_at < p_period_start +
      CASE p_period_type
        WHEN 'week' THEN INTERVAL '7 days'
        WHEN 'month' THEN INTERVAL '1 month'
        WHEN 'quarter' THEN INTERVAL '3 months'
      END;

  -- Aggregate metrics for each pillar
  FOR v_pillar IN SELECT id FROM content_pillars LOOP
    SELECT
      COUNT(*) as content_count,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(saves), 0) as saves,
      CASE WHEN SUM(impressions) > 0
        THEN SUM(clicks)::DECIMAL / SUM(impressions)
        ELSE 0
      END as avg_ctr,
      CASE WHEN SUM(impressions) > 0
        THEN SUM(saves)::DECIMAL / SUM(impressions)
        ELSE 0
      END as avg_save_rate,
      COUNT(*) FILTER (WHERE performance_tier = 'top') as winner_count
    INTO v_metrics
    FROM pins
    WHERE user_id = p_user_id
      AND content_pillar = v_pillar.id
      AND status = 'published'
      AND published_at >= p_period_start
      AND published_at < p_period_start +
        CASE p_period_type
          WHEN 'week' THEN INTERVAL '7 days'
          WHEN 'month' THEN INTERVAL '1 month'
          WHEN 'quarter' THEN INTERVAL '3 months'
        END;

    -- Upsert performance record
    INSERT INTO content_pillar_performance (
      user_id, pillar_id, platform, period_type, period_start,
      content_count, impressions, clicks, saves,
      avg_ctr, avg_save_rate, winner_count,
      winner_percentage, current_percentage
    ) VALUES (
      p_user_id, v_pillar.id, 'pinterest', p_period_type, p_period_start,
      v_metrics.content_count, v_metrics.impressions, v_metrics.clicks, v_metrics.saves,
      v_metrics.avg_ctr, v_metrics.avg_save_rate, v_metrics.winner_count,
      CASE WHEN v_metrics.content_count > 0
        THEN (v_metrics.winner_count::DECIMAL / v_metrics.content_count) * 100
        ELSE 0
      END,
      CASE WHEN v_total_count > 0
        THEN (v_metrics.content_count::DECIMAL / v_total_count) * 100
        ELSE 0
      END
    )
    ON CONFLICT (user_id, pillar_id, platform, period_type, period_start)
    DO UPDATE SET
      content_count = EXCLUDED.content_count,
      impressions = EXCLUDED.impressions,
      clicks = EXCLUDED.clicks,
      saves = EXCLUDED.saves,
      avg_ctr = EXCLUDED.avg_ctr,
      avg_save_rate = EXCLUDED.avg_save_rate,
      winner_count = EXCLUDED.winner_count,
      winner_percentage = EXCLUDED.winner_percentage,
      current_percentage = EXCLUDED.current_percentage,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
