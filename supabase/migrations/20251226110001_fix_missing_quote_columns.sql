-- ============================================================================
-- Repair Migration: Add missing master image columns to quotes
-- Issue: Migration 20250101000024_quote_master_images.sql was recorded as applied
-- but the columns were never actually created in production
-- ============================================================================

-- Add master image columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS master_image_url TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS master_image_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN quotes.master_image_url IS 'URL to the uploaded master quote image (optional)';
COMMENT ON COLUMN quotes.master_image_key IS 'Storage key for the master image (for deletion)';

-- Add index for faster lookups of quotes with master images
CREATE INDEX IF NOT EXISTS idx_quotes_has_master_image
ON quotes ((master_image_url IS NOT NULL))
WHERE master_image_url IS NOT NULL;
