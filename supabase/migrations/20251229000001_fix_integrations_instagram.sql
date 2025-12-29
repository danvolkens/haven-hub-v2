-- ============================================================================
-- Migration: 20251229000001_fix_integrations_instagram
-- Description: Add 'instagram' and 'tiktok' to integrations provider check constraint
-- ============================================================================

-- Drop the old check constraint
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

-- Add new check constraint that includes instagram and tiktok
ALTER TABLE integrations ADD CONSTRAINT integrations_provider_check
  CHECK (provider = ANY (ARRAY[
    'shopify',
    'pinterest',
    'klaviyo',
    'dynamic_mockups',
    'resend',
    'sky_pilot',
    'instagram',
    'tiktok'
  ]));
