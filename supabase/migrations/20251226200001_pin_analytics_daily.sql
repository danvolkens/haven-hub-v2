-- ============================================================================
-- Migration: Pin Analytics Daily Table
-- Description: Stores daily snapshots of pin analytics for trend tracking
-- ============================================================================

-- Create pin_analytics_daily table for storing daily metrics snapshots
CREATE TABLE IF NOT EXISTS pin_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE NOT NULL,

  -- Date for this snapshot
  date DATE NOT NULL,

  -- Metrics
  impressions INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  outbound_clicks INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,4),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint to prevent duplicate daily entries
  UNIQUE(pin_id, date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pin_analytics_daily_user ON pin_analytics_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_analytics_daily_pin ON pin_analytics_daily(pin_id);
CREATE INDEX IF NOT EXISTS idx_pin_analytics_daily_date ON pin_analytics_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_pin_analytics_daily_pin_date ON pin_analytics_daily(pin_id, date DESC);

-- Enable RLS
ALTER TABLE pin_analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY pin_analytics_daily_all ON pin_analytics_daily
  FOR ALL USING (user_id = auth.uid());

-- Grant access to service role for cron jobs
GRANT SELECT, INSERT, UPDATE ON pin_analytics_daily TO service_role;
