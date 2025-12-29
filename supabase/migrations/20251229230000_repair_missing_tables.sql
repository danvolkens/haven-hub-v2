-- ============================================================================
-- Migration: 20251229230000_repair_missing_tables
-- Description: Add missing tables referenced in code but not in migrations
-- ============================================================================

-- ============================================================================
-- 1. instagram_posting_log - Track daily posting for streak calculation
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_posting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  posted_date DATE NOT NULL,
  post_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, posted_date)
);

CREATE INDEX IF NOT EXISTS idx_instagram_posting_log_user ON instagram_posting_log(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posting_log_date ON instagram_posting_log(user_id, posted_date);

ALTER TABLE instagram_posting_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'instagram_posting_log' AND policyname = 'instagram_posting_log_all') THEN
    CREATE POLICY instagram_posting_log_all ON instagram_posting_log FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 2. approvals - Simple view on approval_items for backwards compatibility
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'approvals' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_items') THEN
      DROP VIEW IF EXISTS approvals;
      CREATE VIEW approvals AS SELECT * FROM approval_items;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. pinterest_campaigns - Alias for ad_campaigns
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'pinterest_campaigns' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_campaigns') THEN
      DROP VIEW IF EXISTS pinterest_campaigns;
      CREATE VIEW pinterest_campaigns AS
      SELECT
        id,
        user_id,
        pinterest_campaign_id,
        name,
        objective,
        daily_spend_cap AS daily_budget,
        lifetime_spend_cap,
        status,
        start_date,
        end_date,
        total_spend AS spend_7d,
        conversions AS conversions_7d,
        clicks AS clicks_7d,
        impressions AS impressions_7d,
        collection,
        is_seasonal,
        seasonal_event,
        synced_at,
        created_at,
        updated_at
      FROM ad_campaigns;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. pinterest_ads - Alias for promoted_pins
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'pinterest_ads' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promoted_pins') THEN
      DROP VIEW IF EXISTS pinterest_ads;
      CREATE VIEW pinterest_ads AS SELECT * FROM promoted_pins;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. pinterest_analytics - Create if missing
-- ============================================================================
CREATE TABLE IF NOT EXISTS pinterest_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  closeups INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pin_id, date)
);

CREATE INDEX IF NOT EXISTS idx_pinterest_analytics_user ON pinterest_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pinterest_analytics_date ON pinterest_analytics(user_id, date);

ALTER TABLE pinterest_analytics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pinterest_analytics' AND policyname = 'pinterest_analytics_all') THEN
    CREATE POLICY pinterest_analytics_all ON pinterest_analytics FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 6. pinterest_audiences - Create if missing
-- ============================================================================
CREATE TABLE IF NOT EXISTS pinterest_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pinterest_audience_id TEXT,
  name TEXT NOT NULL,
  audience_type TEXT NOT NULL CHECK (audience_type IN (
    'customer_list', 'visitor', 'engagement', 'actalike'
  )),
  size INTEGER,
  status TEXT DEFAULT 'ready',
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pinterest_audiences_user ON pinterest_audiences(user_id);

ALTER TABLE pinterest_audiences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pinterest_audiences' AND policyname = 'pinterest_audiences_all') THEN
    CREATE POLICY pinterest_audiences_all ON pinterest_audiences FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 7. pinterest_campaign_metrics - Create if missing
-- ============================================================================
CREATE TABLE IF NOT EXISTS pinterest_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cpm DECIMAL(10,4),
  cpc DECIMAL(10,4),
  cpa DECIMAL(10,4),
  roas DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_pinterest_campaign_metrics_user ON pinterest_campaign_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_pinterest_campaign_metrics_campaign ON pinterest_campaign_metrics(campaign_id, date);

ALTER TABLE pinterest_campaign_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pinterest_campaign_metrics' AND policyname = 'pinterest_campaign_metrics_all') THEN
    CREATE POLICY pinterest_campaign_metrics_all ON pinterest_campaign_metrics FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 8. pinterest_conversions - Alias for pinterest_conversion_events
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'pinterest_conversions' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pinterest_conversion_events') THEN
      DROP VIEW IF EXISTS pinterest_conversions;
      CREATE VIEW pinterest_conversions AS SELECT * FROM pinterest_conversion_events;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 9. pin_analytics - Alias for pin_analytics_daily
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'pin_analytics' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pin_analytics_daily') THEN
      DROP VIEW IF EXISTS pin_analytics;
      CREATE VIEW pin_analytics AS SELECT * FROM pin_analytics_daily;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 10. popup_events - Create if missing
-- ============================================================================
CREATE TABLE IF NOT EXISTS popup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  popup_id UUID REFERENCES popups(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view', 'submit', 'close', 'click'
  )),
  visitor_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popup_events_popup ON popup_events(popup_id);
CREATE INDEX IF NOT EXISTS idx_popup_events_type ON popup_events(popup_id, event_type);

ALTER TABLE popup_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'popup_events' AND policyname = 'popup_events_all') THEN
    CREATE POLICY popup_events_all ON popup_events FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 11. template_performance - Already exists as materialized view, skip
-- ============================================================================
-- Note: template_performance is created as a materialized view in
-- 20251228400009_template_performance_view.sql - no action needed

-- ============================================================================
-- 12. user_activity - Alias for activity_log
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'user_activity' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
      DROP VIEW IF EXISTS user_activity;
      CREATE VIEW user_activity AS SELECT * FROM activity_log;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 13. customer_orders - Alias for shopify_orders
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'customer_orders' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopify_orders') THEN
      DROP VIEW IF EXISTS customer_orders;
      CREATE VIEW customer_orders AS SELECT * FROM shopify_orders;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 14. daily_metrics - Create if missing
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Pinterest metrics
  pinterest_impressions INTEGER DEFAULT 0,
  pinterest_saves INTEGER DEFAULT 0,
  pinterest_clicks INTEGER DEFAULT 0,

  -- Instagram metrics
  instagram_reach INTEGER DEFAULT 0,
  instagram_impressions INTEGER DEFAULT 0,
  instagram_engagement INTEGER DEFAULT 0,

  -- Revenue
  revenue DECIMAL(12,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_user ON daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(user_id, date);

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_metrics' AND policyname = 'daily_metrics_all') THEN
    CREATE POLICY daily_metrics_all ON daily_metrics FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 15. export_history - Alias for scheduled_exports
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'export_history' AND table_type = 'BASE TABLE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_exports') THEN
      DROP VIEW IF EXISTS export_history;
      CREATE VIEW export_history AS SELECT * FROM scheduled_exports;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- Add instagram_best_streak column to user_settings if missing
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_settings' AND column_name = 'instagram_best_streak') THEN
    ALTER TABLE user_settings ADD COLUMN instagram_best_streak INTEGER DEFAULT 0;
  END IF;
END $$;
