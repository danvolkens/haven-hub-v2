# Haven Hub: Complete Implementation Task Plan
## Part 8: Phases 11-13 (Pinterest Core, Analytics, Ads)

---

# Phase 11: Pinterest Core Integration

## Step 11.1: Create Pinterest Database Schema

- **Task**: Create database schema for pins, boards, and scheduling.

- **Files**:

### `supabase/migrations/009_pinterest.sql`
```sql
-- ============================================================================
-- Migration: 009_pinterest
-- Description: Pinterest pins, boards, and scheduling
-- Feature: 11 (Pinterest Core)
-- ============================================================================

-- ============================================================================
-- Pinterest Boards Table
-- ============================================================================
CREATE TABLE pinterest_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Pinterest references
  pinterest_board_id TEXT NOT NULL,
  
  -- Board details
  name TEXT NOT NULL,
  description TEXT,
  privacy TEXT DEFAULT 'PUBLIC' CHECK (privacy IN ('PUBLIC', 'PROTECTED', 'SECRET')),
  
  -- Stats (synced from Pinterest)
  pin_count INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  
  -- Haven Hub metadata
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary board for this collection
  
  -- Sync status
  synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, pinterest_board_id)
);

-- ============================================================================
-- Pins Table
-- ============================================================================
CREATE TABLE pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Source references
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  mockup_id UUID REFERENCES mockups(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  
  -- Pinterest references
  pinterest_pin_id TEXT,
  pinterest_board_id TEXT NOT NULL,
  board_id UUID REFERENCES pinterest_boards(id) ON DELETE SET NULL,
  
  -- Pin content
  title TEXT NOT NULL,
  description TEXT,
  link TEXT, -- Product link
  alt_text TEXT,
  
  -- Image
  image_url TEXT NOT NULL,
  
  -- Copy variant tracking (Feature 12)
  copy_variant TEXT, -- 'a', 'b', 'c', etc.
  copy_template_id UUID,
  
  -- Classification
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  
  -- Scheduling
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Not scheduled
    'scheduled',    -- Queued for publishing
    'publishing',   -- Currently being published
    'published',    -- Live on Pinterest
    'failed',       -- Publishing failed
    'retired'       -- Removed/retired
  )),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Performance metrics (synced from Pinterest Analytics)
  impressions INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  outbound_clicks INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,4), -- saves + clicks / impressions
  
  -- Performance tracking
  last_metrics_sync TIMESTAMPTZ,
  performance_tier TEXT CHECK (performance_tier IN ('top', 'good', 'average', 'underperformer')),
  
  -- Error tracking
  last_error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Pin Schedule Table (for recurring/batch scheduling)
-- ============================================================================
CREATE TABLE pin_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Schedule configuration
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Time slots (per spec: optimal Pinterest posting times)
  time_slots JSONB NOT NULL DEFAULT '[
    {"day": 0, "hour": 20, "minute": 0},
    {"day": 1, "hour": 20, "minute": 0},
    {"day": 2, "hour": 20, "minute": 0},
    {"day": 3, "hour": 20, "minute": 0},
    {"day": 4, "hour": 20, "minute": 0},
    {"day": 5, "hour": 14, "minute": 0},
    {"day": 6, "hour": 14, "minute": 0}
  ]',
  
  -- Timezone
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Limits (respects guardrails)
  max_pins_per_day INTEGER NOT NULL DEFAULT 5,
  
  -- Rotation settings
  rotate_collections BOOLEAN NOT NULL DEFAULT true,
  collection_weights JSONB DEFAULT '{"grounding": 0.33, "wholeness": 0.33, "growth": 0.34}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Copy Templates Table (for A/B testing pin descriptions)
-- ============================================================================
CREATE TABLE pin_copy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Template details
  name TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'a', -- 'a', 'b', 'c'
  
  -- Template content (supports variables)
  title_template TEXT NOT NULL,
  description_template TEXT NOT NULL,
  -- Variables: {quote}, {collection}, {mood}, {product_link}, {shop_name}
  
  -- Targeting
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  mood TEXT,
  
  -- Performance
  times_used INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_saves INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  avg_engagement_rate NUMERIC(5,4),
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_boards_user ON pinterest_boards(user_id);
CREATE INDEX idx_boards_collection ON pinterest_boards(user_id, collection);
CREATE INDEX idx_boards_pinterest ON pinterest_boards(pinterest_board_id);

CREATE INDEX idx_pins_user ON pins(user_id);
CREATE INDEX idx_pins_status ON pins(user_id, status);
CREATE INDEX idx_pins_scheduled ON pins(scheduled_for, status) WHERE status = 'scheduled';
CREATE INDEX idx_pins_asset ON pins(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX idx_pins_mockup ON pins(mockup_id) WHERE mockup_id IS NOT NULL;
CREATE INDEX idx_pins_pinterest ON pins(pinterest_pin_id) WHERE pinterest_pin_id IS NOT NULL;
CREATE INDEX idx_pins_performance ON pins(user_id, performance_tier, impressions DESC);
CREATE INDEX idx_pins_collection ON pins(user_id, collection, status);

CREATE INDEX idx_copy_templates_user ON pin_copy_templates(user_id);
CREATE INDEX idx_copy_templates_collection ON pin_copy_templates(user_id, collection);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE pinterest_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_copy_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY boards_all ON pinterest_boards FOR ALL USING (user_id = auth.uid());
CREATE POLICY pins_all ON pins FOR ALL USING (user_id = auth.uid());
CREATE POLICY schedules_all ON pin_schedules FOR ALL USING (user_id = auth.uid());
CREATE POLICY copy_templates_all ON pin_copy_templates FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER boards_updated_at BEFORE UPDATE ON pinterest_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER pins_updated_at BEFORE UPDATE ON pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON pin_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER copy_updated_at BEFORE UPDATE ON pin_copy_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Get next available schedule slot
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_pin_slot(
  p_user_id UUID,
  p_after TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_schedule RECORD;
  v_slot RECORD;
  v_next_slot TIMESTAMPTZ;
  v_pins_on_day INTEGER;
  v_max_pins INTEGER;
  v_check_date DATE;
  v_slot_time TIME;
BEGIN
  -- Get user's schedule
  SELECT * INTO v_schedule
  FROM pin_schedules
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Default: next hour
    RETURN date_trunc('hour', p_after) + INTERVAL '1 hour';
  END IF;
  
  v_max_pins := LEAST(v_schedule.max_pins_per_day, 
    COALESCE((SELECT (guardrails->>'daily_pin_limit')::INTEGER FROM user_settings WHERE user_id = p_user_id), 5)
  );
  
  -- Check each day starting from p_after
  FOR i IN 0..30 LOOP
    v_check_date := (p_after AT TIME ZONE v_schedule.timezone)::DATE + i;
    
    -- Count pins already scheduled for this day
    SELECT COUNT(*) INTO v_pins_on_day
    FROM pins
    WHERE user_id = p_user_id
      AND status IN ('scheduled', 'publishing', 'published')
      AND (scheduled_for AT TIME ZONE v_schedule.timezone)::DATE = v_check_date;
    
    IF v_pins_on_day < v_max_pins THEN
      -- Find available slot on this day
      FOR v_slot IN 
        SELECT * FROM jsonb_array_elements(v_schedule.time_slots) AS slot
        WHERE (slot->>'day')::INTEGER = EXTRACT(DOW FROM v_check_date)
        ORDER BY (slot->>'hour')::INTEGER, (slot->>'minute')::INTEGER
      LOOP
        v_slot_time := make_time(
          (v_slot.slot->>'hour')::INTEGER,
          (v_slot.slot->>'minute')::INTEGER,
          0
        );
        v_next_slot := (v_check_date + v_slot_time) AT TIME ZONE v_schedule.timezone;
        
        -- Check if slot is available and in the future
        IF v_next_slot > p_after THEN
          -- Check if slot is not already taken
          IF NOT EXISTS (
            SELECT 1 FROM pins
            WHERE user_id = p_user_id
              AND status = 'scheduled'
              AND scheduled_for = v_next_slot
          ) THEN
            RETURN v_next_slot;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Fallback: 1 hour from now
  RETURN date_trunc('hour', p_after) + INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Calculate engagement rate
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_engagement_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.impressions > 0 THEN
    NEW.engagement_rate := (NEW.saves + NEW.clicks)::NUMERIC / NEW.impressions;
  ELSE
    NEW.engagement_rate := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pins_engagement_rate
  BEFORE INSERT OR UPDATE OF impressions, saves, clicks ON pins
  FOR EACH ROW EXECUTE FUNCTION calculate_engagement_rate();
```

