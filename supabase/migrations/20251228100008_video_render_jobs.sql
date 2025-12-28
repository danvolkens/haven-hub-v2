-- ============================================================================
-- Video Render Jobs Table
-- Prompt 4.4: Track Creatomate render jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_render_jobs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  template_id TEXT,
  footage_id UUID REFERENCES stock_footage(id) ON DELETE SET NULL,
  music_id UUID REFERENCES music_tracks(id) ON DELETE SET NULL,
  hook_id UUID REFERENCES video_hooks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  video_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  estimated_completion_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_render_jobs_status ON video_render_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_render_jobs_quote ON video_render_jobs(quote_id);
CREATE INDEX IF NOT EXISTS idx_video_render_jobs_user ON video_render_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_render_jobs_created ON video_render_jobs(created_at DESC);

-- Updated at trigger
CREATE TRIGGER update_video_render_jobs_updated_at
  BEFORE UPDATE ON video_render_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE video_render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_render_jobs_select ON video_render_jobs
  FOR SELECT USING (
    user_id IS NULL OR auth.uid() = user_id
  );

CREATE POLICY video_render_jobs_insert ON video_render_jobs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY video_render_jobs_update ON video_render_jobs
  FOR UPDATE USING (
    user_id IS NULL OR auth.uid() = user_id
  );

-- Allow service role full access
CREATE POLICY video_render_jobs_service ON video_render_jobs
  FOR ALL USING (
    auth.role() = 'service_role'
  );
