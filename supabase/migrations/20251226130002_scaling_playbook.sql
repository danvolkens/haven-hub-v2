-- 16-Week Scaling Playbook Progress Tracking
-- Track progress against Pinterest Scaling Playbook targets

-- Scaling playbook progress
CREATE TABLE IF NOT EXISTS scaling_playbook_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current phase (1-4)
  current_phase INTEGER NOT NULL DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 4),
  phase_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  playbook_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Phase targets (configurable per user)
  phase_targets JSONB NOT NULL DEFAULT '{
    "phase_1": {
      "name": "Foundation",
      "weeks": "1-4",
      "pins_per_week": 15,
      "boards_to_create": 5,
      "products_to_mockup": 20,
      "target_impressions": 10000
    },
    "phase_2": {
      "name": "Growth",
      "weeks": "5-8",
      "pins_per_week": 25,
      "ad_budget_daily": 10,
      "target_traffic": 500,
      "conversion_rate": 0.02
    },
    "phase_3": {
      "name": "Optimization",
      "weeks": "9-12",
      "pins_per_week": 35,
      "ad_budget_daily": 25,
      "target_roas": 2.0,
      "winner_refresh_count": 10
    },
    "phase_4": {
      "name": "Scale",
      "weeks": "13-16",
      "pins_per_week": 50,
      "ad_budget_daily": 50,
      "target_revenue": 5000,
      "automation_level": 0.8
    }
  }',

  -- Current week
  current_week INTEGER NOT NULL DEFAULT 1 CHECK (current_week BETWEEN 1 AND 16),

  -- Notes and customizations
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Weekly KPI snapshots
CREATE TABLE IF NOT EXISTS scaling_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 16),
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 4),
  snapshot_date DATE NOT NULL,

  -- Content Metrics
  pins_published INTEGER NOT NULL DEFAULT 0,
  boards_active INTEGER NOT NULL DEFAULT 0,
  products_mockuped INTEGER NOT NULL DEFAULT 0,

  -- Engagement Metrics
  impressions INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,4),

  -- Ad Metrics
  ad_spend NUMERIC(10,2) DEFAULT 0,
  ad_impressions INTEGER DEFAULT 0,
  ad_clicks INTEGER DEFAULT 0,
  ad_conversions INTEGER DEFAULT 0,
  ad_revenue NUMERIC(10,2) DEFAULT 0,
  ad_roas NUMERIC(5,2),

  -- Organic/Total Metrics
  organic_traffic INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,

  -- Goal Achievement
  goals_met JSONB NOT NULL DEFAULT '{}',
  overall_score NUMERIC(5,2), -- 0-100

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, week_number)
);

-- RLS policies
ALTER TABLE scaling_playbook_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own playbook progress"
  ON scaling_playbook_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own KPI snapshots"
  ON scaling_kpi_snapshots
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_scaling_progress_user ON scaling_playbook_progress(user_id);
CREATE INDEX idx_scaling_snapshots_user_week ON scaling_kpi_snapshots(user_id, week_number);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_scaling_playbook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scaling_playbook_progress_updated_at
  BEFORE UPDATE ON scaling_playbook_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_scaling_playbook_updated_at();
