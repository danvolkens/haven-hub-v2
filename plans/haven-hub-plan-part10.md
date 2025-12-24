# Haven Hub: Complete Implementation Task Plan
## Part 10: Phases 17-19 (Customer Journey, Win-Back, Loyalty)

---

# Phase 17: Customer Journey Tracking

## Step 17.1: Create Customer Journey Database Schema

- **Task**: Create database schema for tracking customer touchpoints and journey stages.

- **Files**:

### `supabase/migrations/014_customer_journey.sql`
```sql
-- ============================================================================
-- Migration: 014_customer_journey
-- Description: Customer journey tracking and touchpoints
-- Feature: 17 (Customer Journey)
-- ============================================================================

-- ============================================================================
-- Customers Table (unified view from Shopify + Leads)
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- External references
  shopify_customer_id TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  klaviyo_profile_id TEXT,
  
  -- Contact info
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Journey stage
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN (
    'visitor',      -- Anonymous visitor
    'lead',         -- Captured email
    'prospect',     -- Engaged but not purchased
    'customer',     -- Made first purchase
    'repeat',       -- Made 2+ purchases
    'vip',          -- High value customer
    'at_risk',      -- Hasn't engaged recently
    'churned'       -- Inactive for extended period
  )),
  
  -- Stage timestamps
  became_lead_at TIMESTAMPTZ,
  became_customer_at TIMESTAMPTZ,
  became_repeat_at TIMESTAMPTZ,
  became_vip_at TIMESTAMPTZ,
  became_at_risk_at TIMESTAMPTZ,
  became_churned_at TIMESTAMPTZ,
  
  -- Engagement metrics
  total_orders INTEGER NOT NULL DEFAULT 0,
  lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  average_order_value NUMERIC(10,2),
  
  -- Collection affinity
  primary_collection TEXT CHECK (primary_collection IN ('grounding', 'wholeness', 'growth')),
  collection_scores JSONB DEFAULT '{"grounding": 0, "wholeness": 0, "growth": 0}',
  
  -- Last activity
  last_email_open_at TIMESTAMPTZ,
  last_email_click_at TIMESTAMPTZ,
  last_site_visit_at TIMESTAMPTZ,
  last_purchase_at TIMESTAMPTZ,
  
  -- Communication preferences
  email_subscribed BOOLEAN NOT NULL DEFAULT true,
  sms_subscribed BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, email)
);

-- ============================================================================
-- Touchpoints Table (all customer interactions)
-- ============================================================================
CREATE TABLE touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Touchpoint details
  type TEXT NOT NULL CHECK (type IN (
    'page_view',
    'email_open',
    'email_click',
    'pin_save',
    'pin_click',
    'ad_click',
    'quiz_start',
    'quiz_complete',
    'lead_capture',
    'cart_add',
    'checkout_start',
    'checkout_abandon',
    'purchase',
    'review',
    'support_ticket'
  )),
  
  -- Source/channel
  channel TEXT NOT NULL CHECK (channel IN (
    'organic',
    'pinterest',
    'email',
    'ads',
    'direct',
    'referral',
    'social'
  )),
  
  -- Reference data
  reference_id TEXT,
  reference_type TEXT,
  
  -- Context
  metadata JSONB DEFAULT '{}',
  -- { page_url, pin_id, email_campaign_id, product_id, etc. }
  
  -- Value (for purchases)
  value NUMERIC(10,2),
  
  -- Collection (if applicable)
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  
  -- Attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Journey Stage Transitions Table
-- ============================================================================
CREATE TABLE stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Transition
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  
  -- Trigger
  trigger_type TEXT NOT NULL, -- 'purchase', 'time_based', 'engagement', 'manual'
  trigger_reference_id TEXT,
  
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Customer Segments Table
-- ============================================================================
CREATE TABLE customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Segment definition
  name TEXT NOT NULL,
  description TEXT,
  
  -- Filter criteria
  criteria JSONB NOT NULL DEFAULT '{}',
  -- { stages: [], collections: [], min_ltv: 0, max_days_since_purchase: 90, etc. }
  
  -- Klaviyo sync
  klaviyo_segment_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  
  -- Counts
  customer_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_dynamic BOOLEAN NOT NULL DEFAULT true, -- Auto-update membership
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Segment Membership Table
-- ============================================================================
CREATE TABLE segment_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  
  UNIQUE(segment_id, customer_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_email ON customers(user_id, email);
CREATE INDEX idx_customers_stage ON customers(user_id, stage);
CREATE INDEX idx_customers_shopify ON customers(shopify_customer_id) WHERE shopify_customer_id IS NOT NULL;
CREATE INDEX idx_customers_collection ON customers(user_id, primary_collection);
CREATE INDEX idx_customers_ltv ON customers(user_id, lifetime_value DESC);

CREATE INDEX idx_touchpoints_customer ON touchpoints(customer_id);
CREATE INDEX idx_touchpoints_type ON touchpoints(user_id, type);
CREATE INDEX idx_touchpoints_channel ON touchpoints(user_id, channel);
CREATE INDEX idx_touchpoints_occurred ON touchpoints(user_id, occurred_at DESC);

CREATE INDEX idx_transitions_customer ON stage_transitions(customer_id);
CREATE INDEX idx_transitions_stage ON stage_transitions(user_id, to_stage);

CREATE INDEX idx_segments_user ON customer_segments(user_id);
CREATE INDEX idx_memberships_segment ON segment_memberships(segment_id);
CREATE INDEX idx_memberships_customer ON segment_memberships(customer_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_all ON customers FOR ALL USING (user_id = auth.uid());
CREATE POLICY touchpoints_all ON touchpoints FOR ALL USING (user_id = auth.uid());
CREATE POLICY transitions_all ON stage_transitions FOR ALL USING (user_id = auth.uid());
CREATE POLICY segments_all ON customer_segments FOR ALL USING (user_id = auth.uid());

-- Memberships accessed through segment
CREATE POLICY memberships_select ON segment_memberships FOR SELECT 
  USING (EXISTS (SELECT 1 FROM customer_segments WHERE id = segment_id AND user_id = auth.uid()));

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER segments_updated_at BEFORE UPDATE ON customer_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Update customer stage
-- ============================================================================
CREATE OR REPLACE FUNCTION update_customer_stage(
  p_customer_id UUID,
  p_trigger_type TEXT DEFAULT 'engagement'
)
RETURNS TEXT AS $$
DECLARE
  v_customer RECORD;
  v_new_stage TEXT;
  v_old_stage TEXT;
  v_days_since_purchase INTEGER;
  v_days_since_engagement INTEGER;
BEGIN
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  v_old_stage := v_customer.stage;
  v_new_stage := v_old_stage;
  
  -- Calculate days since last activity
  v_days_since_purchase := EXTRACT(DAY FROM NOW() - COALESCE(v_customer.last_purchase_at, v_customer.created_at));
  v_days_since_engagement := EXTRACT(DAY FROM NOW() - GREATEST(
    COALESCE(v_customer.last_email_click_at, v_customer.created_at),
    COALESCE(v_customer.last_site_visit_at, v_customer.created_at),
    COALESCE(v_customer.last_purchase_at, v_customer.created_at)
  ));
  
  -- Determine new stage based on metrics
  IF v_customer.total_orders = 0 THEN
    IF v_customer.became_lead_at IS NOT NULL THEN
      IF v_days_since_engagement > 30 THEN
        v_new_stage := 'at_risk';
      ELSE
        v_new_stage := 'prospect';
      END IF;
    ELSE
      v_new_stage := 'visitor';
    END IF;
  ELSIF v_customer.total_orders = 1 THEN
    IF v_days_since_purchase > 90 THEN
      v_new_stage := 'at_risk';
    ELSE
      v_new_stage := 'customer';
    END IF;
  ELSIF v_customer.total_orders >= 2 THEN
    IF v_customer.lifetime_value >= 500 THEN
      v_new_stage := 'vip';
    ELSIF v_days_since_purchase > 120 THEN
      v_new_stage := 'at_risk';
    ELSE
      v_new_stage := 'repeat';
    END IF;
  END IF;
  
  -- Check for churned (180+ days no engagement)
  IF v_days_since_engagement > 180 AND v_old_stage IN ('at_risk', 'customer', 'repeat') THEN
    v_new_stage := 'churned';
  END IF;
  
  -- Update if changed
  IF v_new_stage != v_old_stage THEN
    UPDATE customers SET
      stage = v_new_stage,
      became_at_risk_at = CASE WHEN v_new_stage = 'at_risk' THEN NOW() ELSE became_at_risk_at END,
      became_churned_at = CASE WHEN v_new_stage = 'churned' THEN NOW() ELSE became_churned_at END,
      updated_at = NOW()
    WHERE id = p_customer_id;
    
    -- Record transition
    INSERT INTO stage_transitions (user_id, customer_id, from_stage, to_stage, trigger_type)
    VALUES (v_customer.user_id, p_customer_id, v_old_stage, v_new_stage, p_trigger_type);
  END IF;
  
  RETURN v_new_stage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Calculate collection affinity
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_collection_affinity(p_customer_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_scores JSONB;
  v_primary TEXT;
BEGIN
  SELECT jsonb_build_object(
    'grounding', COALESCE(SUM(CASE WHEN collection = 'grounding' THEN 
      CASE type 
        WHEN 'purchase' THEN 10
        WHEN 'cart_add' THEN 3
        WHEN 'pin_save' THEN 2
        WHEN 'pin_click' THEN 1
        ELSE 0.5
      END
    ELSE 0 END), 0),
    'wholeness', COALESCE(SUM(CASE WHEN collection = 'wholeness' THEN 
      CASE type 
        WHEN 'purchase' THEN 10
        WHEN 'cart_add' THEN 3
        WHEN 'pin_save' THEN 2
        WHEN 'pin_click' THEN 1
        ELSE 0.5
      END
    ELSE 0 END), 0),
    'growth', COALESCE(SUM(CASE WHEN collection = 'growth' THEN 
      CASE type 
        WHEN 'purchase' THEN 10
        WHEN 'cart_add' THEN 3
        WHEN 'pin_save' THEN 2
        WHEN 'pin_click' THEN 1
        ELSE 0.5
      END
    ELSE 0 END), 0)
  ) INTO v_scores
  FROM touchpoints
  WHERE customer_id = p_customer_id AND collection IS NOT NULL;
  
  -- Determine primary collection
  SELECT CASE 
    WHEN (v_scores->>'grounding')::NUMERIC >= (v_scores->>'wholeness')::NUMERIC 
      AND (v_scores->>'grounding')::NUMERIC >= (v_scores->>'growth')::NUMERIC THEN 'grounding'
    WHEN (v_scores->>'wholeness')::NUMERIC >= (v_scores->>'growth')::NUMERIC THEN 'wholeness'
    ELSE 'growth'
  END INTO v_primary;
  
  UPDATE customers SET
    collection_scores = v_scores,
    primary_collection = v_primary,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN v_scores;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/customer-journey.ts`
