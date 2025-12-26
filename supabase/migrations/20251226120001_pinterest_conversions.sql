-- Pinterest Conversion API (Server-Side Events)
-- V1 Reference: Prompt 12 - Pinterest Conversion API

-- Pinterest conversion events table
CREATE TABLE pinterest_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_name TEXT NOT NULL CHECK (event_name IN (
    'page_visit', 'view_category', 'search', 'add_to_cart',
    'checkout', 'lead', 'signup', 'watch_video', 'custom'
  )),
  event_id TEXT NOT NULL, -- For deduplication
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User identification
  email_hash TEXT, -- SHA-256 hashed
  phone_hash TEXT, -- SHA-256 hashed
  click_id TEXT, -- Pinterest click ID (epik)
  external_id TEXT, -- Your customer ID, hashed

  -- Event data
  currency TEXT DEFAULT 'USD',
  value NUMERIC(10,2),
  content_ids TEXT[], -- Product IDs
  content_name TEXT,
  content_category TEXT,
  num_items INTEGER,
  order_id TEXT,

  -- Attribution
  action_source TEXT NOT NULL DEFAULT 'web',
  partner_name TEXT DEFAULT 'haven_hub',

  -- Processing
  sent_to_pinterest BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  pinterest_response JSONB,
  error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, event_id)
);

-- Index for pending events to send
CREATE INDEX idx_pinterest_events_pending ON pinterest_conversion_events(user_id, sent_to_pinterest)
  WHERE sent_to_pinterest = false;

-- Index for user's events
CREATE INDEX idx_pinterest_events_user ON pinterest_conversion_events(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE pinterest_conversion_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own conversion events"
  ON pinterest_conversion_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversion events"
  ON pinterest_conversion_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversion events"
  ON pinterest_conversion_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access"
  ON pinterest_conversion_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