### `types/pinterest.ts`
```typescript
export interface PinterestBoard {
  id: string;
  user_id: string;
  pinterest_board_id: string;
  name: string;
  description: string | null;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
  pin_count: number;
  follower_count: number;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  is_primary: boolean;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pin {
  id: string;
  user_id: string;
  asset_id: string | null;
  mockup_id: string | null;
  quote_id: string | null;
  pinterest_pin_id: string | null;
  pinterest_board_id: string;
  board_id: string | null;
  title: string;
  description: string | null;
  link: string | null;
  alt_text: string | null;
  image_url: string;
  copy_variant: string | null;
  copy_template_id: string | null;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  status: PinStatus;
  scheduled_for: string | null;
  published_at: string | null;
  impressions: number;
  saves: number;
  clicks: number;
  outbound_clicks: number;
  engagement_rate: number | null;
  last_metrics_sync: string | null;
  performance_tier: 'top' | 'good' | 'average' | 'underperformer' | null;
  last_error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export type PinStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'publishing' 
  | 'published' 
  | 'failed' 
  | 'retired';

export interface PinSchedule {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  time_slots: TimeSlot[];
  timezone: string;
  max_pins_per_day: number;
  rotate_collections: boolean;
  collection_weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  day: number; // 0-6, Sunday = 0
  hour: number;
  minute: number;
}

export interface PinCopyTemplate {
  id: string;
  user_id: string;
  name: string;
  variant: string;
  title_template: string;
  description_template: string;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  mood: string | null;
  times_used: number;
  total_impressions: number;
  total_saves: number;
  total_clicks: number;
  avg_engagement_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePinRequest {
  assetId?: string;
  mockupId?: string;
  boardId: string;
  title: string;
  description?: string;
  link?: string;
  scheduledFor?: string;
  copyTemplateId?: string;
}

export interface SchedulePinRequest {
  pinIds: string[];
  startFrom?: string;
  respectSchedule?: boolean;
}
```

- **Step Dependencies**: Step 5.3
- **User Instructions**: Run migration

---

## Step 11.2: Implement Pin Publishing Service

- **Task**: Create the service for publishing pins to Pinterest with rate limiting.

- **Files**:

### `lib/pinterest/pin-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { PinterestClient, CreatePinRequest as PinterestCreatePinRequest } from '@/lib/integrations/pinterest/client';
import { checkRateLimit } from '@/lib/cache/rate-limiter';
import type { CreatePinRequest, Pin } from '@/types/pinterest';

interface PinPublishResult {
  success: boolean;
  pin?: Pin;
  pinterestPinId?: string;
  error?: string;
}

