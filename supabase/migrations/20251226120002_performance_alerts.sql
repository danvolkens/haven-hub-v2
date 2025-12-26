-- Enhanced Performance Alerts (Event-Based)
-- V1 Reference: Prompt 8 - Performance Alerts

-- Performance alert rules
CREATE TABLE performance_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'pin_milestone', 'pin_underperformer', 'campaign_cpa',
    'campaign_roas', 'daily_spend', 'winner_detected'
  )),

  -- Conditions
  metric TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  threshold NUMERIC NOT NULL,

  -- Actions
  send_email BOOLEAN NOT NULL DEFAULT true,
  send_push BOOLEAN NOT NULL DEFAULT false,
  create_task BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert history
CREATE TABLE performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES performance_alert_rules(id) ON DELETE SET NULL,

  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Reference to the entity that triggered the alert
  reference_id UUID,
  reference_table TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'dismissed')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alert_rules_user ON performance_alert_rules(user_id, is_active);
CREATE INDEX idx_alerts_user_status ON performance_alerts(user_id, status, created_at DESC);
CREATE INDEX idx_alerts_unread ON performance_alerts(user_id, status) WHERE status IN ('pending', 'sent');

-- Enable RLS
ALTER TABLE performance_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for alert rules
CREATE POLICY "Users can view own alert rules"
  ON performance_alert_rules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert rules"
  ON performance_alert_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert rules"
  ON performance_alert_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert rules"
  ON performance_alert_rules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for alerts
CREATE POLICY "Users can view own alerts"
  ON performance_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON performance_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role policies
CREATE POLICY "Service role full access to alert rules"
  ON performance_alert_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to alerts"
  ON performance_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Default alert rules (inserted when user signs up - handled by trigger or API)
-- These are examples:
-- - Pin reaches 1000 impressions (milestone)
-- - Pin CTR drops below 0.5% (underperformer)
-- - Campaign CPA exceeds $10 (efficiency)
-- - Campaign ROAS drops below 1.5 (profitability)
-- - Daily spend exceeds budget by 20% (budget)
-- - Pin detected as potential winner (opportunity)
