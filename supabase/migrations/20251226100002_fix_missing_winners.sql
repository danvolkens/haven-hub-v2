-- ============================================================================
-- FIX: Applying missing tables from 022_winners_exports
-- ============================================================================

-- Pin Winners Table
CREATE TABLE IF NOT EXISTS pin_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE NOT NULL,
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth', 'uncategorized')),
  rank INTEGER NOT NULL,
  score NUMERIC(10,2) NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pin_id)
);

-- Exports Table
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  export_type TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv', 'json')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  row_count INTEGER,
  file_url TEXT,
  file_path TEXT,
  fields_included TEXT[],
  date_range JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pin Schedule History
CREATE TABLE IF NOT EXISTS pin_schedule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add is_winner column to pins
ALTER TABLE pins ADD COLUMN IF NOT EXISTS is_winner BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pin_winners_user ON pin_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_winners_collection ON pin_winners(user_id, collection);
CREATE INDEX IF NOT EXISTS idx_pin_winners_rank ON pin_winners(user_id, collection, rank);
CREATE INDEX IF NOT EXISTS idx_exports_user ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exports_type ON exports(user_id, export_type);
CREATE INDEX IF NOT EXISTS idx_pin_schedule_history_pin ON pin_schedule_history(pin_id);
CREATE INDEX IF NOT EXISTS idx_pins_is_winner ON pins(user_id, is_winner) WHERE is_winner = true;

-- RLS
ALTER TABLE pin_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_schedule_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pin_winners_all ON pin_winners;
CREATE POLICY pin_winners_all ON pin_winners FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS exports_all ON exports;
CREATE POLICY exports_all ON exports FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS pin_schedule_history_all ON pin_schedule_history;
CREATE POLICY pin_schedule_history_all ON pin_schedule_history FOR ALL
  USING (pin_id IN (SELECT id FROM pins WHERE user_id = auth.uid()));