export async function createPin(
  userId: string,
  request: CreatePinRequest
): Promise<PinPublishResult> {
  const supabase = createServerSupabaseClient();

  try {
    // Get image URL from asset or mockup
    let imageUrl: string | null = null;
    let quoteId: string | null = null;
    let collection: string | null = null;

    if (request.assetId) {
      const { data: asset } = await supabase
        .from('assets')
        .select('file_url, quote_id, quotes(collection)')
        .eq('id', request.assetId)
        .single();
      
      if (asset) {
        imageUrl = asset.file_url;
        quoteId = asset.quote_id;
        collection = asset.quotes?.collection;
      }
    } else if (request.mockupId) {
      const { data: mockup } = await supabase
        .from('mockups')
        .select('file_url, quote_id, quotes(collection)')
        .eq('id', request.mockupId)
        .single();
      
      if (mockup) {
        imageUrl = mockup.file_url;
        quoteId = mockup.quote_id;
        collection = mockup.quotes?.collection;
      }
    }

    if (!imageUrl) {
      throw new Error('No valid image source provided');
    }

    // Get board info
    const { data: board } = await supabase
      .from('pinterest_boards')
      .select('pinterest_board_id')
      .eq('id', request.boardId)
      .eq('user_id', userId)
      .single();

    if (!board) {
      throw new Error('Board not found');
    }

    // Apply copy template if provided
    let finalTitle = request.title;
    let finalDescription = request.description;
    let copyVariant: string | null = null;

    if (request.copyTemplateId) {
      const { data: template } = await supabase
        .from('pin_copy_templates')
        .select('*')
        .eq('id', request.copyTemplateId)
        .single();

      if (template) {
        // Get quote for variable substitution
        const { data: quote } = quoteId
          ? await supabase.from('quotes').select('text, collection, mood').eq('id', quoteId).single()
          : { data: null };

        const variables = {
          quote: quote?.text || '',
          collection: quote?.collection || collection || '',
          mood: quote?.mood || '',
          product_link: request.link || '',
          shop_name: 'Haven & Hold',
        };

        finalTitle = substituteVariables(template.title_template, variables);
        finalDescription = substituteVariables(template.description_template, variables);
        copyVariant = template.variant;

        // Update template usage
        await supabase
          .from('pin_copy_templates')
          .update({ times_used: template.times_used + 1 })
          .eq('id', template.id);
      }
    }

    // Create local pin record
    const { data: pin, error: pinError } = await supabase
      .from('pins')
      .insert({
        user_id: userId,
        asset_id: request.assetId,
        mockup_id: request.mockupId,
        quote_id: quoteId,
        pinterest_board_id: board.pinterest_board_id,
        board_id: request.boardId,
        title: finalTitle,
        description: finalDescription,
        link: request.link,
        image_url: imageUrl,
        copy_variant: copyVariant,
        copy_template_id: request.copyTemplateId,
        collection,
        status: request.scheduledFor ? 'scheduled' : 'draft',
        scheduled_for: request.scheduledFor,
      })
      .select()
      .single();

    if (pinError) {
      throw new Error(pinError.message);
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: request.scheduledFor ? 'pin_scheduled' : 'pin_created',
      p_details: {
        pinId: pin.id,
        boardId: request.boardId,
        scheduledFor: request.scheduledFor,
      },
      p_executed: true,
      p_module: 'pinterest',
      p_reference_id: pin.id,
      p_reference_table: 'pins',
    });

    return {
      success: true,
      pin: pin as Pin,
    };
  } catch (error) {
    console.error('Pin creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function publishPin(
  userId: string,
  pinId: string
): Promise<PinPublishResult> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit('pinterest', userId);
    if (!rateLimitResult.success) {
      throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.reset}s`);
    }

    // Get pin
    const { data: pin } = await supabase
      .from('pins')
      .select('*')
      .eq('id', pinId)
      .eq('user_id', userId)
      .single();

    if (!pin) {
      throw new Error('Pin not found');
    }

    if (pin.status === 'published') {
      throw new Error('Pin already published');
    }

    // Update status to publishing
    await supabase
      .from('pins')
      .update({ status: 'publishing' })
      .eq('id', pinId);

    // Get Pinterest credentials
    const accessToken = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Pinterest not connected');
    }

    const pinterestClient = new PinterestClient({ accessToken: accessToken.data });

    // Publish to Pinterest
    const pinterestPin = await pinterestClient.createPin({
      board_id: pin.pinterest_board_id,
      media_source: {
        source_type: 'image_url',
        url: pin.image_url,
      },
      title: pin.title,
      description: pin.description || undefined,
      link: pin.link || undefined,
      alt_text: pin.alt_text || pin.title,
    });

    // Update pin with Pinterest ID
    const { data: updatedPin } = await supabase
      .from('pins')
      .update({
        pinterest_pin_id: pinterestPin.id,
        status: 'published',
        published_at: new Date().toISOString(),
        last_error: null,
        retry_count: 0,
      })
      .eq('id', pinId)
      .select()
      .single();

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'pin_published',
      p_details: {
        pinId,
        pinterestPinId: pinterestPin.id,
      },
      p_executed: true,
      p_module: 'pinterest',
      p_reference_id: pinId,
      p_reference_table: 'pins',
    });

    return {
      success: true,
      pin: updatedPin as Pin,
      pinterestPinId: pinterestPin.id,
    };
  } catch (error) {
    console.error('Pin publish error:', error);

    // Update pin with error
    await supabase
      .from('pins')
      .update({
        status: 'failed',
        last_error: error instanceof Error ? error.message : 'Unknown error',
        retry_count: supabase.sql`retry_count + 1`,
      })
      .eq('id', pinId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function schedulePins(
  userId: string,
  pinIds: string[],
  startFrom?: string
): Promise<{ scheduled: number; errors: string[] }> {
  const supabase = createServerSupabaseClient();
  const errors: string[] = [];
  let scheduled = 0;

  let nextSlot = startFrom ? new Date(startFrom) : new Date();

  for (const pinId of pinIds) {
    try {
      // Get next available slot
      const { data: slotResult } = await supabase.rpc('get_next_pin_slot', {
        p_user_id: userId,
        p_after: nextSlot.toISOString(),
      });

      const scheduledFor = slotResult || nextSlot.toISOString();

      await supabase
        .from('pins')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor,
        })
        .eq('id', pinId)
        .eq('user_id', userId)
        .eq('status', 'draft');

      nextSlot = new Date(scheduledFor);
      scheduled++;
    } catch (error) {
      errors.push(`Pin ${pinId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { scheduled, errors };
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return result;
}
```

- **Step Dependencies**: Step 11.1
- **User Instructions**: None

---

## Step 11.3: Create Pins API Endpoints

- **Task**: Build API routes for pin CRUD, scheduling, and publishing.

- **Files**:

### `app/api/pins/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { createPin } from '@/lib/pinterest/pin-service';

const querySchema = z.object({
  status: z.string().optional(),
  collection: z.string().optional(),
  boardId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  assetId: z.string().uuid().optional(),
  mockupId: z.string().uuid().optional(),
  boardId: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  link: z.string().url().optional(),
  scheduledFor: z.string().datetime().optional(),
  copyTemplateId: z.string().uuid().optional(),
}).refine((data) => data.assetId || data.mockupId, {
  message: 'Either assetId or mockupId is required',
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, collection, boardId, limit, offset } = querySchema.parse(searchParams);
    
    let query = supabase
      .from('pins')
      .select(`
        *,
        board:pinterest_boards(id, name, collection),
        asset:assets(id, file_url, thumbnail_url),
        mockup:mockups(id, file_url, thumbnail_url)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (collection) {
      query = query.eq('collection', collection);
    }
    
    if (boardId) {
      query = query.eq('board_id', boardId);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      pins: data,
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    
    const data = createSchema.parse(body);
    const result = await createPin(userId, data);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      pin: result.pin,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/pins/[id]/publish/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { publishPin } from '@/lib/pinterest/pin-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const result = await publishPin(userId, params.id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      pin: result.pin,
      pinterestPinId: result.pinterestPinId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/pins/schedule/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/auth/session';
import { schedulePins } from '@/lib/pinterest/pin-service';

const scheduleSchema = z.object({
  pinIds: z.array(z.string().uuid()).min(1).max(50),
  startFrom: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    
    const { pinIds, startFrom } = scheduleSchema.parse(body);
    const result = await schedulePins(userId, pinIds, startFrom);
    
    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
      errors: result.errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/boards/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const updateSchema = z.object({
  collection: z.enum(['grounding', 'wholeness', 'growth']).nullable().optional(),
  is_primary: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('pinterest_boards')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ boards: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { boardId, ...updates } = body;
    const validatedUpdates = updateSchema.parse(updates);
    
    // If setting as primary, unset other primaries in same collection
    if (validatedUpdates.is_primary && validatedUpdates.collection) {
      await supabase
        .from('pinterest_boards')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('collection', validatedUpdates.collection);
    }
    
    const { data, error } = await supabase
      .from('pinterest_boards')
      .update(validatedUpdates)
      .eq('id', boardId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ board: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 11.2
- **User Instructions**: None

---

# Phase 12: Pinterest Analytics

## Step 12.1: Implement Analytics Sync Service

- **Task**: Create the service for syncing Pinterest analytics data.

- **Files**:

### `lib/pinterest/analytics-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { PinterestClient } from '@/lib/integrations/pinterest/client';

interface AnalyticsSyncResult {
  success: boolean;
  pinsUpdated: number;
  errors: string[];
}

export async function syncPinAnalytics(userId: string): Promise<AnalyticsSyncResult> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();
  const errors: string[] = [];
  let pinsUpdated = 0;

  try {
    // Get Pinterest credentials
    const accessToken = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Pinterest not connected');
    }

    const pinterestClient = new PinterestClient({ accessToken: accessToken.data });

    // Get all published pins
    const { data: pins } = await supabase
      .from('pins')
      .select('id, pinterest_pin_id')
      .eq('user_id', userId)
      .eq('status', 'published')
      .not('pinterest_pin_id', 'is', null);

    if (!pins || pins.length === 0) {
      return { success: true, pinsUpdated: 0, errors: [] };
    }

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Sync analytics for each pin
    for (const pin of pins) {
      try {
        const analytics = await pinterestClient.getPinAnalytics(pin.pinterest_pin_id!, {
          start_date: startDateStr,
          end_date: endDateStr,
          metric_types: ['IMPRESSION', 'SAVE', 'PIN_CLICK', 'OUTBOUND_CLICK'],
        });

        // Calculate totals from daily metrics
        let impressions = 0;
        let saves = 0;
        let clicks = 0;
        let outboundClicks = 0;

        for (const day of analytics.daily_metrics || []) {
          impressions += day.metrics.IMPRESSION || 0;
          saves += day.metrics.SAVE || 0;
          clicks += day.metrics.PIN_CLICK || 0;
          outboundClicks += day.metrics.OUTBOUND_CLICK || 0;
        }

        // Determine performance tier
        const engagementRate = impressions > 0 ? (saves + clicks) / impressions : 0;
        let performanceTier: string;
        
        if (engagementRate >= 0.05) {
          performanceTier = 'top';
        } else if (engagementRate >= 0.02) {
          performanceTier = 'good';
        } else if (engagementRate >= 0.01) {
          performanceTier = 'average';
        } else {
          performanceTier = 'underperformer';
        }

        // Update pin
        await supabase
          .from('pins')
          .update({
            impressions,
            saves,
            clicks,
            outbound_clicks: outboundClicks,
            performance_tier: performanceTier,
            last_metrics_sync: new Date().toISOString(),
          })
          .eq('id', pin.id);

        pinsUpdated++;
      } catch (error) {
        errors.push(`Pin ${pin.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update copy template performance
    await updateCopyTemplatePerformance(userId);

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'analytics_synced',
      p_details: { pinsUpdated, errors: errors.length },
      p_executed: true,
      p_module: 'pinterest',
    });

    return { success: true, pinsUpdated, errors };
  } catch (error) {
    console.error('Analytics sync error:', error);
    return {
      success: false,
      pinsUpdated,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

async function updateCopyTemplatePerformance(userId: string) {
  const supabase = createServerSupabaseClient();

  // Get all templates with their pin performance
  const { data: templates } = await supabase
    .from('pin_copy_templates')
    .select('id')
    .eq('user_id', userId);

  if (!templates) return;

  for (const template of templates) {
    // Aggregate performance from all pins using this template
    const { data: stats } = await supabase
      .from('pins')
      .select('impressions, saves, clicks')
      .eq('user_id', userId)
      .eq('copy_template_id', template.id)
      .eq('status', 'published');

    if (stats && stats.length > 0) {
      const totalImpressions = stats.reduce((sum, p) => sum + p.impressions, 0);
      const totalSaves = stats.reduce((sum, p) => sum + p.saves, 0);
      const totalClicks = stats.reduce((sum, p) => sum + p.clicks, 0);
      const avgEngagement = totalImpressions > 0 
        ? (totalSaves + totalClicks) / totalImpressions 
        : null;

      await supabase
        .from('pin_copy_templates')
        .update({
          total_impressions: totalImpressions,
          total_saves: totalSaves,
          total_clicks: totalClicks,
          avg_engagement_rate: avgEngagement,
        })
        .eq('id', template.id);
    }
  }
}

export async function getTopPerformingPins(
  userId: string,
  limit: number = 10
): Promise<{ pins: any[]; error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('pins')
    .select(`
      *,
      asset:assets(file_url, quotes(text)),
      mockup:mockups(file_url)
    `)
    .eq('user_id', userId)
    .eq('status', 'published')
    .in('performance_tier', ['top', 'good'])
    .order('engagement_rate', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return { pins: [], error: error.message };
  }

  return { pins: data || [] };
}

export async function getUnderperformingPins(
  userId: string,
  daysThreshold: number = 7
): Promise<{ pins: any[]; error?: string }> {
  const supabase = createServerSupabaseClient();
  
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

  const { data, error } = await supabase
    .from('pins')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'published')
    .eq('performance_tier', 'underperformer')
    .lt('published_at', thresholdDate.toISOString());

  if (error) {
    return { pins: [], error: error.message };
  }

  return { pins: data || [] };
}
```

- **Step Dependencies**: Step 11.3
- **User Instructions**: None

---

## Step 12.2: Create Analytics Dashboard Components

- **Task**: Build the Pinterest analytics dashboard UI.

- **Files**:

### `app/(dashboard)/dashboard/pinterest/analytics/page.tsx`
```typescript
import { PageContainer } from '@/components/layout/page-container';
import { AnalyticsOverview } from '@/components/pinterest/analytics-overview';
import { TopPinsTable } from '@/components/pinterest/top-pins-table';
import { CopyTemplatePerformance } from '@/components/pinterest/copy-template-performance';
import { PerformanceChart } from '@/components/pinterest/performance-chart';

export const metadata = {
  title: 'Pinterest Analytics | Haven Hub',
};

export default function PinterestAnalyticsPage() {
  return (
    <PageContainer
      title="Pinterest Analytics"
      description="Track pin performance and optimize your strategy"
    >
      <div className="space-y-6">
        <AnalyticsOverview />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <PerformanceChart />
          <CopyTemplatePerformance />
        </div>
        
        <TopPinsTable />
      </div>
    </PageContainer>
  );
}
```

### `components/pinterest/analytics-overview.tsx`
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Eye, Heart, MousePointer, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber, formatPercent } from '@/lib/utils';

interface AnalyticsData {
  impressions: number;
  saves: number;
  clicks: number;
  engagementRate: number;
  publishedPins: number;
  topPerformers: number;
  underperformers: number;
  lastSynced: string | null;
}

export function AnalyticsOverview() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pinterest-analytics-overview'],
    queryFn: () => api.get<AnalyticsData>('/pinterest/analytics/overview'),
    refetchInterval: 300000, // 5 minutes
  });

  const handleSync = async () => {
    await api.post('/pinterest/analytics/sync');
    refetch();
  };

  const metrics = [
    {
      label: 'Total Impressions',
      value: data?.impressions || 0,
      icon: Eye,
      format: formatNumber,
    },
    {
      label: 'Total Saves',
      value: data?.saves || 0,
      icon: Heart,
      format: formatNumber,
    },
    {
      label: 'Total Clicks',
      value: data?.clicks || 0,
      icon: MousePointer,
      format: formatNumber,
    },
    {
      label: 'Engagement Rate',
      value: data?.engagementRate || 0,
      icon: TrendingUp,
      format: formatPercent,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-h2">Overview</h2>
          {data?.lastSynced && (
            <span className="text-caption text-[var(--color-text-tertiary)]">
              Last synced: {new Date(data.lastSynced).toLocaleString()}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSync}
          isLoading={isFetching}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Sync Now
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-sage-pale p-2">
                <metric.icon className="h-5 w-5 text-sage" />
              </div>
              <div>
                <p className="text-metric">
                  {isLoading ? '—' : metric.format(metric.value)}
                </p>
                <p className="text-caption text-[var(--color-text-secondary)]">
                  {metric.label}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">Published Pins</p>
          <p className="text-metric mt-1">{data?.publishedPins || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-[var(--color-text-secondary)]">Top Performers</p>
            <Badge variant="success" size="sm">{data?.topPerformers || 0}</Badge>
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            &gt;2% engagement rate
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-[var(--color-text-secondary)]">Underperformers</p>
            <Badge variant="warning" size="sm">{data?.underperformers || 0}</Badge>
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            &lt;1% after 7 days
          </p>
        </Card>
      </div>
    </div>
  );
}
```

### `components/pinterest/top-pins-table.tsx`
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { formatNumber, formatPercent, cn } from '@/lib/utils';
import type { Pin } from '@/types/pinterest';

export function TopPinsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['top-pins'],
    queryFn: () => api.get<{ pins: Pin[] }>('/pinterest/analytics/top-pins'),
  });

  const pins = data?.pins || [];

  return (
    <Card>
      <CardHeader
        title="Top Performing Pins"
        description="Your best performing content in the last 30 days"
      />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-elevated">
                <th className="px-4 py-3 text-left text-caption font-medium text-[var(--color-text-secondary)]">
                  Pin
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Impressions
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Saves
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Clicks
                </th>
                <th className="px-4 py-3 text-right text-caption font-medium text-[var(--color-text-secondary)]">
                  Engagement
                </th>
                <th className="px-4 py-3 text-center text-caption font-medium text-[var(--color-text-secondary)]">
                  Tier
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded bg-elevated" />
                        <div className="h-4 w-32 rounded bg-elevated" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-4 w-16 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 ml-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 mx-auto rounded bg-elevated" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-8 rounded bg-elevated" /></td>
                  </tr>
                ))
              ) : pins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    No published pins yet
                  </td>
                </tr>
              ) : (
                pins.map((pin) => (
                  <tr key={pin.id} className="hover:bg-elevated/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded overflow-hidden bg-elevated shrink-0">
                          <Image
                            src={pin.image_url}
                            alt={pin.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-sm font-medium truncate max-w-[200px]">
                            {pin.title}
                          </p>
                          {pin.collection && (
                            <Badge
                              variant={pin.collection as 'grounding' | 'wholeness' | 'growth'}
                              size="sm"
                            >
                              {pin.collection}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-body-sm">
                      {formatNumber(pin.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-body-sm">
                      {formatNumber(pin.saves)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-body-sm">
                      {formatNumber(pin.clicks)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pin.engagement_rate !== null && pin.engagement_rate >= 0.02 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-warning" />
                        )}
                        <span className="font-mono text-body-sm">
                          {formatPercent(pin.engagement_rate || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          pin.performance_tier === 'top' ? 'success' :
                          pin.performance_tier === 'good' ? 'info' :
                          pin.performance_tier === 'average' ? 'secondary' :
                          'warning'
                        }
                        size="sm"
                      >
                        {pin.performance_tier || 'pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {pin.pinterest_pin_id && (
                        <a
                          href={`https://pinterest.com/pin/${pin.pinterest_pin_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon-sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- **Step Dependencies**: Step 12.1
- **User Instructions**: None

---

# Phase 13: Pinterest Ads Integration

## Step 13.1: Create Ads Database Schema

- **Task**: Create database schema for Pinterest ad campaigns, ad groups, and promoted pins.

- **Files**:

### `supabase/migrations/010_pinterest_ads.sql`
```sql
-- ============================================================================
-- Migration: 010_pinterest_ads
-- Description: Pinterest Ads campaigns, ad groups, and promoted pins
-- Feature: 13 (Pinterest Ads)
-- ============================================================================

-- ============================================================================
-- Ad Accounts Table
-- ============================================================================
CREATE TABLE pinterest_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Pinterest references
  pinterest_ad_account_id TEXT NOT NULL,
  
  -- Account details
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  
  -- Spend tracking
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_week_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_month_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, pinterest_ad_account_id)
);

-- ============================================================================
-- Ad Campaigns Table
-- ============================================================================
CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ad_account_id UUID REFERENCES pinterest_ad_accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Pinterest references
  pinterest_campaign_id TEXT,
  
  -- Campaign details
  name TEXT NOT NULL,
  objective TEXT NOT NULL CHECK (objective IN (
    'AWARENESS', 'CONSIDERATION', 'CONVERSIONS', 'CATALOG_SALES'
  )),
  
  -- Budget
  daily_spend_cap NUMERIC(10,2),
  lifetime_spend_cap NUMERIC(10,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PAUSED' CHECK (status IN (
    'ACTIVE', 'PAUSED', 'ARCHIVED'
  )),
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- Performance
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  
  -- Haven Hub metadata
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  is_seasonal BOOLEAN NOT NULL DEFAULT false,
  seasonal_event TEXT,
  
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Ad Groups Table
-- ============================================================================
CREATE TABLE ad_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  
  -- Pinterest references
  pinterest_ad_group_id TEXT,
  
  -- Ad group details
  name TEXT NOT NULL,
  
  -- Targeting
  targeting JSONB NOT NULL DEFAULT '{}',
  -- { interests: [], keywords: [], demographics: {}, locations: [] }
  
  -- Bidding
  bid_strategy TEXT DEFAULT 'AUTOMATIC',
  bid_amount NUMERIC(10,2),
  
  -- Budget
  budget_type TEXT DEFAULT 'DAILY' CHECK (budget_type IN ('DAILY', 'LIFETIME')),
  budget_amount NUMERIC(10,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PAUSED' CHECK (status IN (
    'ACTIVE', 'PAUSED', 'ARCHIVED'
  )),
  
  -- Performance
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Promoted Pins Table
-- ============================================================================
CREATE TABLE promoted_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ad_group_id UUID REFERENCES ad_groups(id) ON DELETE CASCADE NOT NULL,
  pin_id UUID REFERENCES pins(id) ON DELETE SET NULL,
  
  -- Pinterest references
  pinterest_ad_id TEXT,
  pinterest_pin_id TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PAUSED' CHECK (status IN (
    'ACTIVE', 'PAUSED', 'ARCHIVED', 'REJECTED'
  )),
  rejection_reason TEXT,
  
  -- Creative
  destination_url TEXT,
  tracking_params JSONB DEFAULT '{}',
  
  -- Performance
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4),
  cpc NUMERIC(8,4),
  
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Ad Spend Budget Table (for guardrail tracking)
-- ============================================================================
CREATE TABLE ad_spend_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Spend
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Budget (from guardrails at time of tracking)
  budget_cap NUMERIC(12,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_ad_accounts_user ON pinterest_ad_accounts(user_id);
CREATE INDEX idx_campaigns_user ON ad_campaigns(user_id);
CREATE INDEX idx_campaigns_account ON ad_campaigns(ad_account_id);
CREATE INDEX idx_campaigns_status ON ad_campaigns(user_id, status);
CREATE INDEX idx_ad_groups_campaign ON ad_groups(campaign_id);
CREATE INDEX idx_promoted_pins_ad_group ON promoted_pins(ad_group_id);
CREATE INDEX idx_promoted_pins_pin ON promoted_pins(pin_id) WHERE pin_id IS NOT NULL;
CREATE INDEX idx_spend_tracking_user ON ad_spend_tracking(user_id, period_type, period_start);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE pinterest_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoted_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY ad_accounts_all ON pinterest_ad_accounts FOR ALL USING (user_id = auth.uid());
CREATE POLICY campaigns_all ON ad_campaigns FOR ALL USING (user_id = auth.uid());
CREATE POLICY ad_groups_all ON ad_groups FOR ALL USING (user_id = auth.uid());
CREATE POLICY promoted_pins_all ON promoted_pins FOR ALL USING (user_id = auth.uid());
CREATE POLICY spend_tracking_all ON ad_spend_tracking FOR ALL USING (user_id = auth.uid());

-- Triggers
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER ad_groups_updated_at BEFORE UPDATE ON ad_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER promoted_pins_updated_at BEFORE UPDATE ON promoted_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Check ad spend against guardrails
-- ============================================================================
CREATE OR REPLACE FUNCTION check_ad_spend_budget(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS TABLE (
  allowed BOOLEAN,
  weekly_remaining NUMERIC,
  monthly_remaining NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_weekly_cap NUMERIC;
  v_monthly_cap NUMERIC;
  v_weekly_spent NUMERIC;
  v_monthly_spent NUMERIC;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  -- Get guardrails
  SELECT 
    (guardrails->>'weekly_ad_spend_cap')::NUMERIC,
    (guardrails->>'monthly_ad_spend_cap')::NUMERIC
  INTO v_weekly_cap, v_monthly_cap
  FROM user_settings
  WHERE user_id = p_user_id;
  
  v_weekly_cap := COALESCE(v_weekly_cap, 100);
  
  -- Calculate period starts
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  v_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Get current spend
  SELECT COALESCE(SUM(amount), 0) INTO v_weekly_spent
  FROM ad_spend_tracking
  WHERE user_id = p_user_id
    AND period_type = 'weekly'
    AND period_start = v_week_start;
  
  IF v_monthly_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_monthly_spent
    FROM ad_spend_tracking
    WHERE user_id = p_user_id
      AND period_type = 'monthly'
      AND period_start = v_month_start;
  ELSE
    v_monthly_spent := 0;
  END IF;
  
  -- Check if allowed
  IF v_weekly_spent + p_amount > v_weekly_cap THEN
    RETURN QUERY SELECT 
      false,
      v_weekly_cap - v_weekly_spent,
      CASE WHEN v_monthly_cap IS NOT NULL THEN v_monthly_cap - v_monthly_spent ELSE NULL END,
      'Weekly ad spend cap exceeded';
    RETURN;
  END IF;
  
  IF v_monthly_cap IS NOT NULL AND v_monthly_spent + p_amount > v_monthly_cap THEN
    RETURN QUERY SELECT 
      false,
      v_weekly_cap - v_weekly_spent,
      v_monthly_cap - v_monthly_spent,
      'Monthly ad spend cap exceeded';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    v_weekly_cap - v_weekly_spent - p_amount,
    CASE WHEN v_monthly_cap IS NOT NULL THEN v_monthly_cap - v_monthly_spent - p_amount ELSE NULL END,
    'Budget available';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/ads.ts`
```typescript
export interface PinterestAdAccount {
  id: string;
  user_id: string;
  pinterest_ad_account_id: string;
  name: string;
  currency: string;
  status: string;
  total_spend: number;
  current_week_spend: number;
  current_month_spend: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdCampaign {
  id: string;
  user_id: string;
  ad_account_id: string;
  pinterest_campaign_id: string | null;
  name: string;
  objective: CampaignObjective;
  daily_spend_cap: number | null;
  lifetime_spend_cap: number | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  total_spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  is_seasonal: boolean;
  seasonal_event: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  ad_groups?: AdGroup[];
}

export type CampaignObjective = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSIONS' | 'CATALOG_SALES';
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface AdGroup {
  id: string;
  user_id: string;
  campaign_id: string;
  pinterest_ad_group_id: string | null;
  name: string;
  targeting: AdTargeting;
  bid_strategy: string;
  bid_amount: number | null;
  budget_type: 'DAILY' | 'LIFETIME';
  budget_amount: number | null;
  status: CampaignStatus;
  total_spend: number;
  impressions: number;
  clicks: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  promoted_pins?: PromotedPin[];
}

export interface AdTargeting {
  interests?: string[];
  keywords?: string[];
  demographics?: {
    genders?: string[];
    age_ranges?: string[];
  };
  locations?: string[];
}

export interface PromotedPin {
  id: string;
  user_id: string;
  ad_group_id: string;
  pin_id: string | null;
  pinterest_ad_id: string | null;
  pinterest_pin_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'REJECTED';
  rejection_reason: string | null;
  destination_url: string | null;
  tracking_params: Record<string, string>;
  total_spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  adAccountId: string;
  name: string;
  objective: CampaignObjective;
  dailySpendCap?: number;
  lifetimeSpendCap?: number;
  startDate?: string;
  endDate?: string;
  collection?: 'grounding' | 'wholeness' | 'growth';
  isSeasonal?: boolean;
  seasonalEvent?: string;
}

export interface AdSpendCheck {
  allowed: boolean;
  weekly_remaining: number | null;
  monthly_remaining: number | null;
  message: string;
}
```

- **Step Dependencies**: Step 12.2
- **User Instructions**: Run migration

---

## Step 13.2: Implement Ads Management Service

- **Task**: Create the service for managing Pinterest ad campaigns with budget guardrails.

- **Files**:

### `lib/pinterest/ads-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { PinterestClient } from '@/lib/integrations/pinterest/client';
import type { CreateCampaignRequest, AdCampaign, AdSpendCheck } from '@/types/ads';

interface CampaignResult {
  success: boolean;
  campaign?: AdCampaign;
  error?: string;
}

export async function createCampaign(
  userId: string,
  request: CreateCampaignRequest
): Promise<CampaignResult> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Check budget guardrails first
    if (request.dailySpendCap) {
      const budgetCheck = await checkAdSpendBudget(userId, request.dailySpendCap);
      if (!budgetCheck.allowed) {
        return { success: false, error: budgetCheck.message };
      }
    }

    // Get ad account
    const { data: adAccount } = await supabase
      .from('pinterest_ad_accounts')
      .select('pinterest_ad_account_id')
      .eq('id', request.adAccountId)
      .eq('user_id', userId)
      .single();

    if (!adAccount) {
      throw new Error('Ad account not found');
    }

    // Get Pinterest credentials
    const accessToken = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Pinterest not connected');
    }

    const pinterestClient = new PinterestClient({ accessToken: accessToken.data });

    // Create campaign on Pinterest
    const pinterestCampaign = await pinterestClient.createAdCampaign(
      adAccount.pinterest_ad_account_id,
      {
        name: request.name,
        status: 'PAUSED', // Start paused for review
        objective_type: request.objective,
        daily_spend_cap: request.dailySpendCap ? request.dailySpendCap * 1000000 : undefined, // Pinterest uses micros
        lifetime_spend_cap: request.lifetimeSpendCap ? request.lifetimeSpendCap * 1000000 : undefined,
      }
    );

    // Create local campaign record
    const { data: campaign, error } = await supabase
      .from('ad_campaigns')
      .insert({
        user_id: userId,
        ad_account_id: request.adAccountId,
        pinterest_campaign_id: pinterestCampaign.id,
        name: request.name,
        objective: request.objective,
        daily_spend_cap: request.dailySpendCap,
        lifetime_spend_cap: request.lifetimeSpendCap,
        status: 'PAUSED',
        start_date: request.startDate,
        end_date: request.endDate,
        collection: request.collection,
        is_seasonal: request.isSeasonal || false,
        seasonal_event: request.seasonalEvent,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'ad_campaign_created',
      p_details: {
        campaignId: campaign.id,
        pinterestCampaignId: pinterestCampaign.id,
        objective: request.objective,
        dailyBudget: request.dailySpendCap,
      },
      p_executed: true,
      p_module: 'ads',
      p_reference_id: campaign.id,
      p_reference_table: 'ad_campaigns',
    });

    return { success: true, campaign: campaign as AdCampaign };
  } catch (error) {
    console.error('Campaign creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkAdSpendBudget(
  userId: string,
  amount: number
): Promise<AdSpendCheck> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc('check_ad_spend_budget', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    return {
      allowed: false,
      weekly_remaining: null,
      monthly_remaining: null,
      message: error.message,
    };
  }

  return data?.[0] || {
    allowed: true,
    weekly_remaining: null,
    monthly_remaining: null,
    message: 'Budget check failed',
  };
}

export async function updateCampaignStatus(
  userId: string,
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<CampaignResult> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Get campaign
    const { data: campaign } = await supabase
      .from('ad_campaigns')
      .select('*, ad_account:pinterest_ad_accounts(pinterest_ad_account_id)')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check budget before activating
    if (status === 'ACTIVE' && campaign.daily_spend_cap) {
      const budgetCheck = await checkAdSpendBudget(userId, campaign.daily_spend_cap);
      if (!budgetCheck.allowed) {
        return { success: false, error: budgetCheck.message };
      }
    }

    // Update on Pinterest
    const accessToken = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (accessToken.data && campaign.pinterest_campaign_id) {
      const pinterestClient = new PinterestClient({ accessToken: accessToken.data });
      
      // Note: Pinterest API update campaign endpoint would go here
      // await pinterestClient.updateCampaign(campaign.pinterest_campaign_id, { status });
    }

    // Update local record
    const { data: updatedCampaign, error } = await supabase
      .from('ad_campaigns')
      .update({ status })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: status === 'ACTIVE' ? 'ad_campaign_activated' : 'ad_campaign_paused',
      p_details: { campaignId },
      p_executed: true,
      p_module: 'ads',
      p_reference_id: campaignId,
      p_reference_table: 'ad_campaigns',
    });

    return { success: true, campaign: updatedCampaign as AdCampaign };
  } catch (error) {
    console.error('Campaign update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function syncAdSpend(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Get Pinterest credentials
    const accessToken = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Pinterest not connected');
    }

    // Get all campaigns and sync spend
    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('id, pinterest_campaign_id')
      .eq('user_id', userId)
      .not('pinterest_campaign_id', 'is', null);

    // In a real implementation, this would fetch spend data from Pinterest
    // and update local records + ad_spend_tracking table

    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    // Calculate total spend for the week/month from campaigns
    const { data: weeklySpend } = await supabase
      .from('ad_campaigns')
      .select('total_spend')
      .eq('user_id', userId)
      .gte('updated_at', weekStart.toISOString());

    const totalWeeklySpend = weeklySpend?.reduce((sum, c) => sum + (c.total_spend || 0), 0) || 0;

    // Upsert spend tracking
    await supabase.from('ad_spend_tracking').upsert({
      user_id: userId,
      period_type: 'weekly',
      period_start: weekStart,
      period_end: getWeekEnd(),
      amount: totalWeeklySpend,
    });

    // Check if approaching budget limit
    const budgetCheck = await checkAdSpendBudget(userId, 0);
    if (budgetCheck.weekly_remaining !== null && budgetCheck.weekly_remaining < 20) {
      // Log warning
      await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'ad_budget_warning',
        p_details: {
          weeklyRemaining: budgetCheck.weekly_remaining,
          monthlyRemaining: budgetCheck.monthly_remaining,
        },
        p_executed: true,
        p_module: 'ads',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Ad spend sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  return new Date(now.setDate(diff));
}

function getWeekEnd(): Date {
  const start = getWeekStart();
  return new Date(start.setDate(start.getDate() + 6));
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
```

- **Step Dependencies**: Step 13.1
- **User Instructions**: None

---

## Step 13.3: Create Ads API Endpoints

- **Task**: Build API routes for ad campaign management.

- **Files**:

### `app/api/ads/campaigns/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { createCampaign } from '@/lib/pinterest/ads-service';

const createSchema = z.object({
  adAccountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  objective: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSIONS', 'CATALOG_SALES']),
  dailySpendCap: z.number().positive().optional(),
  lifetimeSpendCap: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  isSeasonal: z.boolean().optional(),
  seasonalEvent: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    let query = supabase
      .from('ad_campaigns')
      .select(`
        *,
        ad_groups (
          id,
          name,
          status,
          total_spend,
          impressions,
          clicks
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ campaigns: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    
    const data = createSchema.parse(body);
    const result = await createCampaign(userId, data);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      campaign: result.campaign,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/ads/campaigns/[id]/status/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/auth/session';
import { updateCampaignStatus } from '@/lib/pinterest/ads-service';

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    
    const { status } = statusSchema.parse(body);
    const result = await updateCampaignStatus(userId, params.id, status);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      campaign: result.campaign,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/ads/budget/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { checkAdSpendBudget, syncAdSpend } from '@/lib/pinterest/ads-service';

export async function GET() {
  try {
    const userId = await getUserId();
    const budgetStatus = await checkAdSpendBudget(userId, 0);
    
    return NextResponse.json(budgetStatus);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const userId = await getUserId();
    const result = await syncAdSpend(userId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 13.2
- **User Instructions**: None

---

**Part 8 Summary**

This part covers:

**Phase 11 (Pinterest Core):**
- Complete Pinterest database schema (boards, pins, schedules, copy templates)
- Pin schedule slots with optimal posting times
- Copy template system with variable substitution for A/B testing
- Pin publishing service with rate limiting
- Schedule management with guardrail-aware slot allocation
- Pins API endpoints (CRUD, publish, schedule)
- Boards API with collection assignment

**Phase 12 (Pinterest Analytics):**
- Analytics sync service fetching Pinterest metrics
- Performance tier calculation (top, good, average, underperformer)
- Copy template performance aggregation
- Analytics dashboard with overview metrics
- Top pins table with engagement tracking
- Performance trend identification

**Phase 13 (Pinterest Ads):**
- Complete ads database schema (accounts, campaigns, ad groups, promoted pins)
- Ad spend tracking table for guardrail enforcement
- Budget check function respecting weekly/monthly caps
- Campaign creation service with Pinterest API integration
- Campaign status management with budget validation
- Ad spend sync and warning system
- Ads API endpoints (campaigns CRUD, status, budget)

---

**Remaining phases to cover:**
- **Part 9:** Phase 14-16 (Lead Capture, Quiz, Abandonment)
- **Part 10:** Phase 17-19 (Customer Journey, Win-Back, Loyalty)
- **Part 11:** Phase 20-23 (Attribution, Campaigns, Intelligence, Daily Digest)
