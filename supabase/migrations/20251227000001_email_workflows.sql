-- Email Workflows System
-- Supports automated Klaviyo flow creation and content management

-- Email Templates - stores HTML content and syncs with Klaviyo
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  html_content TEXT NOT NULL,
  klaviyo_template_id TEXT, -- Set after pushing to Klaviyo
  flow_type TEXT NOT NULL CHECK (flow_type IN ('welcome', 'quiz_result', 'cart_abandonment', 'post_purchase', 'win_back')),
  position INTEGER NOT NULL DEFAULT 1, -- Order in the flow (1, 2, 3, etc.)
  delay_hours INTEGER NOT NULL DEFAULT 0, -- Hours after previous email/trigger
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, flow_type, position)
);

-- Flow Blueprints - pre-built flow definitions
CREATE TABLE IF NOT EXISTS flow_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type TEXT NOT NULL UNIQUE CHECK (flow_type IN ('welcome', 'quiz_result', 'cart_abandonment', 'post_purchase', 'win_back')),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('list', 'metric')),
  trigger_config JSONB NOT NULL, -- { list_id: "...", metric_name: "...", etc. }
  default_delays JSONB NOT NULL DEFAULT '[]', -- [0, 48, 96, 168] (hours)
  conditions JSONB, -- Any conditional logic (e.g., quiz_result property)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flow Deployments - tracks flows created in Klaviyo
CREATE TABLE IF NOT EXISTS flow_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_blueprint_id UUID REFERENCES flow_blueprints(id) ON DELETE SET NULL,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('welcome', 'quiz_result', 'cart_abandonment', 'post_purchase', 'win_back')),
  klaviyo_flow_id TEXT, -- Set after creating in Klaviyo
  status TEXT NOT NULL DEFAULT 'not_created' CHECK (status IN ('not_created', 'draft', 'live', 'paused', 'error')),
  last_error TEXT,
  deployed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, flow_type)
);

-- Email Content Library - version-controlled email copy
CREATE TABLE IF NOT EXISTS email_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_content TEXT NOT NULL, -- Plain text/markdown version for editing
  variables JSONB DEFAULT '[]', -- ["first_name", "quiz_result", etc.]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(email_template_id, version)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_user_flow ON email_templates(user_id, flow_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_klaviyo_id ON email_templates(klaviyo_template_id);
CREATE INDEX IF NOT EXISTS idx_flow_deployments_user ON flow_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_deployments_status ON flow_deployments(status);
CREATE INDEX IF NOT EXISTS idx_email_content_library_template ON email_content_library(email_template_id);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_content_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Users can view own email templates"
  ON email_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own email templates"
  ON email_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email templates"
  ON email_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email templates"
  ON email_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for flow_blueprints (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view flow blueprints"
  ON flow_blueprints FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for flow_deployments
CREATE POLICY "Users can view own flow deployments"
  ON flow_deployments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flow deployments"
  ON flow_deployments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flow deployments"
  ON flow_deployments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flow deployments"
  ON flow_deployments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for email_content_library
CREATE POLICY "Users can view own email content"
  ON email_content_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own email content"
  ON email_content_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email content"
  ON email_content_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email content"
  ON email_content_library FOR DELETE
  USING (auth.uid() = user_id);

-- Seed the 5 flow blueprints
INSERT INTO flow_blueprints (flow_type, name, description, trigger_type, trigger_config, default_delays, conditions)
VALUES
  (
    'welcome',
    'Welcome Flow',
    'Convert new subscribers to first-time buyers over 7 days',
    'list',
    '{"list_name": "Haven Hub - All Leads", "action": "added"}',
    '[0, 48, 96, 168]',
    NULL
  ),
  (
    'quiz_result',
    'Quiz Result Flow',
    'Convert quiz takers with personalized recommendations over 5 days',
    'metric',
    '{"metric_name": "Quiz Completed", "properties": ["quiz_result"]}',
    '[0, 24, 72, 120]',
    '{"personalization_property": "quiz_result", "variants": ["Grounding", "Wholeness", "Growth"]}'
  ),
  (
    'cart_abandonment',
    'Cart Abandonment Flow',
    'Recover abandoned carts over 3 days',
    'metric',
    '{"metric_name": "Cart Abandoned", "properties": ["cart_items", "checkout_url"]}',
    '[1, 24, 72]',
    '{"exit_on": "Placed Order"}'
  ),
  (
    'post_purchase',
    'Post-Purchase Flow',
    'Ensure satisfaction, gather reviews, drive repeat purchases over 14 days',
    'metric',
    '{"metric_name": "Placed Order", "properties": ["items", "order_value"]}',
    '[0, 72, 168, 336]',
    '{"add_to_list": "Haven Hub - Customers"}'
  ),
  (
    'win_back',
    'Win-Back Flow',
    'Re-engage inactive customers over 7 days',
    'metric',
    '{"metric_name": "Win Back Started", "condition": "45+ days since order"}',
    '[0, 72, 168]',
    '{"exit_on": "Placed Order"}'
  )
ON CONFLICT (flow_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_type = EXCLUDED.trigger_type,
  trigger_config = EXCLUDED.trigger_config,
  default_delays = EXCLUDED.default_delays,
  conditions = EXCLUDED.conditions,
  updated_at = now();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_email_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_workflows_updated_at();

CREATE TRIGGER flow_blueprints_updated_at
  BEFORE UPDATE ON flow_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_email_workflows_updated_at();

CREATE TRIGGER flow_deployments_updated_at
  BEFORE UPDATE ON flow_deployments
  FOR EACH ROW EXECUTE FUNCTION update_email_workflows_updated_at();
