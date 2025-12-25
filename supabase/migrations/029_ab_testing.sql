-- A/B Testing Framework
-- Structured creative testing with statistical significance

-- Main A/B tests table
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,

  test_type TEXT NOT NULL CHECK (test_type IN (
    'pin_creative', 'headline', 'description', 'hook', 'cta', 'audience', 'schedule'
  )),

  control_variant_id UUID NOT NULL,
  test_variant_ids UUID[] NOT NULL,
  traffic_split JSONB NOT NULL DEFAULT '{"control": 50, "test": 50}',

  primary_metric TEXT NOT NULL DEFAULT 'ctr' CHECK (primary_metric IN (
    'ctr', 'save_rate', 'conversion_rate', 'engagement_rate', 'cpa', 'roas'
  )),

  confidence_threshold DECIMAL(3,2) DEFAULT 0.95,
  minimum_sample_size INTEGER DEFAULT 1000,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),

  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,

  winner_variant_id UUID,
  winner_declared_at TIMESTAMPTZ,
  winner_confidence DECIMAL(5,4),
  results_summary JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test variants
CREATE TABLE ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  is_control BOOLEAN DEFAULT false,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  variant_config JSONB DEFAULT '{}',
  traffic_percentage INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily results per variant
CREATE TABLE ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  result_date DATE NOT NULL,

  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,

  ctr DECIMAL(6,4),
  save_rate DECIMAL(6,4),
  conversion_rate DECIMAL(6,4),

  cumulative_impressions INTEGER DEFAULT 0,
  cumulative_conversions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(test_id, variant_id, result_date)
);

-- Indexes for performance
CREATE INDEX idx_ab_tests_user ON ab_tests(user_id, status);
CREATE INDEX idx_ab_tests_status ON ab_tests(status) WHERE status = 'running';
CREATE INDEX idx_ab_variants_test ON ab_test_variants(test_id);
CREATE INDEX idx_ab_results_test ON ab_test_results(test_id, result_date);
CREATE INDEX idx_ab_results_variant ON ab_test_results(variant_id, result_date);

-- Enable RLS
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY ab_tests_all ON ab_tests FOR ALL USING (user_id = auth.uid());
CREATE POLICY ab_variants_all ON ab_test_variants FOR ALL USING (user_id = auth.uid());
CREATE POLICY ab_results_all ON ab_test_results FOR ALL USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ab_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_test_updated_at();

-- Function to get test statistics
CREATE OR REPLACE FUNCTION get_ab_test_stats(p_test_id UUID)
RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  is_control BOOLEAN,
  total_impressions BIGINT,
  total_clicks BIGINT,
  total_saves BIGINT,
  total_conversions BIGINT,
  total_spend DECIMAL(12,2),
  overall_ctr DECIMAL(8,6),
  overall_save_rate DECIMAL(8,6),
  overall_conversion_rate DECIMAL(8,6)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as variant_id,
    v.name as variant_name,
    v.is_control,
    COALESCE(SUM(r.impressions), 0)::BIGINT as total_impressions,
    COALESCE(SUM(r.clicks), 0)::BIGINT as total_clicks,
    COALESCE(SUM(r.saves), 0)::BIGINT as total_saves,
    COALESCE(SUM(r.conversions), 0)::BIGINT as total_conversions,
    COALESCE(SUM(r.spend), 0)::DECIMAL(12,2) as total_spend,
    CASE
      WHEN SUM(r.impressions) > 0
      THEN (SUM(r.clicks)::DECIMAL / SUM(r.impressions))::DECIMAL(8,6)
      ELSE 0
    END as overall_ctr,
    CASE
      WHEN SUM(r.impressions) > 0
      THEN (SUM(r.saves)::DECIMAL / SUM(r.impressions))::DECIMAL(8,6)
      ELSE 0
    END as overall_save_rate,
    CASE
      WHEN SUM(r.impressions) > 0
      THEN (SUM(r.conversions)::DECIMAL / SUM(r.impressions))::DECIMAL(8,6)
      ELSE 0
    END as overall_conversion_rate
  FROM ab_test_variants v
  LEFT JOIN ab_test_results r ON r.variant_id = v.id
  WHERE v.test_id = p_test_id
  GROUP BY v.id, v.name, v.is_control
  ORDER BY v.is_control DESC, v.name;
END;
$$ LANGUAGE plpgsql;
