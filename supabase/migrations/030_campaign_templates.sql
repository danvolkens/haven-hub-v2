-- Campaign Templates System
-- Phase 2+ templates unlock based on sales milestones

-- Campaign templates table
CREATE TABLE campaign_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL,
  default_daily_budget DECIMAL(10,2) NOT NULL,
  targeting_type TEXT NOT NULL CHECK (targeting_type IN ('interest', 'keyword', 'retargeting', 'lookalike')),
  targeting_presets JSONB DEFAULT '{}',
  phase INTEGER NOT NULL DEFAULT 1,
  min_sales_required INTEGER DEFAULT 0,
  min_purchases_for_lookalike INTEGER DEFAULT 0,
  requires_pixel_data BOOLEAN DEFAULT false,
  requires_audience TEXT,
  is_recommended BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all templates (Phase 1, 2, 3)
INSERT INTO campaign_templates (id, name, description, objective, default_daily_budget, targeting_type, targeting_presets, phase, min_sales_required, min_purchases_for_lookalike, requires_pixel_data, requires_audience, is_recommended, display_order) VALUES
  ('mh-core-traffic', 'MH-Core-Traffic', 'Mental health audience', 'CONSIDERATION', 5.00, 'interest', '{"interests": ["mental health", "therapy", "counseling"]}', 1, 0, 0, false, null, true, 1),
  ('hd-core-traffic', 'HD-Core-Traffic', 'Home decor audience', 'CONSIDERATION', 4.00, 'interest', '{"interests": ["home decor", "interior design", "minimalism"]}', 1, 0, 0, false, null, true, 2),
  ('rt-site-visitors', 'RT-SiteVisitors', 'Retarget website visitors', 'CONVERSIONS', 2.00, 'retargeting', '{"audience_type": "site_visitors"}', 1, 0, 0, true, 'site_visitors', true, 3),
  ('b2b-therapists', 'TO-Core-Traffic', 'Professional therapists', 'CONSIDERATION', 3.00, 'interest', '{"interests": ["therapy practice", "counseling"]}', 1, 0, 0, false, null, false, 4),
  ('kw-core', 'KW-Core', 'Search intent keywords', 'CONSIDERATION', 4.00, 'keyword', '{"keywords": ["wall art quotes", "printable quotes", "therapy office decor"]}', 2, 50, 0, false, null, true, 5),
  ('lal-purchasers-1pct', 'LAL-Purchasers1pct', 'Lookalike 1% of purchasers', 'CONSIDERATION', 8.00, 'lookalike', '{"source": "purchasers", "percentage": 1}', 2, 50, 50, true, 'purchasers', true, 6),
  ('rt-cart-abandon', 'RT-CartAbandon', 'Retarget cart abandoners', 'CONVERSIONS', 2.00, 'retargeting', '{"audience_type": "cart_abandoners"}', 3, 100, 0, true, 'cart_abandoners', true, 7);

-- User campaign milestones tracking
CREATE TABLE user_campaign_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_sales INTEGER DEFAULT 0,
  total_purchasers INTEGER DEFAULT 0,
  has_pixel_data BOOLEAN DEFAULT false,
  has_site_visitors_audience BOOLEAN DEFAULT false,
  has_cart_abandoners_audience BOOLEAN DEFAULT false,
  has_purchasers_audience BOOLEAN DEFAULT false,
  phase_2_unlocked_at TIMESTAMPTZ,
  phase_3_unlocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_campaign_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own milestones
CREATE POLICY milestones_all ON user_campaign_milestones
  FOR ALL USING (user_id = auth.uid());

-- Create index for fast lookups
CREATE INDEX idx_user_campaign_milestones_user_id ON user_campaign_milestones(user_id);

-- Create index for template ordering
CREATE INDEX idx_campaign_templates_display_order ON campaign_templates(display_order);
CREATE INDEX idx_campaign_templates_phase ON campaign_templates(phase);
