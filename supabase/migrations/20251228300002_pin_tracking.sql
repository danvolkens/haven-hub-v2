-- ============================================================================
-- Migration: 20251228300002_pin_tracking
-- Description: Add tracked_link column for UTM tracking on pins
-- ============================================================================

-- Add tracked_link column to store the UTM-tagged destination URL
ALTER TABLE pins ADD COLUMN IF NOT EXISTS tracked_link TEXT;

-- Add mood column if it doesn't exist (used for UTM term)
ALTER TABLE pins ADD COLUMN IF NOT EXISTS mood VARCHAR(50);

-- Comment for documentation
COMMENT ON COLUMN pins.tracked_link IS 'Destination URL with UTM parameters for attribution tracking';
COMMENT ON COLUMN pins.mood IS 'Quote mood used for content targeting and UTM term';