```typescript
export interface Customer {
  id: string;
  user_id: string;
  shopify_customer_id: string | null;
  lead_id: string | null;
  klaviyo_profile_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  stage: CustomerStage;
  became_lead_at: string | null;
  became_customer_at: string | null;
  became_repeat_at: string | null;
  became_vip_at: string | null;
  became_at_risk_at: string | null;
  became_churned_at: string | null;
  total_orders: number;
  lifetime_value: number;
  average_order_value: number | null;
  primary_collection: 'grounding' | 'wholeness' | 'growth' | null;
  collection_scores: CollectionScores;
  last_email_open_at: string | null;
  last_email_click_at: string | null;
  last_site_visit_at: string | null;
  last_purchase_at: string | null;
  email_subscribed: boolean;
  sms_subscribed: boolean;
  created_at: string;
  updated_at: string;
}

export type CustomerStage = 
  | 'visitor' 
  | 'lead' 
  | 'prospect' 
  | 'customer' 
  | 'repeat' 
  | 'vip' 
  | 'at_risk' 
  | 'churned';

export interface CollectionScores {
  grounding: number;
  wholeness: number;
  growth: number;
}

export interface Touchpoint {
  id: string;
  user_id: string;
  customer_id: string;
  type: TouchpointType;
  channel: TouchpointChannel;
  reference_id: string | null;
  reference_type: string | null;
  metadata: Record<string, unknown>;
  value: number | null;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  occurred_at: string;
  created_at: string;
}

export type TouchpointType = 
  | 'page_view'
  | 'email_open'
  | 'email_click'
  | 'pin_save'
  | 'pin_click'
  | 'ad_click'
  | 'quiz_start'
  | 'quiz_complete'
  | 'lead_capture'
  | 'cart_add'
  | 'checkout_start'
  | 'checkout_abandon'
  | 'purchase'
  | 'review'
  | 'support_ticket';

export type TouchpointChannel = 
  | 'organic'
  | 'pinterest'
  | 'email'
  | 'ads'
  | 'direct'
  | 'referral'
  | 'social';

export interface StageTransition {
  id: string;
  user_id: string;
  customer_id: string;
  from_stage: CustomerStage;
  to_stage: CustomerStage;
  trigger_type: string;
  trigger_reference_id: string | null;
  transitioned_at: string;
}

export interface CustomerSegment {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  criteria: SegmentCriteria;
  klaviyo_segment_id: string | null;
  sync_enabled: boolean;
  last_synced_at: string | null;
  customer_count: number;
  is_dynamic: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SegmentCriteria {
  stages?: CustomerStage[];
  collections?: string[];
  min_ltv?: number;
  max_ltv?: number;
  min_orders?: number;
  max_orders?: number;
  min_days_since_purchase?: number;
  max_days_since_purchase?: number;
  email_subscribed?: boolean;
}
```

- **Step Dependencies**: Step 14.1
- **User Instructions**: Run migration

---

## Step 17.2: Implement Customer Journey Service

- **Task**: Create the service for tracking touchpoints and managing customer stages.

- **Files**:

### `lib/customers/journey-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { 
  Customer, 
  Touchpoint, 
  TouchpointType, 
  TouchpointChannel,
  CustomerSegment,
  SegmentCriteria 
} from '@/types/customer-journey';

export async function recordTouchpoint(
  userId: string,
  email: string,
  touchpoint: {
    type: TouchpointType;
    channel: TouchpointChannel;
    referenceId?: string;
    referenceType?: string;
    metadata?: Record<string, unknown>;
    value?: number;
    collection?: 'grounding' | 'wholeness' | 'growth';
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    // Get or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('email', email)
      .single();

    if (!customer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          email,
          stage: 'visitor',
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }
      customer = newCustomer;
    }

    // Record touchpoint
    const { error: touchpointError } = await supabase
      .from('touchpoints')
      .insert({
        user_id: userId,
        customer_id: customer.id,
        type: touchpoint.type,
        channel: touchpoint.channel,
        reference_id: touchpoint.referenceId,
        reference_type: touchpoint.referenceType,
        metadata: touchpoint.metadata || {},
        value: touchpoint.value,
        collection: touchpoint.collection,
        utm_source: touchpoint.utmSource,
        utm_medium: touchpoint.utmMedium,
        utm_campaign: touchpoint.utmCampaign,
      });

    if (touchpointError) {
      throw new Error(touchpointError.message);
    }

    // Update customer last activity
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (touchpoint.type === 'email_open') {
      updateData.last_email_open_at = new Date().toISOString();
    } else if (touchpoint.type === 'email_click') {
      updateData.last_email_click_at = new Date().toISOString();
    } else if (touchpoint.type === 'page_view') {
      updateData.last_site_visit_at = new Date().toISOString();
    } else if (touchpoint.type === 'purchase') {
      updateData.last_purchase_at = new Date().toISOString();
      updateData.total_orders = supabase.sql`total_orders + 1`;
      if (touchpoint.value) {
        updateData.lifetime_value = supabase.sql`lifetime_value + ${touchpoint.value}`;
      }
    } else if (touchpoint.type === 'lead_capture') {
      updateData.became_lead_at = new Date().toISOString();
      updateData.stage = 'lead';
    }

    await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customer.id);

    // Update stage if needed
    await supabase.rpc('update_customer_stage', {
      p_customer_id: customer.id,
      p_trigger_type: touchpoint.type,
    });

    // Update collection affinity
    if (touchpoint.collection) {
      await supabase.rpc('calculate_collection_affinity', {
        p_customer_id: customer.id,
      });
    }

    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error('Record touchpoint error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCustomerJourney(
  userId: string,
  customerId: string
): Promise<{
  customer: Customer | null;
  touchpoints: Touchpoint[];
  transitions: any[];
}> {
  const supabase = createServerSupabaseClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('user_id', userId)
    .single();

  const { data: touchpoints } = await supabase
    .from('touchpoints')
    .select('*')
    .eq('customer_id', customerId)
    .order('occurred_at', { ascending: false })
    .limit(100);

  const { data: transitions } = await supabase
    .from('stage_transitions')
    .select('*')
    .eq('customer_id', customerId)
    .order('transitioned_at', { ascending: false });

  return {
    customer: customer as Customer | null,
    touchpoints: (touchpoints || []) as Touchpoint[],
    transitions: transitions || [],
  };
}

export async function evaluateSegmentMembership(
  userId: string,
  segmentId: string
): Promise<{ added: number; removed: number }> {
  const supabase = createServerSupabaseClient();
  let added = 0;
  let removed = 0;

  const { data: segment } = await supabase
    .from('customer_segments')
    .select('*')
    .eq('id', segmentId)
    .eq('user_id', userId)
    .single();

  if (!segment || !segment.is_dynamic) {
    return { added: 0, removed: 0 };
  }

  const criteria = segment.criteria as SegmentCriteria;

  // Build query for matching customers
  let query = supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId);

  if (criteria.stages && criteria.stages.length > 0) {
    query = query.in('stage', criteria.stages);
  }

  if (criteria.collections && criteria.collections.length > 0) {
    query = query.in('primary_collection', criteria.collections);
  }

  if (criteria.min_ltv !== undefined) {
    query = query.gte('lifetime_value', criteria.min_ltv);
  }

  if (criteria.max_ltv !== undefined) {
    query = query.lte('lifetime_value', criteria.max_ltv);
  }

  if (criteria.min_orders !== undefined) {
    query = query.gte('total_orders', criteria.min_orders);
  }

  if (criteria.max_orders !== undefined) {
    query = query.lte('total_orders', criteria.max_orders);
  }

  if (criteria.email_subscribed !== undefined) {
    query = query.eq('email_subscribed', criteria.email_subscribed);
  }

  const { data: matchingCustomers } = await query;
  const matchingIds = new Set(matchingCustomers?.map((c) => c.id) || []);

  // Get current members
  const { data: currentMembers } = await supabase
    .from('segment_memberships')
    .select('customer_id')
    .eq('segment_id', segmentId)
    .is('removed_at', null);

  const currentIds = new Set(currentMembers?.map((m) => m.customer_id) || []);

  // Add new members
  for (const id of matchingIds) {
    if (!currentIds.has(id)) {
      await supabase.from('segment_memberships').insert({
        segment_id: segmentId,
        customer_id: id,
      });
      added++;
    }
  }

  // Remove non-matching members
  for (const id of currentIds) {
    if (!matchingIds.has(id)) {
      await supabase
        .from('segment_memberships')
        .update({ removed_at: new Date().toISOString() })
        .eq('segment_id', segmentId)
        .eq('customer_id', id);
      removed++;
    }
  }

  // Update segment count
  await supabase
    .from('customer_segments')
    .update({ customer_count: matchingIds.size })
    .eq('id', segmentId);

  return { added, removed };
}

