-- ============================================================================
-- Migration: 040_shopify_orders
-- Description: Shopify orders tracking for attribution and analytics
-- ============================================================================

-- ============================================================================
-- Shopify Orders Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shopify_order_id TEXT NOT NULL,
  shopify_order_number TEXT,

  -- Customer reference
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  email TEXT,

  -- Order details
  total_price NUMERIC(10,2),
  subtotal_price NUMERIC(10,2),
  total_tax NUMERIC(10,2),
  total_discounts NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',

  -- Status
  financial_status TEXT, -- pending, paid, refunded, etc.
  fulfillment_status TEXT, -- null, partial, fulfilled

  -- Line items (JSONB for flexibility)
  line_items JSONB DEFAULT '[]',

  -- Attribution
  attributed_pin_id UUID,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Landing page / referrer
  landing_page TEXT,
  referring_site TEXT,

  -- Timestamps
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, shopify_order_id)
);

-- ============================================================================
-- Shopify Webhook Events Log (for debugging/auditing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  shopify_id TEXT, -- order_id, customer_id, etc.
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_shopify_orders_user ON shopify_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_email ON shopify_orders(user_id, email);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer ON shopify_orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created ON shopify_orders(user_id, shopify_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_financial ON shopify_orders(user_id, financial_status);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_attribution ON shopify_orders(user_id, utm_source, utm_campaign);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON shopify_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_topic ON shopify_webhook_events(topic);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON shopify_webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed ON shopify_webhook_events(processed) WHERE processed = false;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY shopify_orders_all ON shopify_orders FOR ALL USING (user_id = auth.uid());
CREATE POLICY webhook_events_all ON shopify_webhook_events FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- Updated At Trigger
-- ============================================================================
CREATE TRIGGER shopify_orders_updated_at
  BEFORE UPDATE ON shopify_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Add last_webhook_at to shopify_webhooks for health tracking
-- ============================================================================
ALTER TABLE shopify_webhooks
ADD COLUMN IF NOT EXISTS last_received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receive_count INTEGER DEFAULT 0;

-- Add unique constraint for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shopify_webhooks_user_topic_unique'
  ) THEN
    ALTER TABLE shopify_webhooks ADD CONSTRAINT shopify_webhooks_user_topic_unique
    UNIQUE (user_id, topic);
  END IF;
END $$;
