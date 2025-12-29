-- ============================================================================
-- Migration: 20251229220000_fix_schema_columns
-- Description: Fix column name mismatches between API code and database schema
-- ============================================================================

-- ============================================================================
-- 1. Fix stock_footage table
-- API expects: duration, url, thumbnail_url
-- Current: duration_seconds, video_url, source_url (no thumbnail_url)
-- ============================================================================

-- Add missing columns (if table exists)
DO $$
BEGIN
  -- Add duration column (alias for duration_seconds)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_footage') THEN
    -- Add url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'stock_footage' AND column_name = 'url') THEN
      ALTER TABLE stock_footage ADD COLUMN url TEXT;
      -- Copy from video_url
      UPDATE stock_footage SET url = video_url WHERE url IS NULL;
    END IF;

    -- Add thumbnail_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'stock_footage' AND column_name = 'thumbnail_url') THEN
      ALTER TABLE stock_footage ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Add duration column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'stock_footage' AND column_name = 'duration') THEN
      ALTER TABLE stock_footage ADD COLUMN duration INTEGER;
      -- Copy from duration_seconds
      UPDATE stock_footage SET duration = duration_seconds WHERE duration IS NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 2. Fix instagram_scheduled_posts table
-- API expects: media_urls
-- Current: no media_urls column
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagram_scheduled_posts') THEN
    -- Add media_urls column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'instagram_scheduled_posts' AND column_name = 'media_urls') THEN
      ALTER TABLE instagram_scheduled_posts ADD COLUMN media_urls TEXT[] DEFAULT '{}';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. Fix abandoned_checkouts table
-- API expects: customer_email
-- Current: email column
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'abandoned_checkouts') THEN
    -- Add customer_email column if missing (as alias for email)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'abandoned_checkouts' AND column_name = 'customer_email') THEN
      ALTER TABLE abandoned_checkouts ADD COLUMN customer_email TEXT;
      -- Copy from email
      UPDATE abandoned_checkouts SET customer_email = email WHERE customer_email IS NULL;
    END IF;
  END IF;
END $$;
