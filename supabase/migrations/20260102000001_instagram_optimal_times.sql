-- ============================================================================
-- Migration: Instagram Optimal Times Table
-- Description: Stores learned optimal posting times based on engagement data
-- ============================================================================

-- Create instagram_optimal_times table if it doesn't exist
CREATE TABLE IF NOT EXISTS instagram_optimal_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  engagement_score NUMERIC(5,2) DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, hour)
);

-- Add missing columns if table already exists with different schema
DO $$
BEGIN
  -- Add engagement_score if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instagram_optimal_times'
                 AND column_name = 'engagement_score') THEN
    ALTER TABLE instagram_optimal_times ADD COLUMN engagement_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Add sample_size if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instagram_optimal_times'
                 AND column_name = 'sample_size') THEN
    ALTER TABLE instagram_optimal_times ADD COLUMN sample_size INTEGER DEFAULT 0;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instagram_optimal_times'
                 AND column_name = 'updated_at') THEN
    ALTER TABLE instagram_optimal_times ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add index for user queries
CREATE INDEX IF NOT EXISTS idx_instagram_optimal_times_user
  ON instagram_optimal_times(user_id);

-- Add index for sorting by engagement (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'instagram_optimal_times'
             AND column_name = 'engagement_score') THEN
    CREATE INDEX IF NOT EXISTS idx_instagram_optimal_times_engagement
      ON instagram_optimal_times(user_id, engagement_score DESC);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE instagram_optimal_times ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own optimal times
CREATE POLICY "Users can view own optimal times"
  ON instagram_optimal_times FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own optimal times
CREATE POLICY "Users can insert own optimal times"
  ON instagram_optimal_times FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own optimal times
CREATE POLICY "Users can update own optimal times"
  ON instagram_optimal_times FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own optimal times
CREATE POLICY "Users can delete own optimal times"
  ON instagram_optimal_times FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update optimal times from engagement data
CREATE OR REPLACE FUNCTION update_instagram_optimal_times(
  p_user_id UUID,
  p_day_of_week INTEGER,
  p_hour INTEGER,
  p_engagement_rate NUMERIC
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO instagram_optimal_times (user_id, day_of_week, hour, engagement_score, sample_size)
  VALUES (p_user_id, p_day_of_week, p_hour, p_engagement_rate, 1)
  ON CONFLICT (user_id, day_of_week, hour)
  DO UPDATE SET
    engagement_score = (instagram_optimal_times.engagement_score * instagram_optimal_times.sample_size + p_engagement_rate) / (instagram_optimal_times.sample_size + 1),
    sample_size = instagram_optimal_times.sample_size + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default optimal times for new users (based on general Instagram best practices)
-- This function can be called when a user first sets up Instagram integration
CREATE OR REPLACE FUNCTION seed_default_optimal_times(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  days INTEGER[] := ARRAY[0, 1, 2, 3, 4, 5, 6];
  d INTEGER;
BEGIN
  -- Best times based on general Instagram research:
  -- Weekdays: 11am-1pm, 7-9pm
  -- Weekends: 10am-12pm
  FOREACH d IN ARRAY days
  LOOP
    IF d IN (0, 6) THEN -- Weekend
      INSERT INTO instagram_optimal_times (user_id, day_of_week, hour, engagement_score, sample_size)
      VALUES
        (p_user_id, d, 10, 8.5, 0),
        (p_user_id, d, 11, 9.0, 0),
        (p_user_id, d, 12, 8.0, 0)
      ON CONFLICT (user_id, day_of_week, hour) DO NOTHING;
    ELSE -- Weekday
      INSERT INTO instagram_optimal_times (user_id, day_of_week, hour, engagement_score, sample_size)
      VALUES
        (p_user_id, d, 11, 8.0, 0),
        (p_user_id, d, 12, 8.5, 0),
        (p_user_id, d, 13, 8.0, 0),
        (p_user_id, d, 19, 9.0, 0),
        (p_user_id, d, 20, 9.5, 0),
        (p_user_id, d, 21, 8.5, 0)
      ON CONFLICT (user_id, day_of_week, hour) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
