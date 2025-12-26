-- ============================================================================
-- FIX: Applying missing tables from 018_campaigns
-- ============================================================================

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN (
    'seasonal', 'launch', 'flash_sale', 'collection', 'evergreen'
  )),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_collections TEXT[] DEFAULT '{}',
  target_customer_stages TEXT[] DEFAULT '{}',
  theme TEXT,
  hashtags TEXT[] DEFAULT '{}',
  revenue_goal NUMERIC(12,2),
  order_goal INTEGER,
  lead_goal INTEGER,
  has_offer BOOLEAN NOT NULL DEFAULT false,
  offer_type TEXT CHECK (offer_type IN (
    'percentage_discount', 'fixed_discount', 'free_shipping', 'bogo', 'gift_with_purchase'
  )),
  offer_value NUMERIC(10,2),
  offer_code TEXT,
  featured_quote_ids UUID[] DEFAULT '{}',
  featured_asset_ids UUID[] DEFAULT '{}',
  featured_product_ids UUID[] DEFAULT '{}',
  channels JSONB NOT NULL DEFAULT '{"pinterest": true, "email": true, "ads": false}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'
  )),
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  pins_published INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaign Tasks Table
CREATE TABLE IF NOT EXISTS campaign_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'publish_pins', 'send_email', 'start_ads', 'pause_ads',
    'update_products', 'social_post', 'custom'
  )),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seasonal Templates Table
CREATE TABLE IF NOT EXISTS seasonal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  typical_start_month INTEGER NOT NULL,
  typical_start_day INTEGER NOT NULL,
  typical_duration_days INTEGER NOT NULL DEFAULT 7,
  default_theme TEXT,
  default_hashtags TEXT[] DEFAULT '{}',
  suggested_collections TEXT[] DEFAULT '{}',
  headline_templates TEXT[] DEFAULT '{}',
  description_templates TEXT[] DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seasonal_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_campaigns_status ON campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_seasonal_campaigns_dates ON campaigns(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_campaigns_active ON campaigns(user_id, start_date, end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_campaign_tasks_campaign ON campaign_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tasks_scheduled ON campaign_tasks(scheduled_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_seasonal_templates_user ON seasonal_templates(user_id);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_all ON campaigns;
CREATE POLICY campaigns_all ON campaigns FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS tasks_all ON campaign_tasks;
CREATE POLICY tasks_all ON campaign_tasks FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS templates_select ON seasonal_templates;
CREATE POLICY templates_select ON seasonal_templates FOR SELECT USING (is_system = true OR user_id = auth.uid());

DROP POLICY IF EXISTS templates_modify ON seasonal_templates;
CREATE POLICY templates_modify ON seasonal_templates FOR ALL USING (user_id = auth.uid() AND is_system = false);

-- Triggers
DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tasks_updated_at ON campaign_tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON campaign_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert system templates
INSERT INTO seasonal_templates (name, description, typical_start_month, typical_start_day, typical_duration_days, default_theme, default_hashtags, suggested_collections, is_system)
VALUES
  ('New Year', 'New Year resolution and fresh start campaign', 1, 1, 14, 'fresh_start', ARRAY['newyear', 'freshstart', '2025', 'newbeginnings'], ARRAY['growth'], true),
  ('Valentine''s Day', 'Self-love and relationships campaign', 2, 7, 10, 'love', ARRAY['valentines', 'selflove', 'loveyourself'], ARRAY['wholeness'], true),
  ('Spring Renewal', 'Spring cleaning and renewal campaign', 3, 15, 21, 'renewal', ARRAY['spring', 'renewal', 'freshstart', 'springcleaning'], ARRAY['growth', 'grounding'], true),
  ('Mother''s Day', 'Appreciation and nurturing campaign', 5, 1, 14, 'nurturing', ARRAY['mothersday', 'momlife', 'appreciation'], ARRAY['wholeness', 'grounding'], true),
  ('Mental Health Awareness', 'Mental health awareness month campaign', 5, 1, 31, 'awareness', ARRAY['mentalhealthawareness', 'mentalhealth', 'selfcare'], ARRAY['wholeness', 'grounding'], true),
  ('Back to School', 'New beginnings and routines campaign', 8, 15, 21, 'new_chapter', ARRAY['backtoschool', 'newbeginnings', 'routines'], ARRAY['growth'], true),
  ('Fall Cozy', 'Comfort and grounding campaign', 10, 1, 30, 'cozy', ARRAY['fall', 'cozy', 'hygge', 'autumn'], ARRAY['grounding'], true),
  ('Holiday Season', 'Holiday gratitude and giving campaign', 11, 20, 40, 'gratitude', ARRAY['holiday', 'gratitude', 'giving', 'thankful'], ARRAY['wholeness', 'grounding'], true)
ON CONFLICT DO NOTHING;

-- Function: Get upcoming campaigns
CREATE OR REPLACE FUNCTION get_upcoming_campaigns(p_user_id UUID, p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (id UUID, name TEXT, type TEXT, start_date DATE, end_date DATE, status TEXT, days_until_start INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.type, c.start_date, c.end_date, c.status,
    (c.start_date - CURRENT_DATE)::INTEGER AS days_until_start
  FROM campaigns c
  WHERE c.user_id = p_user_id
    AND c.start_date <= CURRENT_DATE + p_days_ahead
    AND c.end_date >= CURRENT_DATE
    AND c.status IN ('scheduled', 'active')
  ORDER BY c.start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
