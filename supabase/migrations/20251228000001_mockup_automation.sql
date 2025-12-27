-- ============================================================================
-- Migration: 20251228000001_mockup_automation
-- Description: Add mockup automation support - default templates and settings
-- Feature: Mockup Auto-Generation on Quote Approval
-- ============================================================================

-- ============================================================================
-- Add is_default column to mockup_scene_templates
-- ============================================================================
ALTER TABLE mockup_scene_templates
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Create index for faster default template lookups
CREATE INDEX IF NOT EXISTS idx_mockup_templates_default
ON mockup_scene_templates(user_id, is_default)
WHERE is_default = true;

-- ============================================================================
-- Helper function: Get default templates for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_default_mockup_templates(p_user_id UUID)
RETURNS SETOF mockup_scene_templates AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM mockup_scene_templates
  WHERE (user_id = p_user_id OR is_system = true)
    AND is_active = true
    AND is_default = true
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper function: Set template as default
-- ============================================================================
CREATE OR REPLACE FUNCTION set_template_default(
  p_user_id UUID,
  p_template_id UUID,
  p_is_default BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE mockup_scene_templates
  SET is_default = p_is_default,
      updated_at = NOW()
  WHERE id = p_template_id
    AND (user_id = p_user_id OR is_system = true);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper function: Get mockup automation settings from guardrails
-- ============================================================================
CREATE OR REPLACE FUNCTION get_mockup_automation_settings(p_user_id UUID)
RETURNS TABLE (
  auto_generate BOOLEAN,
  use_defaults BOOLEAN,
  max_per_quote INTEGER,
  notify_on_complete BOOLEAN
) AS $$
DECLARE
  v_guardrails JSONB;
BEGIN
  SELECT guardrails INTO v_guardrails
  FROM user_settings
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    COALESCE((v_guardrails->>'mockup_auto_generate')::BOOLEAN, false),
    COALESCE((v_guardrails->>'mockup_use_defaults')::BOOLEAN, true),
    COALESCE((v_guardrails->>'mockup_max_per_quote')::INTEGER, 5),
    COALESCE((v_guardrails->>'mockup_notify_on_complete')::BOOLEAN, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper function: Update mockup automation settings
-- ============================================================================
CREATE OR REPLACE FUNCTION update_mockup_automation_settings(
  p_user_id UUID,
  p_auto_generate BOOLEAN DEFAULT NULL,
  p_use_defaults BOOLEAN DEFAULT NULL,
  p_max_per_quote INTEGER DEFAULT NULL,
  p_notify_on_complete BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_guardrails JSONB;
  v_updated INTEGER;
BEGIN
  -- Get current guardrails
  SELECT guardrails INTO v_guardrails
  FROM user_settings
  WHERE user_id = p_user_id;

  -- Update only provided fields
  IF p_auto_generate IS NOT NULL THEN
    v_guardrails = jsonb_set(v_guardrails, '{mockup_auto_generate}', to_jsonb(p_auto_generate));
  END IF;

  IF p_use_defaults IS NOT NULL THEN
    v_guardrails = jsonb_set(v_guardrails, '{mockup_use_defaults}', to_jsonb(p_use_defaults));
  END IF;

  IF p_max_per_quote IS NOT NULL THEN
    v_guardrails = jsonb_set(v_guardrails, '{mockup_max_per_quote}', to_jsonb(p_max_per_quote));
  END IF;

  IF p_notify_on_complete IS NOT NULL THEN
    v_guardrails = jsonb_set(v_guardrails, '{mockup_notify_on_complete}', to_jsonb(p_notify_on_complete));
  END IF;

  -- Update user settings
  UPDATE user_settings
  SET guardrails = v_guardrails,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN mockup_scene_templates.is_default IS
'When true, this template is included in auto-generation when quotes are approved';
