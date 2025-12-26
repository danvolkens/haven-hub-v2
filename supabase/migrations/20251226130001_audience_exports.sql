-- Pinterest Audience Exports
-- Export customer segments as hashed emails for Pinterest Custom Audiences

-- Audience export jobs
CREATE TABLE IF NOT EXISTS audience_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Segment info
  name TEXT NOT NULL,
  description TEXT,
  segment_criteria JSONB NOT NULL DEFAULT '{}',

  -- Pinterest audience
  pinterest_audience_id TEXT,
  pinterest_audience_name TEXT,

  -- Export details
  total_profiles INTEGER NOT NULL DEFAULT 0,
  matched_profiles INTEGER, -- Returned by Pinterest
  last_profile_count INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'exporting', 'exported', 'synced', 'error'
  )),
  error TEXT,

  -- Sync settings
  auto_sync BOOLEAN NOT NULL DEFAULT false,
  sync_frequency TEXT CHECK (sync_frequency IN ('daily', 'weekly', 'monthly')),
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE audience_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own audience exports"
  ON audience_exports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_audience_exports_user ON audience_exports(user_id);
CREATE INDEX idx_audience_exports_status ON audience_exports(user_id, status);
CREATE INDEX idx_audience_exports_next_sync ON audience_exports(next_sync_at)
  WHERE auto_sync = true AND next_sync_at IS NOT NULL;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_audience_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audience_exports_updated_at
  BEFORE UPDATE ON audience_exports
  FOR EACH ROW
  EXECUTE FUNCTION update_audience_exports_updated_at();