export async function getJourneyAnalytics(userId: string): Promise<{
  stageDistribution: Record<string, number>;
  collectionDistribution: Record<string, number>;
  conversionFunnel: {
    visitors: number;
    leads: number;
    customers: number;
    repeat: number;
  };
  atRiskCount: number;
  avgLifetimeValue: number;
}> {
  const supabase = createServerSupabaseClient();

  const { data: customers } = await supabase
    .from('customers')
    .select('stage, primary_collection, lifetime_value')
    .eq('user_id', userId);

  if (!customers || customers.length === 0) {
    return {
      stageDistribution: {},
      collectionDistribution: {},
      conversionFunnel: { visitors: 0, leads: 0, customers: 0, repeat: 0 },
      atRiskCount: 0,
      avgLifetimeValue: 0,
    };
  }

  const stageDistribution: Record<string, number> = {};
  const collectionDistribution: Record<string, number> = {};
  let totalLtv = 0;
  let atRiskCount = 0;

  for (const customer of customers) {
    stageDistribution[customer.stage] = (stageDistribution[customer.stage] || 0) + 1;
    
    if (customer.primary_collection) {
      collectionDistribution[customer.primary_collection] = 
        (collectionDistribution[customer.primary_collection] || 0) + 1;
    }
    
    totalLtv += customer.lifetime_value || 0;
    
    if (customer.stage === 'at_risk') {
      atRiskCount++;
    }
  }

  return {
    stageDistribution,
    collectionDistribution,
    conversionFunnel: {
      visitors: stageDistribution['visitor'] || 0,
      leads: (stageDistribution['lead'] || 0) + (stageDistribution['prospect'] || 0),
      customers: stageDistribution['customer'] || 0,
      repeat: (stageDistribution['repeat'] || 0) + (stageDistribution['vip'] || 0),
    },
    atRiskCount,
    avgLifetimeValue: customers.length > 0 ? totalLtv / customers.length : 0,
  };
}
```

- **Step Dependencies**: Step 17.1
- **User Instructions**: None

---

## Step 17.3: Create Customer Journey API and UI

- **Task**: Build API endpoints and dashboard for customer journey visualization.

- **Files**:

### `app/api/customers/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const querySchema = z.object({
  stage: z.string().optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { stage, collection, search, limit, offset } = querySchema.parse(searchParams);
    
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('lifetime_value', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (stage) {
      query = query.eq('stage', stage);
    }
    
    if (collection) {
      query = query.eq('primary_collection', collection);
    }
    
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      customers: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/customers/[id]/journey/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { getCustomerJourney } from '@/lib/customers/journey-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const journey = await getCustomerJourney(userId, params.id);
    
    if (!journey.customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    return NextResponse.json(journey);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/customers/analytics/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { getJourneyAnalytics } from '@/lib/customers/journey-service';

export async function GET() {
  try {
    const userId = await getUserId();
    const analytics = await getJourneyAnalytics(userId);
    
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `components/customers/journey-funnel.tsx`
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, ShoppingBag, Repeat, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber, cn } from '@/lib/utils';

interface JourneyAnalytics {
  stageDistribution: Record<string, number>;
  collectionDistribution: Record<string, number>;
  conversionFunnel: {
    visitors: number;
    leads: number;
    customers: number;
    repeat: number;
  };
  atRiskCount: number;
  avgLifetimeValue: number;
}

export function JourneyFunnel() {
  const { data, isLoading } = useQuery({
    queryKey: ['journey-analytics'],
    queryFn: () => api.get<JourneyAnalytics>('/customers/analytics'),
  });

  const funnel = data?.conversionFunnel || { visitors: 0, leads: 0, customers: 0, repeat: 0 };
  const maxValue = Math.max(funnel.visitors, 1);

  const stages = [
    { label: 'Visitors', value: funnel.visitors, icon: Users, color: 'bg-gray-400' },
    { label: 'Leads', value: funnel.leads, icon: UserPlus, color: 'bg-teal' },
    { label: 'Customers', value: funnel.customers, icon: ShoppingBag, color: 'bg-sage' },
    { label: 'Repeat', value: funnel.repeat, icon: Repeat, color: 'bg-terracotta' },
  ];

  return (
    <Card>
      <CardHeader
        title="Customer Journey Funnel"
        description="Conversion through lifecycle stages"
      />
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const width = (stage.value / maxValue) * 100;
            const conversionRate = index > 0 && stages[index - 1].value > 0
              ? (stage.value / stages[index - 1].value) * 100
              : null;

            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <stage.icon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                    <span className="text-body-sm font-medium">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-mono">{formatNumber(stage.value)}</span>
                    {conversionRate !== null && (
                      <Badge variant="secondary" size="sm">
                        {conversionRate.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-elevated rounded-md overflow-hidden">
                  <div
                    className={cn('h-full rounded-md transition-all', stage.color)}
                    style={{ width: `${Math.max(width, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* At-risk alert */}
        {data && data.atRiskCount > 0 && (
          <div className="mt-6 p-3 rounded-md bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-body-sm">
                <strong>{data.atRiskCount}</strong> customers at risk of churning
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- **Step Dependencies**: Step 17.2
- **User Instructions**: None

---

# Phase 18: Win-Back Campaigns

## Step 18.1: Create Win-Back Database Schema

- **Task**: Create database schema for win-back campaign configuration and tracking.

- **Files**:

### `supabase/migrations/015_winback.sql`
```sql
-- ============================================================================
-- Migration: 015_winback
-- Description: Win-back campaigns for at-risk and churned customers
-- Feature: 18 (Win-Back Campaigns)
-- ============================================================================

-- ============================================================================
-- Win-Back Campaigns Table
-- ============================================================================
CREATE TABLE winback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Campaign details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Targeting
  target_stages TEXT[] NOT NULL DEFAULT ARRAY['at_risk', 'churned'],
  min_days_inactive INTEGER NOT NULL DEFAULT 60,
  max_days_inactive INTEGER,
  min_lifetime_value NUMERIC(10,2) DEFAULT 0,
  target_collections TEXT[] DEFAULT '{}', -- Empty = all
  
  -- Incentive
  incentive_type TEXT CHECK (incentive_type IN (
    'percentage_discount',
    'fixed_discount',
    'free_shipping',
    'gift_with_purchase',
    'exclusive_product'
  )),
  incentive_value NUMERIC(10,2),
  discount_code TEXT,
  
  -- Klaviyo integration
  klaviyo_flow_id TEXT NOT NULL,
  
  -- Timing
  send_delay_days INTEGER NOT NULL DEFAULT 0, -- Days after becoming at-risk
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  -- Performance
  customers_targeted INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_opened INTEGER NOT NULL DEFAULT 0,
  emails_clicked INTEGER NOT NULL DEFAULT 0,
  customers_recovered INTEGER NOT NULL DEFAULT 0,
  revenue_recovered NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Win-Back Recipients Table
-- ============================================================================
CREATE TABLE winback_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES winback_campaigns(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting to be sent
    'sent',         -- Email sent
    'opened',       -- Email opened
    'clicked',      -- Link clicked
    'recovered',    -- Made a purchase
    'unsubscribed', -- Opted out
    'expired'       -- Campaign ended without action
  )),
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovery_order_id TEXT,
  recovery_order_value NUMERIC(10,2),
  
  -- Discount tracking
  discount_code_used TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(campaign_id, customer_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_winback_campaigns_user ON winback_campaigns(user_id);
CREATE INDEX idx_winback_campaigns_status ON winback_campaigns(user_id, status);
CREATE INDEX idx_winback_campaigns_active ON winback_campaigns(user_id, starts_at, ends_at)
  WHERE status = 'active';

CREATE INDEX idx_winback_recipients_campaign ON winback_recipients(campaign_id);
CREATE INDEX idx_winback_recipients_customer ON winback_recipients(customer_id);
CREATE INDEX idx_winback_recipients_status ON winback_recipients(campaign_id, status);
CREATE INDEX idx_winback_recipients_pending ON winback_recipients(campaign_id, created_at)
  WHERE status = 'pending';

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE winback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY winback_campaigns_all ON winback_campaigns FOR ALL USING (user_id = auth.uid());
CREATE POLICY winback_recipients_all ON winback_recipients FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER winback_campaigns_updated_at BEFORE UPDATE ON winback_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER winback_recipients_updated_at BEFORE UPDATE ON winback_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Get customers eligible for win-back
-- ============================================================================
CREATE OR REPLACE FUNCTION get_winback_eligible_customers(
  p_campaign_id UUID
)
RETURNS TABLE (
  customer_id UUID,
  email TEXT,
  first_name TEXT,
  stage TEXT,
  lifetime_value NUMERIC,
  primary_collection TEXT,
  days_inactive INTEGER
) AS $$
DECLARE
  v_campaign RECORD;
BEGIN
  SELECT * INTO v_campaign FROM winback_campaigns WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id AS customer_id,
    c.email,
    c.first_name,
    c.stage,
    c.lifetime_value,
    c.primary_collection,
    EXTRACT(DAY FROM NOW() - GREATEST(
      COALESCE(c.last_purchase_at, c.created_at),
      COALESCE(c.last_email_click_at, c.created_at)
    ))::INTEGER AS days_inactive
  FROM customers c
  WHERE c.user_id = v_campaign.user_id
    AND c.stage = ANY(v_campaign.target_stages)
    AND c.email_subscribed = true
    AND c.lifetime_value >= COALESCE(v_campaign.min_lifetime_value, 0)
    AND (
      array_length(v_campaign.target_collections, 1) IS NULL 
      OR c.primary_collection = ANY(v_campaign.target_collections)
    )
    AND EXTRACT(DAY FROM NOW() - GREATEST(
      COALESCE(c.last_purchase_at, c.created_at),
      COALESCE(c.last_email_click_at, c.created_at)
    )) >= v_campaign.min_days_inactive
    AND (
      v_campaign.max_days_inactive IS NULL 
      OR EXTRACT(DAY FROM NOW() - GREATEST(
        COALESCE(c.last_purchase_at, c.created_at),
        COALESCE(c.last_email_click_at, c.created_at)
      )) <= v_campaign.max_days_inactive
    )
    AND NOT EXISTS (
      SELECT 1 FROM winback_recipients wr
      WHERE wr.customer_id = c.id 
        AND wr.campaign_id = p_campaign_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/winback.ts`
```typescript
export interface WinbackCampaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_stages: string[];
  min_days_inactive: number;
  max_days_inactive: number | null;
  min_lifetime_value: number | null;
  target_collections: string[];
  incentive_type: IncentiveType | null;
  incentive_value: number | null;
  discount_code: string | null;
  klaviyo_flow_id: string;
  send_delay_days: number;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  customers_targeted: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  customers_recovered: number;
  revenue_recovered: number;
  created_at: string;
  updated_at: string;
}

export type IncentiveType = 
  | 'percentage_discount'
  | 'fixed_discount'
  | 'free_shipping'
  | 'gift_with_purchase'
  | 'exclusive_product';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface WinbackRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  user_id: string;
  status: RecipientStatus;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  recovered_at: string | null;
  recovery_order_id: string | null;
  recovery_order_value: number | null;
  discount_code_used: string | null;
  created_at: string;
  updated_at: string;
}

export type RecipientStatus = 
  | 'pending'
  | 'sent'
  | 'opened'
  | 'clicked'
  | 'recovered'
  | 'unsubscribed'
  | 'expired';

export interface CreateWinbackCampaignRequest {
  name: string;
  description?: string;
  targetStages?: string[];
  minDaysInactive: number;
  maxDaysInactive?: number;
  minLifetimeValue?: number;
  targetCollections?: string[];
  incentiveType?: IncentiveType;
  incentiveValue?: number;
  discountCode?: string;
  klaviyoFlowId: string;
  sendDelayDays?: number;
  startsAt?: string;
  endsAt?: string;
}
```

- **Step Dependencies**: Step 17.1
- **User Instructions**: Run migration

---

## Step 18.2: Implement Win-Back Service

- **Task**: Create the service for managing win-back campaigns and triggering Klaviyo flows.

- **Files**:

### `lib/winback/winback-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { CreateWinbackCampaignRequest, WinbackCampaign } from '@/types/winback';

interface CampaignResult {
  success: boolean;
  campaign?: WinbackCampaign;
  error?: string;
}

export async function createWinbackCampaign(
  userId: string,
  request: CreateWinbackCampaignRequest
): Promise<CampaignResult> {
  const supabase = createServerSupabaseClient();

  try {
    const { data: campaign, error } = await supabase
      .from('winback_campaigns')
      .insert({
        user_id: userId,
        name: request.name,
        description: request.description,
        target_stages: request.targetStages || ['at_risk', 'churned'],
        min_days_inactive: request.minDaysInactive,
        max_days_inactive: request.maxDaysInactive,
        min_lifetime_value: request.minLifetimeValue,
        target_collections: request.targetCollections || [],
        incentive_type: request.incentiveType,
        incentive_value: request.incentiveValue,
        discount_code: request.discountCode,
        klaviyo_flow_id: request.klaviyoFlowId,
        send_delay_days: request.sendDelayDays || 0,
        status: 'draft',
        starts_at: request.startsAt,
        ends_at: request.endsAt,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, campaign: campaign as WinbackCampaign };
  } catch (error) {
    console.error('Create win-back campaign error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function activateWinbackCampaign(
  userId: string,
  campaignId: string
): Promise<{ success: boolean; recipientsAdded: number; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    // Get eligible customers
    const { data: eligibleCustomers } = await supabase.rpc('get_winback_eligible_customers', {
      p_campaign_id: campaignId,
    });

    if (!eligibleCustomers || eligibleCustomers.length === 0) {
      return { success: true, recipientsAdded: 0 };
    }

    // Add recipients
    const recipients = eligibleCustomers.map((c: any) => ({
      campaign_id: campaignId,
      customer_id: c.customer_id,
      user_id: userId,
      status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('winback_recipients')
      .insert(recipients);

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Update campaign
    await supabase
      .from('winback_campaigns')
      .update({
        status: 'active',
        starts_at: new Date().toISOString(),
        customers_targeted: eligibleCustomers.length,
      })
      .eq('id', campaignId);

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'winback_campaign_activated',
      p_details: {
        campaignId,
        recipientsAdded: eligibleCustomers.length,
      },
      p_executed: true,
      p_module: 'winback',
      p_reference_id: campaignId,
      p_reference_table: 'winback_campaigns',
    });

    return { success: true, recipientsAdded: eligibleCustomers.length };
  } catch (error) {
    console.error('Activate win-back campaign error:', error);
    return {
      success: false,
      recipientsAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function processWinbackRecipients(userId: string): Promise<{
  sent: number;
  errors: string[];
}> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();
  let sent = 0;
  const errors: string[] = [];

  try {
    // Get pending recipients for active campaigns
    const { data: recipients } = await supabase
      .from('winback_recipients')
      .select(`
        *,
        campaign:winback_campaigns(*),
        customer:customers(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('campaign.status', 'active')
      .limit(50);

    if (!recipients || recipients.length === 0) {
      return { sent: 0, errors: [] };
    }

    // Get Klaviyo API key
    const apiKey = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!apiKey.data) {
      return { sent: 0, errors: ['Klaviyo not connected'] };
    }

    for (const recipient of recipients) {
      try {
        // Check delay
        const daysSinceAdded = Math.floor(
          (Date.now() - new Date(recipient.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceAdded < recipient.campaign.send_delay_days) {
          continue;
        }

        // Trigger Klaviyo flow
        await triggerWinbackFlow(apiKey.data, recipient.campaign, recipient.customer);

        // Update recipient status
        await supabase
          .from('winback_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);

        // Update campaign stats
        await supabase
          .from('winback_campaigns')
          .update({
            emails_sent: supabase.sql`emails_sent + 1`,
          })
          .eq('id', recipient.campaign_id);

        sent++;
      } catch (error) {
        errors.push(`Recipient ${recipient.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { sent, errors };
  } catch (error) {
    console.error('Process win-back recipients error:', error);
    return {
      sent,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function recordWinbackRecovery(
  userId: string,
  email: string,
  orderId: string,
  orderValue: number,
  discountCode?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    // Find customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('email', email)
      .single();

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Find active recipient
    const { data: recipient } = await supabase
      .from('winback_recipients')
      .select('id, campaign_id')
      .eq('customer_id', customer.id)
      .in('status', ['sent', 'opened', 'clicked'])
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (!recipient) {
      return { success: false, error: 'No active win-back recipient found' };
    }

    // Update recipient
    await supabase
      .from('winback_recipients')
      .update({
        status: 'recovered',
        recovered_at: new Date().toISOString(),
        recovery_order_id: orderId,
        recovery_order_value: orderValue,
        discount_code_used: discountCode,
      })
      .eq('id', recipient.id);

    // Update campaign stats
    await supabase
      .from('winback_campaigns')
      .update({
        customers_recovered: supabase.sql`customers_recovered + 1`,
        revenue_recovered: supabase.sql`revenue_recovered + ${orderValue}`,
      })
      .eq('id', recipient.campaign_id);

    // Update customer stage
    await supabase.rpc('update_customer_stage', {
      p_customer_id: customer.id,
      p_trigger_type: 'winback_recovery',
    });

    return { success: true };
  } catch (error) {
    console.error('Record win-back recovery error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function triggerWinbackFlow(
  apiKey: string,
  campaign: any,
  customer: any
): Promise<void> {
  const response = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          profile: {
            email: customer.email,
            first_name: customer.first_name,
          },
          metric: { name: 'Win-Back Campaign Triggered' },
          properties: {
            campaign_name: campaign.name,
            incentive_type: campaign.incentive_type,
            incentive_value: campaign.incentive_value,
            discount_code: campaign.discount_code,
            primary_collection: customer.primary_collection,
            lifetime_value: customer.lifetime_value,
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to trigger Klaviyo flow');
  }
}
```

- **Step Dependencies**: Step 18.1
- **User Instructions**: None

---

# Phase 19: Loyalty Program

## Step 19.1: Create Loyalty Database Schema

- **Task**: Create database schema for loyalty points, tiers, and rewards.

- **Files**:

### `supabase/migrations/016_loyalty.sql`
```sql
-- ============================================================================
-- Migration: 016_loyalty
-- Description: Loyalty program with points, tiers, and rewards
-- Feature: 19 (Loyalty Program)
-- ============================================================================

-- ============================================================================
-- Loyalty Tiers Table
-- ============================================================================
CREATE TABLE loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Tier details
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Thresholds
  min_points INTEGER NOT NULL DEFAULT 0,
  min_lifetime_value NUMERIC(10,2),
  min_orders INTEGER,
  
  -- Benefits
  points_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0, -- e.g., 1.5x points
  discount_percentage NUMERIC(5,2), -- Automatic discount
  free_shipping BOOLEAN NOT NULL DEFAULT false,
  early_access_days INTEGER DEFAULT 0, -- Early access to new products
  exclusive_products BOOLEAN NOT NULL DEFAULT false,
  
  -- Display
  badge_color TEXT,
  badge_icon TEXT,
  
  -- Order (for tier progression)
  tier_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, slug)
);

-- ============================================================================
-- Customer Loyalty Table
-- ============================================================================
CREATE TABLE customer_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Points
  points_balance INTEGER NOT NULL DEFAULT 0,
  points_earned_lifetime INTEGER NOT NULL DEFAULT 0,
  points_redeemed_lifetime INTEGER NOT NULL DEFAULT 0,
  
  -- Current tier
  tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
  tier_achieved_at TIMESTAMPTZ,
  
  -- Progress to next tier
  points_to_next_tier INTEGER,
  next_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
  
  -- Referral tracking
  referral_code TEXT UNIQUE,
  referrals_count INTEGER NOT NULL DEFAULT 0,
  referral_points_earned INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(customer_id)
);

-- ============================================================================
-- Points Transactions Table
-- ============================================================================
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_loyalty_id UUID REFERENCES customer_loyalty(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN (
    'earn_purchase',      -- Points from purchase
    'earn_referral',      -- Points from referral
    'earn_review',        -- Points from review
    'earn_birthday',      -- Birthday bonus
    'earn_signup',        -- Signup bonus
    'earn_bonus',         -- Manual bonus
    'redeem_discount',    -- Redeemed for discount
    'redeem_product',     -- Redeemed for product
    'expire',             -- Points expired
    'adjustment'          -- Manual adjustment
  )),
  
  -- Amount
  points INTEGER NOT NULL, -- Positive for earn, negative for redeem
  
  -- Balance tracking
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Reference
  reference_id TEXT,
  reference_type TEXT, -- 'order', 'review', 'referral', etc.
  
  -- Details
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Expiration (for earned points)
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Loyalty Rewards Table (redeemable rewards)
-- ============================================================================
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Reward details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Cost
  points_cost INTEGER NOT NULL,
  
  -- Reward type
  reward_type TEXT NOT NULL CHECK (reward_type IN (
    'percentage_discount',
    'fixed_discount',
    'free_shipping',
    'free_product',
    'exclusive_access'
  )),
  
  -- Reward value
  reward_value NUMERIC(10,2), -- Discount amount or product value
  reward_product_id TEXT, -- For free product rewards
  
  -- Eligibility
  min_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
  min_orders INTEGER,
  
  -- Limits
  redemption_limit INTEGER, -- Per customer
  total_available INTEGER, -- Total inventory
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Reward Redemptions Table
-- ============================================================================
CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_loyalty_id UUID REFERENCES customer_loyalty(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL NOT NULL,
  points_transaction_id UUID REFERENCES points_transactions(id) ON DELETE SET NULL,
  
  -- Redemption details
  points_spent INTEGER NOT NULL,
  
  -- Generated code (if applicable)
  discount_code TEXT,
  
  -- Usage tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',   -- Code generated but not used
    'used',      -- Applied to order
    'expired',   -- Code expired
    'refunded'   -- Points refunded
  )),
  
  used_at TIMESTAMPTZ,
  used_order_id TEXT,
  
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_loyalty_tiers_user ON loyalty_tiers(user_id, tier_order);
CREATE INDEX idx_customer_loyalty_user ON customer_loyalty(user_id);
CREATE INDEX idx_customer_loyalty_customer ON customer_loyalty(customer_id);
CREATE INDEX idx_customer_loyalty_tier ON customer_loyalty(tier_id);
CREATE INDEX idx_customer_loyalty_referral ON customer_loyalty(referral_code);

CREATE INDEX idx_points_transactions_loyalty ON points_transactions(customer_loyalty_id);
CREATE INDEX idx_points_transactions_type ON points_transactions(user_id, type);
CREATE INDEX idx_points_transactions_created ON points_transactions(user_id, created_at DESC);

CREATE INDEX idx_loyalty_rewards_user ON loyalty_rewards(user_id);
CREATE INDEX idx_loyalty_rewards_active ON loyalty_rewards(user_id, is_active, starts_at, ends_at);

CREATE INDEX idx_redemptions_loyalty ON reward_redemptions(customer_loyalty_id);
CREATE INDEX idx_redemptions_status ON reward_redemptions(user_id, status);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiers_all ON loyalty_tiers FOR ALL USING (user_id = auth.uid());
CREATE POLICY loyalty_all ON customer_loyalty FOR ALL USING (user_id = auth.uid());
CREATE POLICY transactions_all ON points_transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY rewards_all ON loyalty_rewards FOR ALL USING (user_id = auth.uid());
CREATE POLICY redemptions_all ON reward_redemptions FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER tiers_updated_at BEFORE UPDATE ON loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER loyalty_updated_at BEFORE UPDATE ON customer_loyalty
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER rewards_updated_at BEFORE UPDATE ON loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER redemptions_updated_at BEFORE UPDATE ON reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Award points
-- ============================================================================
CREATE OR REPLACE FUNCTION award_points(
  p_customer_id UUID,
  p_type TEXT,
  p_points INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_loyalty RECORD;
  v_multiplier NUMERIC;
  v_final_points INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Get customer loyalty record
  SELECT cl.*, lt.points_multiplier INTO v_loyalty
  FROM customer_loyalty cl
  LEFT JOIN loyalty_tiers lt ON cl.tier_id = lt.id
  WHERE cl.customer_id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer loyalty record not found';
  END IF;
  
  -- Apply multiplier for purchase points
  v_multiplier := COALESCE(v_loyalty.points_multiplier, 1.0);
  v_final_points := CASE 
    WHEN p_type = 'earn_purchase' THEN ROUND(p_points * v_multiplier)
    ELSE p_points
  END;
  
  -- Create transaction
  INSERT INTO points_transactions (
    user_id,
    customer_loyalty_id,
    type,
    points,
    balance_before,
    balance_after,
    reference_id,
    reference_type,
    description,
    expires_at
  ) VALUES (
    v_loyalty.user_id,
    v_loyalty.id,
    p_type,
    v_final_points,
    v_loyalty.points_balance,
    v_loyalty.points_balance + v_final_points,
    p_reference_id,
    p_reference_type,
    p_description,
    CASE WHEN p_type LIKE 'earn_%' THEN NOW() + INTERVAL '1 year' ELSE NULL END
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update balance
  UPDATE customer_loyalty SET
    points_balance = points_balance + v_final_points,
    points_earned_lifetime = points_earned_lifetime + GREATEST(v_final_points, 0),
    updated_at = NOW()
  WHERE id = v_loyalty.id;
  
  -- Check tier upgrade
  PERFORM check_tier_upgrade(p_customer_id);
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Check tier upgrade
-- ============================================================================
CREATE OR REPLACE FUNCTION check_tier_upgrade(p_customer_id UUID)
RETURNS UUID AS $$
DECLARE
  v_loyalty RECORD;
  v_customer RECORD;
  v_new_tier RECORD;
BEGIN
  -- Get customer and loyalty info
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;
  SELECT * INTO v_loyalty FROM customer_loyalty WHERE customer_id = p_customer_id;
  
  -- Find highest eligible tier
  SELECT * INTO v_new_tier
  FROM loyalty_tiers
  WHERE user_id = v_loyalty.user_id
    AND min_points <= v_loyalty.points_earned_lifetime
    AND (min_lifetime_value IS NULL OR min_lifetime_value <= v_customer.lifetime_value)
    AND (min_orders IS NULL OR min_orders <= v_customer.total_orders)
  ORDER BY tier_order DESC
  LIMIT 1;
  
  -- Update if different tier
  IF v_new_tier.id IS NOT NULL AND v_new_tier.id != v_loyalty.tier_id THEN
    UPDATE customer_loyalty SET
      tier_id = v_new_tier.id,
      tier_achieved_at = NOW(),
      updated_at = NOW()
    WHERE id = v_loyalty.id;
    
    RETURN v_new_tier.id;
  END IF;
  
  RETURN v_loyalty.tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Insert default loyalty tiers
-- ============================================================================
-- Note: These will be created per user when they set up loyalty
```

### `types/loyalty.ts`
```typescript
export interface LoyaltyTier {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  min_points: number;
  min_lifetime_value: number | null;
  min_orders: number | null;
  points_multiplier: number;
  discount_percentage: number | null;
  free_shipping: boolean;
  early_access_days: number;
  exclusive_products: boolean;
  badge_color: string | null;
  badge_icon: string | null;
  tier_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerLoyalty {
  id: string;
  user_id: string;
  customer_id: string;
  points_balance: number;
  points_earned_lifetime: number;
  points_redeemed_lifetime: number;
  tier_id: string | null;
  tier_achieved_at: string | null;
  points_to_next_tier: number | null;
  next_tier_id: string | null;
  referral_code: string | null;
  referrals_count: number;
  referral_points_earned: number;
  created_at: string;
  updated_at: string;
  tier?: LoyaltyTier;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  customer_loyalty_id: string;
  type: TransactionType;
  points: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
}

export type TransactionType = 
  | 'earn_purchase'
  | 'earn_referral'
  | 'earn_review'
  | 'earn_birthday'
  | 'earn_signup'
  | 'earn_bonus'
  | 'redeem_discount'
  | 'redeem_product'
  | 'expire'
  | 'adjustment';

export interface LoyaltyReward {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: RewardType;
  reward_value: number | null;
  reward_product_id: string | null;
  min_tier_id: string | null;
  min_orders: number | null;
  redemption_limit: number | null;
  total_available: number | null;
  total_redeemed: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RewardType = 
  | 'percentage_discount'
  | 'fixed_discount'
  | 'free_shipping'
  | 'free_product'
  | 'exclusive_access';

export interface RewardRedemption {
  id: string;
  user_id: string;
  customer_loyalty_id: string;
  reward_id: string;
  points_transaction_id: string | null;
  points_spent: number;
  discount_code: string | null;
  status: 'pending' | 'used' | 'expired' | 'refunded';
  used_at: string | null;
  used_order_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}
```

- **Step Dependencies**: Step 17.1
- **User Instructions**: Run migration

---

## Step 19.2: Implement Loyalty Service

- **Task**: Create the service for managing points, tiers, and rewards.

- **Files**:

### `lib/loyalty/loyalty-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { CustomerLoyalty, LoyaltyReward, PointsTransaction, LoyaltyTier } from '@/types/loyalty';
import { nanoid } from 'nanoid';

export async function getOrCreateCustomerLoyalty(
  userId: string,
  customerId: string
): Promise<CustomerLoyalty | null> {
  const supabase = createServerSupabaseClient();

  // Check for existing
  const { data: existing } = await supabase
    .from('customer_loyalty')
    .select('*, tier:loyalty_tiers(*)')
    .eq('customer_id', customerId)
    .single();

  if (existing) {
    return existing as CustomerLoyalty;
  }

  // Get starter tier
  const { data: starterTier } = await supabase
    .from('loyalty_tiers')
    .select('id')
    .eq('user_id', userId)
    .order('tier_order', { ascending: true })
    .limit(1)
    .single();

  // Create new loyalty record
  const { data: newLoyalty, error } = await supabase
    .from('customer_loyalty')
    .insert({
      user_id: userId,
      customer_id: customerId,
      tier_id: starterTier?.id,
      referral_code: nanoid(8).toUpperCase(),
    })
    .select('*, tier:loyalty_tiers(*)')
    .single();

  if (error) {
    console.error('Create customer loyalty error:', error);
    return null;
  }

  return newLoyalty as CustomerLoyalty;
}

export async function awardPointsForPurchase(
  userId: string,
  customerId: string,
  orderValue: number,
  orderId: string
): Promise<{ success: boolean; pointsAwarded: number; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    // Ensure loyalty record exists
    await getOrCreateCustomerLoyalty(userId, customerId);

    // Calculate points (1 point per dollar by default)
    const basePoints = Math.floor(orderValue);

    const { data: transactionId, error } = await supabase.rpc('award_points', {
      p_customer_id: customerId,
      p_type: 'earn_purchase',
      p_points: basePoints,
      p_reference_id: orderId,
      p_reference_type: 'order',
      p_description: `Points earned from order ${orderId}`,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Get updated loyalty to see final points (after multiplier)
    const { data: loyalty } = await supabase
      .from('customer_loyalty')
      .select('points_balance')
      .eq('customer_id', customerId)
      .single();

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'points_awarded',
      p_details: {
        customerId,
        orderId,
        basePoints,
        transactionId,
      },
      p_executed: true,
      p_module: 'loyalty',
    });

    return { success: true, pointsAwarded: basePoints };
  } catch (error) {
    console.error('Award points error:', error);
    return {
      success: false,
      pointsAwarded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function redeemReward(
  userId: string,
  customerId: string,
  rewardId: string
): Promise<{
  success: boolean;
  discountCode?: string;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    // Get loyalty and reward
    const { data: loyalty } = await supabase
      .from('customer_loyalty')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    const { data: reward } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('is_active', true)
      .single();

    if (!loyalty || !reward) {
      return { success: false, error: 'Loyalty or reward not found' };
    }

    // Check points
    if (loyalty.points_balance < reward.points_cost) {
      return { success: false, error: 'Insufficient points' };
    }

    // Check tier requirement
    if (reward.min_tier_id && reward.min_tier_id !== loyalty.tier_id) {
      // TODO: Proper tier comparison
      return { success: false, error: 'Tier requirement not met' };
    }

    // Check availability
    if (reward.total_available !== null && reward.total_redeemed >= reward.total_available) {
      return { success: false, error: 'Reward no longer available' };
    }

    // Deduct points
    const { data: transactionId, error: pointsError } = await supabase.rpc('award_points', {
      p_customer_id: customerId,
      p_type: 'redeem_discount',
      p_points: -reward.points_cost,
      p_reference_id: rewardId,
      p_reference_type: 'reward',
      p_description: `Redeemed: ${reward.name}`,
    });

    if (pointsError) {
      throw new Error(pointsError.message);
    }

    // Generate discount code
    const discountCode = `HH${nanoid(6).toUpperCase()}`;

    // Create redemption record
    const { error: redemptionError } = await supabase
      .from('reward_redemptions')
      .insert({
        user_id: userId,
        customer_loyalty_id: loyalty.id,
        reward_id: rewardId,
        points_transaction_id: transactionId,
        points_spent: reward.points_cost,
        discount_code: discountCode,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (redemptionError) {
      throw new Error(redemptionError.message);
    }

    // Update reward redeemed count
    await supabase
      .from('loyalty_rewards')
      .update({ total_redeemed: reward.total_redeemed + 1 })
      .eq('id', rewardId);

    // Update loyalty redeemed lifetime
    await supabase
      .from('customer_loyalty')
      .update({
        points_redeemed_lifetime: loyalty.points_redeemed_lifetime + reward.points_cost,
      })
      .eq('id', loyalty.id);

    return { success: true, discountCode };
  } catch (error) {
    console.error('Redeem reward error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function processReferral(
  userId: string,
  referralCode: string,
  newCustomerId: string,
  orderValue: number
): Promise<{ success: boolean; pointsAwarded: number; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    // Find referrer by code
    const { data: referrer } = await supabase
      .from('customer_loyalty')
      .select('customer_id')
      .eq('referral_code', referralCode)
      .single();

    if (!referrer) {
      return { success: false, pointsAwarded: 0, error: 'Invalid referral code' };
    }

    // Prevent self-referral
    if (referrer.customer_id === newCustomerId) {
      return { success: false, pointsAwarded: 0, error: 'Cannot refer yourself' };
    }

    // Award points to referrer (10% of order value as points)
    const referralPoints = Math.floor(orderValue * 0.1);

    await supabase.rpc('award_points', {
      p_customer_id: referrer.customer_id,
      p_type: 'earn_referral',
      p_points: referralPoints,
      p_reference_id: newCustomerId,
      p_reference_type: 'referral',
      p_description: 'Referral bonus',
    });

    // Update referral stats
    await supabase
      .from('customer_loyalty')
      .update({
        referrals_count: supabase.sql`referrals_count + 1`,
        referral_points_earned: supabase.sql`referral_points_earned + ${referralPoints}`,
      })
      .eq('customer_id', referrer.customer_id);

    return { success: true, pointsAwarded: referralPoints };
  } catch (error) {
    console.error('Process referral error:', error);
    return {
      success: false,
      pointsAwarded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getLoyaltyDashboard(userId: string): Promise<{
  totalMembers: number;
  totalPointsOutstanding: number;
  tierDistribution: Record<string, number>;
  recentRedemptions: number;
  topReferrers: Array<{ email: string; referrals: number; points: number }>;
}> {
  const supabase = createServerSupabaseClient();

  const { data: loyaltyRecords } = await supabase
    .from('customer_loyalty')
    .select('points_balance, tier_id, referrals_count, referral_points_earned, customers(email)')
    .eq('user_id', userId);

  const { data: tiers } = await supabase
    .from('loyalty_tiers')
    .select('id, name')
    .eq('user_id', userId);

  const tierMap = new Map(tiers?.map((t) => [t.id, t.name]) || []);

  const tierDistribution: Record<string, number> = {};
  let totalPoints = 0;

  for (const record of loyaltyRecords || []) {
    totalPoints += record.points_balance;
    const tierName = record.tier_id ? tierMap.get(record.tier_id) || 'Unknown' : 'None';
    tierDistribution[tierName] = (tierDistribution[tierName] || 0) + 1;
  }

  // Get recent redemptions count
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentRedemptions } = await supabase
    .from('reward_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo);

  // Get top referrers
  const topReferrers = (loyaltyRecords || [])
    .filter((r) => r.referrals_count > 0)
    .sort((a, b) => b.referrals_count - a.referrals_count)
    .slice(0, 5)
    .map((r) => ({
      email: r.customers?.email || 'Unknown',
      referrals: r.referrals_count,
      points: r.referral_points_earned,
    }));

  return {
    totalMembers: loyaltyRecords?.length || 0,
    totalPointsOutstanding: totalPoints,
    tierDistribution,
    recentRedemptions: recentRedemptions || 0,
    topReferrers,
  };
}
```

- **Step Dependencies**: Step 19.1
- **User Instructions**: None

---

## Step 19.3: Build Referral Program UI

- **Task**: Create the UI for viewing referral program metrics and managing referrals.

- **Files**:

### `hooks/use-referrals.ts`
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalRevenueGenerated: number;
  topReferrers: Array<{
    email: string;
    referrals: number;
    conversions: number;
    revenue: number;
  }>;
}

export function useReferralStats() {
  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const response = await fetch('/api/loyalty/referrals/stats');
      if (!response.ok) throw new Error('Failed to fetch referral stats');
      return response.json() as Promise<ReferralStats>;
    },
  });
}

export function useCustomerReferrals(customerId: string) {
  return useQuery({
    queryKey: ['customer-referrals', customerId],
    queryFn: async () => {
      const response = await fetch(`/api/loyalty/referrals?customer_id=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch referrals');
      return response.json();
    },
    enabled: !!customerId,
  });
}
```

### `app/api/loyalty/referrals/stats/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all loyalty records with referral data
  const { data: loyaltyRecords } = await supabase
    .from('customer_loyalty')
    .select(`
      referral_code,
      referrals_count,
      referral_points_earned,
      customers(email)
    `)
    .eq('user_id', user.id)
    .gt('referrals_count', 0)
    .order('referrals_count', { ascending: false });

  // Get referral transactions
  const { data: referralTx } = await supabase
    .from('points_transactions')
    .select('points_amount, metadata')
    .eq('user_id', user.id)
    .eq('type', 'earn_referral');

  const totalReferrals = (loyaltyRecords || []).reduce((sum, r) => sum + r.referrals_count, 0);
  
  // Calculate stats
  const stats = {
    totalReferrals,
    pendingReferrals: 0, // Would need additional tracking
    convertedReferrals: totalReferrals,
    totalRevenueGenerated: (referralTx || []).reduce((sum, tx) => {
      const orderValue = tx.metadata?.order_value || 0;
      return sum + orderValue;
    }, 0),
    topReferrers: (loyaltyRecords || []).slice(0, 10).map(r => ({
      email: r.customers?.email || 'Unknown',
      referrals: r.referrals_count,
      conversions: r.referrals_count,
      revenue: r.referral_points_earned * 10, // Approximate
    })),
  };

  return NextResponse.json(stats);
}
```

### `app/(dashboard)/dashboard/customers/referrals/page.tsx`
```tsx
'use client';

import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReferralStats } from '@/hooks/use-referrals';
import { Users, DollarSign, TrendingUp, Gift } from 'lucide-react';

export default function ReferralsPage() {
  const { data: stats, isLoading } = useReferralStats();

  if (isLoading) {
    return <PageContainer title="Referral Program">Loading...</PageContainer>;
  }

  return (
    <PageContainer
      title="Referral Program"
      description="Track referral performance and top referrers"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sage-100 rounded-lg">
              <Users className="h-5 w-5 text-sage-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Referrals</div>
              <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Converted</div>
              <div className="text-2xl font-bold">{stats?.convertedReferrals || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Revenue Generated</div>
              <div className="text-2xl font-bold">
                ${(stats?.totalRevenueGenerated || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
              <div className="text-2xl font-bold">
                {stats?.totalReferrals ? 
                  Math.round((stats.convertedReferrals / stats.totalReferrals) * 100) : 0}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Top Referrers</h2>
        </div>
        <div className="divide-y">
          {stats?.topReferrers?.map((referrer, index) => (
            <div key={referrer.email} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center font-bold text-sage-600">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{referrer.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {referrer.referrals} referral{referrer.referrals !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${referrer.revenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">revenue</div>
              </div>
            </div>
          ))}
          {(!stats?.topReferrers || stats.topReferrers.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              No referrals yet
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}
```

- **Step Dependencies**: Step 19.2
- **User Instructions**: None

---

## Step 19.4: Create Gifting System

- **Task**: Create the gift purchase and recipient journey system.

- **Files**:

### `supabase/migrations/016a_gifts.sql`
```sql
-- ============================================================================
-- Migration: 016a_gifts
-- Description: Gift purchase and delivery system
-- Feature: 18.6 (Gifting Engine)
-- ============================================================================

-- ============================================================================
-- Gifts Table
-- ============================================================================
CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Order association
  order_id UUID NOT NULL,
  shopify_order_id TEXT,
  
  -- Sender info
  sender_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  
  -- Recipient info
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  
  -- Gift details
  gift_code TEXT UNIQUE NOT NULL,
  message TEXT,
  
  -- Scheduling
  scheduled_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Claiming
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  claimed_by_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting delivery date
    'delivered',    -- Email sent to recipient
    'claimed',      -- Recipient claimed the gift
    'expired'       -- Gift code expired
  )),
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_gifts_user ON gifts(user_id);
CREATE INDEX idx_gifts_sender ON gifts(sender_customer_id);
CREATE INDEX idx_gifts_recipient_email ON gifts(recipient_email);
CREATE INDEX idx_gifts_code ON gifts(gift_code);
CREATE INDEX idx_gifts_status ON gifts(user_id, status);
CREATE INDEX idx_gifts_scheduled ON gifts(scheduled_delivery_at) 
  WHERE status = 'pending' AND scheduled_delivery_at IS NOT NULL;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY gifts_all ON gifts FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- Trigger
-- ============================================================================
CREATE TRIGGER gifts_updated_at BEFORE UPDATE ON gifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Generate gift code
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_gift_code() RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code like GIFT-XXXX-XXXX
    v_code := 'GIFT-' || 
              upper(substring(md5(random()::text) from 1 for 4)) || '-' ||
              upper(substring(md5(random()::text) from 1 for 4));
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM gifts WHERE gift_code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Claim gift
-- ============================================================================
CREATE OR REPLACE FUNCTION claim_gift(
  p_gift_code TEXT,
  p_customer_id UUID
) RETURNS gifts AS $$
DECLARE
  v_gift gifts;
BEGIN
  -- Get and lock gift
  SELECT * INTO v_gift FROM gifts 
  WHERE gift_code = p_gift_code 
  AND status IN ('delivered', 'pending')
  AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gift not found or already claimed';
  END IF;
  
  -- Update gift
  UPDATE gifts SET
    status = 'claimed',
    claimed = true,
    claimed_at = NOW(),
    claimed_by_customer_id = p_customer_id
  WHERE id = v_gift.id
  RETURNING * INTO v_gift;
  
  RETURN v_gift;
END;
$$ LANGUAGE plpgsql;
```

### `types/gifts.ts`
```typescript
export type GiftStatus = 'pending' | 'delivered' | 'claimed' | 'expired';

export interface Gift {
  id: string;
  user_id: string;
  order_id: string;
  shopify_order_id?: string;
  sender_customer_id?: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  recipient_name?: string;
  gift_code: string;
  message?: string;
  scheduled_delivery_at?: string;
  delivered_at?: string;
  claimed: boolean;
  claimed_at?: string;
  claimed_by_customer_id?: string;
  status: GiftStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGiftInput {
  order_id: string;
  shopify_order_id?: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  recipient_name?: string;
  message?: string;
  scheduled_delivery_at?: string;
}
```

### `lib/gifts/gift-service.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { Gift, CreateGiftInput } from '@/types/gifts';

export async function createGift(
  userId: string,
  customerId: string | null,
  input: CreateGiftInput
): Promise<Gift> {
  const supabase = createClient();

  // Generate gift code
  const { data: codeResult } = await supabase.rpc('generate_gift_code');
  const giftCode = codeResult as string;

  const { data: gift, error } = await supabase
    .from('gifts')
    .insert({
      user_id: userId,
      sender_customer_id: customerId,
      gift_code: giftCode,
      ...input,
      status: input.scheduled_delivery_at ? 'pending' : 'delivered',
      delivered_at: input.scheduled_delivery_at ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create gift: ${error.message}`);

  // If immediate delivery, trigger email
  if (!input.scheduled_delivery_at) {
    await sendGiftNotification(gift);
  }

  return gift;
}

export async function claimGift(
  giftCode: string,
  customerId: string
): Promise<Gift> {
  const supabase = createClient();

  const { data: gift, error } = await supabase
    .rpc('claim_gift', {
      p_gift_code: giftCode,
      p_customer_id: customerId,
    });

  if (error) throw new Error(`Failed to claim gift: ${error.message}`);

  return gift;
}

export async function getGiftByCode(giftCode: string): Promise<Gift | null> {
  const supabase = createClient();

  const { data: gift } = await supabase
    .from('gifts')
    .select('*')
    .eq('gift_code', giftCode)
    .single();

  return gift;
}

export async function processScheduledGifts(): Promise<number> {
  const supabase = createClient();

  // Find gifts ready to deliver
  const now = new Date().toISOString();
  const { data: gifts } = await supabase
    .from('gifts')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_delivery_at', now)
    .is('delivered_at', null);

  if (!gifts || gifts.length === 0) return 0;

  let delivered = 0;
  for (const gift of gifts) {
    try {
      await sendGiftNotification(gift);
      
      await supabase
        .from('gifts')
        .update({
          status: 'delivered',
          delivered_at: now,
        })
        .eq('id', gift.id);
      
      delivered++;
    } catch (error) {
      console.error(`Failed to deliver gift ${gift.id}:`, error);
    }
  }

  return delivered;
}

async function sendGiftNotification(gift: Gift): Promise<void> {
  // Trigger Klaviyo event for gift notification
  const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
  if (!klaviyoApiKey) return;

  await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
      'Content-Type': 'application/json',
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          profile: { email: gift.recipient_email },
          metric: { name: 'Gift Received' },
          properties: {
            gift_code: gift.gift_code,
            sender_name: gift.sender_name || 'Someone special',
            message: gift.message,
            claim_url: `${process.env.NEXT_PUBLIC_APP_URL}/gift/claim/${gift.gift_code}`,
            expires_at: gift.expires_at,
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });
}

export async function getGiftStats(userId: string): Promise<{
  totalGifts: number;
  pendingGifts: number;
  claimedGifts: number;
  expiredGifts: number;
}> {
  const supabase = createClient();

  const { data: gifts } = await supabase
    .from('gifts')
    .select('status')
    .eq('user_id', userId);

  const stats = {
    totalGifts: gifts?.length || 0,
    pendingGifts: gifts?.filter(g => g.status === 'pending').length || 0,
    claimedGifts: gifts?.filter(g => g.status === 'claimed').length || 0,
    expiredGifts: gifts?.filter(g => g.status === 'expired').length || 0,
  };

  return stats;
}
```

### `app/api/gifts/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGift } from '@/lib/gifts/gift-service';

// GET /api/gifts - List gifts
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  let query = supabase
    .from('gifts')
    .select(`
      *,
      sender:customers!sender_customer_id(email, first_name, last_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: gifts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ gifts });
}

// POST /api/gifts - Create gift
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    // Find customer if exists
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', body.sender_email)
      .single();

    const gift = await createGift(user.id, customer?.id || null, body);
    return NextResponse.json({ gift }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create gift' },
      { status: 500 }
    );
  }
}
```

### `app/(public)/gift/claim/[code]/page.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Gift, Check, AlertCircle } from 'lucide-react';

export default function ClaimGiftPage() {
  const params = useParams();
  const giftCode = params.code as string;
  
  const [gift, setGift] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    async function fetchGift() {
      try {
        const response = await fetch(`/api/gifts/claim/${giftCode}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Gift not found');
        }
        const data = await response.json();
        setGift(data.gift);
        
        if (data.gift.status === 'claimed') {
          setClaimed(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gift');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGift();
  }, [giftCode]);

  const handleClaim = async () => {
    if (!email) return;
    
    setIsClaiming(true);
    try {
      const response = await fetch(`/api/gifts/claim/${giftCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to claim gift');
      }

      setClaimed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim gift');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Gift Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Gift Claimed!</h1>
          <p className="text-muted-foreground mb-6">
            Your gift has been claimed. Check your email for download instructions.
          </p>
          <Button asChild>
            <a href="/">Continue Shopping</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-sage-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You've Received a Gift!</h1>
          {gift?.sender_name && (
            <p className="text-muted-foreground">
              From {gift.sender_name}
            </p>
          )}
        </div>

        {gift?.message && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 italic text-center">
            "{gift.message}"
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Enter your email to claim
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleClaim}
            disabled={!email || isClaiming}
          >
            {isClaiming ? 'Claiming...' : 'Claim Gift'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Expires: {new Date(gift?.expires_at).toLocaleDateString()}
        </p>
      </Card>
    </div>
  );
}
```

- **Step Dependencies**: Step 19.3
- **User Instructions**: Run migration `016a_gifts.sql`

---

## Step 19.5: Create Coupon Manager

- **Task**: Create the comprehensive coupon/discount code management system.

- **Files**:

### `supabase/migrations/016b_coupons.sql`
```sql
-- ============================================================================
-- Migration: 016b_coupons
-- Description: Coupon and discount code management
-- Feature: 18.8 (Coupon Manager)
-- ============================================================================

-- ============================================================================
-- Coupons Table
-- ============================================================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Code
  code TEXT NOT NULL,
  
  -- Discount Type
  discount_type TEXT NOT NULL CHECK (discount_type IN (
    'percentage',       -- X% off
    'fixed_amount',     -- $X off
    'free_shipping',    -- Free shipping
    'buy_x_get_y'       -- Buy X get Y
  )),
  
  -- Discount Value
  discount_value DECIMAL(10, 2), -- Percentage or fixed amount
  buy_quantity INTEGER,          -- For buy_x_get_y
  get_quantity INTEGER,          -- For buy_x_get_y
  
  -- Usage Limits
  usage_limit INTEGER,           -- Total uses allowed (null = unlimited)
  per_customer_limit INTEGER DEFAULT 1, -- Uses per customer
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  -- Requirements
  minimum_purchase DECIMAL(10, 2),
  minimum_quantity INTEGER,
  
  -- Restrictions
  collection_ids TEXT[],         -- Limit to specific collections
  product_ids TEXT[],            -- Limit to specific products
  exclude_sale_items BOOLEAN NOT NULL DEFAULT false,
  first_time_only BOOLEAN NOT NULL DEFAULT false,
  
  -- Date Range
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Shopify Sync
  shopify_discount_id TEXT,
  shopify_synced_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'draft', 'active', 'paused', 'expired', 'depleted'
  )),
  
  -- Tracking
  total_discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  description TEXT,
  internal_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, code)
);

-- ============================================================================
-- Coupon Uses Table (for tracking per-customer usage)
-- ============================================================================
CREATE TABLE coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  
  order_id TEXT,
  shopify_order_id TEXT,
  
  discount_amount DECIMAL(10, 2) NOT NULL,
  order_total DECIMAL(10, 2),
  
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_coupons_user ON coupons(user_id);
CREATE INDEX idx_coupons_code ON coupons(user_id, code);
CREATE INDEX idx_coupons_status ON coupons(user_id, status);
CREATE INDEX idx_coupons_active ON coupons(user_id, starts_at, expires_at) 
  WHERE status = 'active';

CREATE INDEX idx_coupon_uses_coupon ON coupon_uses(coupon_id);
CREATE INDEX idx_coupon_uses_customer ON coupon_uses(customer_email);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupons_all ON coupons FOR ALL USING (user_id = auth.uid());

CREATE POLICY coupon_uses_all ON coupon_uses FOR ALL 
  USING (coupon_id IN (SELECT id FROM coupons WHERE user_id = auth.uid()));

-- ============================================================================
-- Trigger
-- ============================================================================
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Record coupon use
-- ============================================================================
CREATE OR REPLACE FUNCTION record_coupon_use(
  p_coupon_code TEXT,
  p_user_id UUID,
  p_customer_email TEXT,
  p_customer_id UUID,
  p_order_id TEXT,
  p_shopify_order_id TEXT,
  p_discount_amount DECIMAL,
  p_order_total DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_coupon coupons;
  v_customer_uses INTEGER;
BEGIN
  -- Get and lock coupon
  SELECT * INTO v_coupon FROM coupons 
  WHERE user_id = p_user_id AND code = p_coupon_code
  FOR UPDATE;
  
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_coupon.status != 'active' THEN RETURN false; END IF;
  
  -- Check usage limit
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
    RETURN false;
  END IF;
  
  -- Check per-customer limit
  SELECT COUNT(*) INTO v_customer_uses FROM coupon_uses 
  WHERE coupon_id = v_coupon.id AND customer_email = p_customer_email;
  
  IF v_coupon.per_customer_limit IS NOT NULL AND v_customer_uses >= v_coupon.per_customer_limit THEN
    RETURN false;
  END IF;
  
  -- Record use
  INSERT INTO coupon_uses (
    coupon_id, customer_id, customer_email, order_id, shopify_order_id,
    discount_amount, order_total
  ) VALUES (
    v_coupon.id, p_customer_id, p_customer_email, p_order_id, p_shopify_order_id,
    p_discount_amount, p_order_total
  );
  
  -- Update coupon stats
  UPDATE coupons SET
    usage_count = usage_count + 1,
    total_discount_amount = total_discount_amount + p_discount_amount,
    total_orders = total_orders + 1,
    status = CASE 
      WHEN usage_limit IS NOT NULL AND usage_count + 1 >= usage_limit THEN 'depleted'
      ELSE status
    END
  WHERE id = v_coupon.id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

### `types/coupons.ts`
```typescript
export type CouponDiscountType = 
  | 'percentage' 
  | 'fixed_amount' 
  | 'free_shipping' 
  | 'buy_x_get_y';

export type CouponStatus = 'draft' | 'active' | 'paused' | 'expired' | 'depleted';

export interface Coupon {
  id: string;
  user_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value?: number;
  buy_quantity?: number;
  get_quantity?: number;
  usage_limit?: number;
  per_customer_limit?: number;
  usage_count: number;
  minimum_purchase?: number;
  minimum_quantity?: number;
  collection_ids?: string[];
  product_ids?: string[];
  exclude_sale_items: boolean;
  first_time_only: boolean;
  starts_at: string;
  expires_at?: string;
  shopify_discount_id?: string;
  shopify_synced_at?: string;
  status: CouponStatus;
  total_discount_amount: number;
  total_orders: number;
  description?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CouponUse {
  id: string;
  coupon_id: string;
  customer_id?: string;
  customer_email: string;
  order_id?: string;
  shopify_order_id?: string;
  discount_amount: number;
  order_total?: number;
  used_at: string;
}

export interface CreateCouponInput {
  code: string;
  discount_type: CouponDiscountType;
  discount_value?: number;
  buy_quantity?: number;
  get_quantity?: number;
  usage_limit?: number;
  per_customer_limit?: number;
  minimum_purchase?: number;
  minimum_quantity?: number;
  collection_ids?: string[];
  product_ids?: string[];
  exclude_sale_items?: boolean;
  first_time_only?: boolean;
  starts_at?: string;
  expires_at?: string;
  description?: string;
  internal_notes?: string;
}
```

### `lib/coupons/coupon-service.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { Coupon, CreateCouponInput } from '@/types/coupons';

export async function createCoupon(
  userId: string,
  input: CreateCouponInput
): Promise<Coupon> {
  const supabase = createClient();

  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert({
      user_id: userId,
      code: input.code.toUpperCase(),
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      buy_quantity: input.buy_quantity,
      get_quantity: input.get_quantity,
      usage_limit: input.usage_limit,
      per_customer_limit: input.per_customer_limit ?? 1,
      minimum_purchase: input.minimum_purchase,
      minimum_quantity: input.minimum_quantity,
      collection_ids: input.collection_ids,
      product_ids: input.product_ids,
      exclude_sale_items: input.exclude_sale_items ?? false,
      first_time_only: input.first_time_only ?? false,
      starts_at: input.starts_at || new Date().toISOString(),
      expires_at: input.expires_at,
      description: input.description,
      internal_notes: input.internal_notes,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create coupon: ${error.message}`);

  return coupon;
}

export async function updateCoupon(
  userId: string,
  couponId: string,
  updates: Partial<CreateCouponInput & { status: string }>
): Promise<Coupon> {
  const supabase = createClient();

  if (updates.code) {
    updates.code = updates.code.toUpperCase();
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .update(updates)
    .eq('id', couponId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update coupon: ${error.message}`);

  return coupon;
}

export async function getCouponStats(userId: string): Promise<{
  totalCoupons: number;
  activeCoupons: number;
  totalUsage: number;
  totalDiscountGiven: number;
}> {
  const supabase = createClient();

  const { data: coupons } = await supabase
    .from('coupons')
    .select('status, usage_count, total_discount_amount')
    .eq('user_id', userId);

  return {
    totalCoupons: coupons?.length || 0,
    activeCoupons: coupons?.filter(c => c.status === 'active').length || 0,
    totalUsage: coupons?.reduce((sum, c) => sum + c.usage_count, 0) || 0,
    totalDiscountGiven: coupons?.reduce((sum, c) => sum + Number(c.total_discount_amount), 0) || 0,
  };
}

export async function validateCoupon(
  userId: string,
  code: string,
  customerEmail: string,
  cartTotal: number
): Promise<{ valid: boolean; reason?: string; coupon?: Coupon }> {
  const supabase = createClient();

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('user_id', userId)
    .eq('code', code.toUpperCase())
    .single();

  if (!coupon) {
    return { valid: false, reason: 'Invalid coupon code' };
  }

  if (coupon.status !== 'active') {
    return { valid: false, reason: 'Coupon is not active' };
  }

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, reason: 'Coupon is not yet active' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, reason: 'Coupon has expired' };
  }

  if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }

  if (coupon.minimum_purchase && cartTotal < coupon.minimum_purchase) {
    return { 
      valid: false, 
      reason: `Minimum purchase of $${coupon.minimum_purchase} required` 
    };
  }

  // Check per-customer usage
  if (coupon.per_customer_limit) {
    const { count } = await supabase
      .from('coupon_uses')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('customer_email', customerEmail);

    if (count && count >= coupon.per_customer_limit) {
      return { valid: false, reason: 'You have already used this coupon' };
    }
  }

  return { valid: true, coupon };
}
```

### `app/api/coupons/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCoupon, getCouponStats } from '@/lib/coupons/coupon-service';

// GET /api/coupons - List coupons
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const includeStats = searchParams.get('stats') === 'true';

  let query = supabase
    .from('coupons')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: coupons, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: any = { coupons };

  if (includeStats) {
    response.stats = await getCouponStats(user.id);
  }

  return NextResponse.json(response);
}

// POST /api/coupons - Create coupon
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const coupon = await createCoupon(user.id, body);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
```

### `app/(dashboard)/dashboard/campaigns/coupons/page.tsx`
```tsx
'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coupon, CouponStatus, CouponDiscountType } from '@/types/coupons';
import { Plus, Edit2, Trash2, Copy, Tag, Percent, DollarSign, Truck } from 'lucide-react';

const STATUS_BADGES: Record<CouponStatus, { variant: string; label: string }> = {
  draft: { variant: 'default', label: 'Draft' },
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'warning', label: 'Paused' },
  expired: { variant: 'secondary', label: 'Expired' },
  depleted: { variant: 'secondary', label: 'Depleted' },
};

const DISCOUNT_ICONS: Record<CouponDiscountType, any> = {
  percentage: Percent,
  fixed_amount: DollarSign,
  free_shipping: Truck,
  buy_x_get_y: Tag,
};

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage' as CouponDiscountType,
    discount_value: 10,
    usage_limit: undefined as number | undefined,
    expires_at: '',
    description: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const response = await fetch('/api/coupons?stats=true');
      if (!response.ok) throw new Error('Failed to fetch coupons');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (coupon: typeof newCoupon) => {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon),
      });
      if (!response.ok) throw new Error('Failed to create coupon');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setIsCreateOpen(false);
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        usage_limit: undefined,
        expires_at: '',
        description: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete coupon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const coupons = data?.coupons || [];
  const stats = data?.stats;

  const formatDiscount = (coupon: Coupon): string => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% off`;
      case 'fixed_amount':
        return `$${coupon.discount_value} off`;
      case 'free_shipping':
        return 'Free shipping';
      case 'buy_x_get_y':
        return `Buy ${coupon.buy_quantity} get ${coupon.get_quantity}`;
      default:
        return '';
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <PageContainer
      title="Coupons"
      description="Manage discount codes and promotions"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      }
    >
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Coupons</div>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-bold">{stats.activeCoupons}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Uses</div>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Discount Given</div>
            <div className="text-2xl font-bold">
              ${stats.totalDiscountGiven.toLocaleString()}
            </div>
          </Card>
        </div>
      )}

      {/* Coupons List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : coupons.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No coupons yet</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Coupon
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon: Coupon) => {
            const Icon = DISCOUNT_ICONS[coupon.discount_type];
            return (
              <Card key={coupon.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-sage-100 rounded-lg">
                      <Icon className="h-5 w-5 text-sage-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-lg">{coupon.code}</code>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <Badge variant={STATUS_BADGES[coupon.status].variant as any}>
                          {STATUS_BADGES[coupon.status].label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDiscount(coupon)}
                        {coupon.expires_at && (
                          <> • Expires {new Date(coupon.expires_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-semibold">{coupon.usage_count}</div>
                      <div className="text-xs text-muted-foreground">
                        {coupon.usage_limit ? `of ${coupon.usage_limit}` : 'uses'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${Number(coupon.total_discount_amount).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">discounted</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this coupon?')) {
                            deleteMutation.mutate(coupon.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Coupon"
      >
        <div className="space-y-4">
          <div>
            <Label>Coupon Code</Label>
            <Input
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
            />
          </div>

          <div>
            <Label>Discount Type</Label>
            <Select
              value={newCoupon.discount_type}
              onChange={(value) => setNewCoupon({ ...newCoupon, discount_type: value as CouponDiscountType })}
              options={[
                { value: 'percentage', label: 'Percentage Off' },
                { value: 'fixed_amount', label: 'Fixed Amount Off' },
                { value: 'free_shipping', label: 'Free Shipping' },
              ]}
            />
          </div>

          {newCoupon.discount_type !== 'free_shipping' && (
            <div>
              <Label>
                {newCoupon.discount_type === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <Input
                type="number"
                value={newCoupon.discount_value}
                onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
              />
            </div>
          )}

          <div>
            <Label>Usage Limit (optional)</Label>
            <Input
              type="number"
              value={newCoupon.usage_limit || ''}
              onChange={(e) => setNewCoupon({ 
                ...newCoupon, 
                usage_limit: e.target.value ? Number(e.target.value) : undefined 
              })}
              placeholder="Unlimited"
            />
          </div>

          <div>
            <Label>Expires (optional)</Label>
            <Input
              type="date"
              value={newCoupon.expires_at}
              onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate(newCoupon)}
              disabled={!newCoupon.code || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Coupon'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
```

- **Step Dependencies**: Step 19.4
- **User Instructions**: Run migrations `016a_gifts.sql` and `016b_coupons.sql`

---

**Part 10 Summary**

This part covers:

**Phase 17 (Customer Journey):**
- Unified customers table with stage tracking
- Touchpoints table for all customer interactions
- Stage transitions with trigger tracking
- Customer segments with dynamic membership
- Collection affinity calculation
- Journey service for recording touchpoints
- Stage progression logic (visitor → lead → customer → repeat → VIP)
- At-risk and churn detection
- Journey analytics API and funnel visualization

**Phase 18 (Win-Back Campaigns):**
- Win-back campaigns with targeting criteria
- Recipients table with status tracking
- Incentive configuration (discounts, free shipping, etc.)
- Klaviyo flow integration
- Recovery tracking with revenue attribution
- Eligibility function based on inactivity and LTV
- Win-back processing service

**Phase 19 (Loyalty Program):**
- Loyalty tiers with configurable benefits
- Customer loyalty records with points balance
- Points transactions with expiration
- Rewards catalog with redemption tracking
- Points multipliers based on tier
- Referral program with code generation
- Tier upgrade automation
- Loyalty dashboard analytics
- **Referral Program UI** with stats and leaderboard
- **Gifting System** with scheduled delivery and claim pages
- **Coupon Manager** with usage tracking and validation

---

**Remaining phases to cover:**
- **Part 11:** Phase 20-23 (Attribution, Campaigns, Intelligence, Daily Digest, Polish)
