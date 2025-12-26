# V1 Feature Parity Implementation Plan

This document outlines the implementation plan for features that are missing or partially implemented compared to the V1 Pinterest Automation Suite.

---

## Implementation Status

**Last Updated:** 2025-12-26

| Feature | Status | Notes |
|---------|--------|-------|
| Pinterest Conversion API | ✅ Complete | Server-side events with batch processing |
| Enhanced Performance Alerts | ✅ Complete | Event-based threshold alerts |
| Complete Seasonal Rotation | ✅ Complete | 16 seasonal periods, respects auto/assisted mode |
| Klaviyo Setup Wizard | ✅ Complete | Step-by-step setup with test events |
| Klaviyo Dashboard | ✅ Complete | Email overview, flows, metrics display |
| Audience Segment Export | ✅ Complete | Pinterest custom audiences with hash export |
| 16-Week KPI Dashboard | ✅ Complete | Scaling playbook with 4 phases, weekly tracking |
| Enhanced Copy Templates | ✅ Complete | Collection hooks, mood descriptors, room contexts |
| Bulk Pin Scheduling | ✅ Complete | Immediate, optimal, spread strategies |
| Copy-to-Ads UTM Export | ✅ Complete | Pinterest Ads CSV export with UTM tagging |
| Weekly Rhythm System | ✅ Complete | Daily task tracking, weekly progress view |
| Klaviyo List/Tag Management | ✅ Complete | Create/view lists and tags from Haven Hub |
| Klaviyo Event Debugging | ✅ Complete | Test events, verify flow triggers |
| Klaviyo Revenue Attribution | ✅ Complete | Email revenue tracking and flow performance |

---

## Overview

**All V1 Feature Parity items have been implemented!**

| Category | Count | Status |
|----------|-------|--------|
| Pinterest Features | 6 | ✅ All Complete |
| Klaviyo Features | 5 | ✅ All Complete |
| Workflow Features | 3 | ✅ All Complete |
| **Total** | **14** | **✅ Complete** |

---

## Part 1: Missing Features

### 1.1 Pinterest Conversion API (Server-Side Events)

**Status:** ✅ IMPLEMENTED (2025-12-26)

**V1 Reference:** Prompt 12 - Pinterest Conversion API
**Priority:** High (improves attribution accuracy)
**Estimated Effort:** 12 hours

**Implemented Files:**
- `supabase/migrations/20251226120001_pinterest_conversions.sql`
- `src/lib/integrations/pinterest/conversion-api.ts`
- `src/app/api/cron/pinterest-conversions/route.ts`

#### Description
Server-side event forwarding to Pinterest for better attribution when cookies are blocked. Tracks leads, purchases, add-to-cart events with deduplication.

#### Implementation

**Database Migration:** `supabase/migrations/025_pinterest_conversions.sql`
```sql
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

CREATE INDEX idx_pinterest_events_pending ON pinterest_conversion_events(user_id, sent_to_pinterest)
  WHERE sent_to_pinterest = false;
```

**Files to Create:**

1. `src/lib/integrations/pinterest/conversion-api.ts`
```typescript
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';

interface ConversionEvent {
  eventName: string;
  eventId: string;
  eventTime?: Date;
  email?: string;
  phone?: string;
  clickId?: string;
  externalId?: string;
  currency?: string;
  value?: number;
  contentIds?: string[];
  contentName?: string;
  contentCategory?: string;
  numItems?: number;
  orderId?: string;
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export async function trackConversionEvent(
  userId: string,
  event: ConversionEvent
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // Store event for batch processing
  const { error } = await (supabase as any)
    .from('pinterest_conversion_events')
    .insert({
      user_id: userId,
      event_name: event.eventName,
      event_id: event.eventId || `${event.eventName}_${Date.now()}`,
      event_time: event.eventTime || new Date(),
      email_hash: event.email ? hashValue(event.email) : null,
      phone_hash: event.phone ? hashValue(event.phone) : null,
      click_id: event.clickId,
      external_id: event.externalId ? hashValue(event.externalId) : null,
      currency: event.currency || 'USD',
      value: event.value,
      content_ids: event.contentIds,
      content_name: event.contentName,
      content_category: event.contentCategory,
      num_items: event.numItems,
      order_id: event.orderId,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function sendEventsToPinterest(userId: string): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getAdminClient();

  // Get Pinterest access token
  const { data: integration } = await (supabase as any)
    .from('integrations')
    .select('access_token_encrypted, metadata')
    .eq('user_id', userId)
    .eq('provider', 'pinterest')
    .eq('status', 'connected')
    .single();

  if (!integration) {
    return { sent: 0, failed: 0, errors: ['Pinterest not connected'] };
  }

  const adAccountId = integration.metadata?.ad_account_id;
  if (!adAccountId) {
    return { sent: 0, failed: 0, errors: ['No ad account connected'] };
  }

  // Get pending events
  const { data: events } = await (supabase as any)
    .from('pinterest_conversion_events')
    .select('*')
    .eq('user_id', userId)
    .eq('sent_to_pinterest', false)
    .limit(1000);

  if (!events || events.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  // Format for Pinterest API
  const pinterestEvents = events.map((e: any) => ({
    event_name: e.event_name.toUpperCase(),
    action_source: e.action_source,
    event_time: Math.floor(new Date(e.event_time).getTime() / 1000),
    event_id: e.event_id,
    user_data: {
      em: e.email_hash ? [e.email_hash] : undefined,
      ph: e.phone_hash ? [e.phone_hash] : undefined,
      click_id: e.click_id,
      external_id: e.external_id ? [e.external_id] : undefined,
    },
    custom_data: {
      currency: e.currency,
      value: e.value?.toString(),
      content_ids: e.content_ids,
      content_name: e.content_name,
      content_category: e.content_category,
      num_items: e.num_items,
      order_id: e.order_id,
    },
    partner_name: 'haven_hub',
  }));

  // Send to Pinterest Conversion API
  // TODO: Decrypt access token
  const accessToken = integration.access_token_encrypted;

  const response = await fetch(
    `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: pinterestEvents }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { sent: 0, failed: events.length, errors: [error.message || 'API error'] };
  }

  // Mark as sent
  const eventIds = events.map((e: any) => e.id);
  await (supabase as any)
    .from('pinterest_conversion_events')
    .update({
      sent_to_pinterest: true,
      sent_at: new Date().toISOString(),
    })
    .in('id', eventIds);

  return { sent: events.length, failed: 0, errors: [] };
}
```

2. `src/app/api/cron/pinterest-conversions/route.ts` - Batch send events every 5 minutes

3. Integration points:
   - `src/app/api/webhooks/shopify/route.ts` - Track purchases
   - `src/lib/leads/lead-service.ts` - Track leads
   - `src/lib/quiz/quiz-service.ts` - Track quiz completions

---

### 1.2 Audience Segment Export (Pinterest Custom Audiences)

**Status:** ✅ IMPLEMENTED (2025-12-26)

**V1 Reference:** Prompt 16 - Audience Segment Export
**Priority:** Medium (enables retargeting)
**Estimated Effort:** 10 hours

**Implemented Files:**
- `supabase/migrations/20251226130001_audience_exports.sql`
- `src/app/(dashboard)/dashboard/pinterest/audiences/page.tsx`
- `src/app/api/pinterest/audiences/route.ts`
- `src/app/api/pinterest/audiences/[id]/route.ts`
- `src/app/api/pinterest/audiences/[id]/sync/route.ts`

#### Description
Export customer segments as SHA-256 hashed emails for Pinterest Custom Audiences, enabling retargeting campaigns.

#### Implementation

**Database Migration:** `supabase/migrations/026_audience_exports.sql`
```sql
-- Audience export jobs
CREATE TABLE audience_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Segment info
  segment_id UUID REFERENCES customer_segments(id) ON DELETE SET NULL,
  segment_name TEXT NOT NULL,
  segment_criteria JSONB NOT NULL,

  -- Pinterest audience
  pinterest_audience_id TEXT,
  pinterest_audience_name TEXT,

  -- Export details
  total_profiles INTEGER NOT NULL DEFAULT 0,
  matched_profiles INTEGER, -- Returned by Pinterest

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
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
```

**Files to Create:**

1. `src/lib/pinterest/audience-export.ts`
2. `src/app/api/pinterest/audiences/route.ts`
3. `src/app/api/pinterest/audiences/[id]/sync/route.ts`
4. `src/app/(dashboard)/dashboard/pinterest/audiences/page.tsx`

---

### 1.3 16-Week KPI Dashboard (Scaling Playbook Tracker)

**Status:** ✅ IMPLEMENTED (2025-12-26)

**V1 Reference:** Prompt 17 - 16-Week KPI Dashboard
**Priority:** Medium (strategic planning)
**Estimated Effort:** 12 hours

**Implemented Files:**
- `supabase/migrations/20251226130002_scaling_playbook.sql`
- `src/app/(dashboard)/dashboard/analytics/scaling-playbook/page.tsx`
- `src/app/api/scaling-playbook/route.ts`
- `src/app/api/scaling-playbook/start/route.ts`
- `src/app/api/scaling-playbook/advance-week/route.ts`

#### Description
Track progress against Pinterest Scaling Playbook targets across 4 phases: Foundation (weeks 1-4), Growth (5-8), Optimization (9-12), Scale (13-16).

#### Implementation

**Database Migration:** `supabase/migrations/027_scaling_playbook.sql`
```sql
-- Scaling playbook progress
CREATE TABLE scaling_playbook_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current phase
  current_phase INTEGER NOT NULL DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 4),
  phase_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Phase targets (configurable per user)
  phase_targets JSONB NOT NULL DEFAULT '{
    "phase_1": {
      "pins_per_week": 15,
      "boards_to_create": 5,
      "products_to_mockup": 20,
      "target_impressions": 10000
    },
    "phase_2": {
      "pins_per_week": 25,
      "ad_budget_daily": 10,
      "target_traffic": 500,
      "conversion_rate": 0.02
    },
    "phase_3": {
      "pins_per_week": 35,
      "ad_budget_daily": 25,
      "target_roas": 2.0,
      "winner_refresh_count": 10
    },
    "phase_4": {
      "pins_per_week": 50,
      "ad_budget_daily": 50,
      "target_revenue": 5000,
      "automation_level": 0.8
    }
  }',

  -- Weekly snapshots
  weekly_snapshots JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Weekly KPI snapshots
CREATE TABLE scaling_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  week_number INTEGER NOT NULL,
  phase INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,

  -- Metrics
  pins_published INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,

  ad_spend NUMERIC(10,2) DEFAULT 0,
  ad_revenue NUMERIC(10,2) DEFAULT 0,
  ad_roas NUMERIC(5,2),

  organic_traffic INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC(10,2) DEFAULT 0,

  -- Goal achievement
  goals_met JSONB NOT NULL DEFAULT '{}',
  overall_score NUMERIC(5,2), -- 0-100

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, week_number)
);
```

**Files to Create:**

1. `src/lib/scaling-playbook/playbook-service.ts`
2. `src/app/api/scaling-playbook/route.ts`
3. `src/app/api/cron/scaling-snapshot/route.ts` - Weekly snapshot
4. `src/app/(dashboard)/dashboard/analytics/scaling-playbook/page.tsx`

---

### 1.4 Weekly Rhythm System

**Status:** ✅ IMPLEMENTED (2025-12-26)

**V1 Reference:** Prompt 19 - Weekly Rhythm System
**Priority:** Low (nice-to-have)
**Estimated Effort:** 8 hours

**Implemented Files:**
- `supabase/migrations/20251226140002_weekly_rhythm.sql`
- `src/lib/rhythm/rhythm-service.ts`
- `src/app/api/rhythm/route.ts`
- `src/app/api/rhythm/[taskId]/route.ts`
- `src/app/(dashboard)/dashboard/rhythm/page.tsx`

#### Description
Daily task reminders and weekly workflow management. Creates a consistent workflow rhythm with checkboxes for daily Pinterest activities.

#### Implementation

**Database Migration:** `supabase/migrations/028_weekly_rhythm.sql`
```sql
-- Weekly rhythm tasks
CREATE TABLE rhythm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Task definition
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  task_name TEXT NOT NULL,
  task_description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'content', 'engagement', 'analytics', 'ads', 'maintenance'
  )),

  -- Recurrence
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT DEFAULT 'weekly',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task completions
CREATE TABLE rhythm_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES rhythm_tasks(id) ON DELETE CASCADE,

  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  UNIQUE(task_id, completed_date)
);

-- Default rhythm template
INSERT INTO rhythm_tasks (user_id, day_of_week, task_name, task_description, category)
SELECT
  u.id,
  t.day_of_week,
  t.task_name,
  t.task_description,
  t.category
FROM auth.users u
CROSS JOIN (VALUES
  (1, 'Review weekend performance', 'Check analytics from Saturday/Sunday pins', 'analytics'),
  (1, 'Schedule week''s pins', 'Queue 5-7 pins for the week', 'content'),
  (2, 'Engage with saves', 'Reply to comments, check who saved your pins', 'engagement'),
  (3, 'Midweek analytics check', 'Review CTR, saves, impressions', 'analytics'),
  (3, 'Refresh underperformers', 'Update copy on low-performing pins', 'content'),
  (4, 'Ad performance review', 'Check ROAS, adjust budgets', 'ads'),
  (5, 'Create weekend content', 'Prepare pins for weekend posting', 'content'),
  (5, 'Weekly report', 'Export weekly performance summary', 'analytics')
) AS t(day_of_week, task_name, task_description, category);
```

**Files to Create:**

1. `src/lib/rhythm/rhythm-service.ts`
2. `src/app/api/rhythm/route.ts`
3. `src/app/api/rhythm/[taskId]/complete/route.ts`
4. `src/app/(dashboard)/dashboard/rhythm/page.tsx`
5. `src/components/rhythm/daily-checklist.tsx`
6. `src/app/api/cron/rhythm-reminder/route.ts` - Daily email reminder

---

## Part 2: Partial Features

### 2.1 Complete Seasonal Content Rotation

**Status:** ✅ IMPLEMENTED (2025-12-26)

**Current State:** Stub cron that identifies seasons but doesn't activate/deactivate content
**V1 Reference:** Prompt 14 - Seasonal Content Rotation
**Estimated Effort:** 6 hours

**Implemented Files:**
- `src/lib/seasonal/seasonal-service.ts`
- `src/app/api/cron/seasonal-activation/route.ts` (updated)

#### Implementation

Update `src/app/api/cron/seasonal-activation/route.ts`:

```typescript
// Add actual activation/deactivation logic
export const GET = cronHandler(async () => {
  const supabase = getAdminClient();
  const today = new Date();

  // Get all users
  const { data: users } = await (supabase as any)
    .from('user_settings')
    .select('user_id, global_mode');

  for (const user of users || []) {
    // 1. Activate pins with matching temporal_tags
    // 2. Deactivate pins outside their season
    // 3. Activate/pause campaigns based on date ranges
    // 4. Create approval items for assisted mode
  }
});
```

**Files to Update:**
- `src/app/api/cron/seasonal-activation/route.ts`

**Files to Create:**
- `src/lib/seasonal/seasonal-service.ts`

---

### 2.2 Enhanced Performance Alerts (Event-Based)

**Status:** ✅ IMPLEMENTED (2025-12-26)

**Current State:** Daily digest emails only, no event-based threshold alerts
**V1 Reference:** Prompt 8 - Performance Alerts
**Estimated Effort:** 6 hours

**Implemented Files:**
- `supabase/migrations/20251226120002_performance_alerts.sql`
- `src/lib/alerts/alert-service.ts`
- `src/app/api/alerts/route.ts`
- `src/app/api/alerts/[id]/route.ts`
- `src/app/api/alerts/rules/route.ts`
- `src/app/api/cron/performance-alerts/route.ts`
- `src/app/(dashboard)/dashboard/settings/alerts/page.tsx`

#### Implementation

**Database Migration:** `supabase/migrations/029_performance_alerts.sql`
```sql
-- Performance alert rules
CREATE TABLE performance_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'pin_milestone', 'pin_underperformer', 'campaign_cpa',
    'campaign_roas', 'daily_spend', 'winner_detected'
  )),

  -- Conditions
  metric TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  threshold NUMERIC NOT NULL,

  -- Actions
  send_email BOOLEAN NOT NULL DEFAULT true,
  send_push BOOLEAN NOT NULL DEFAULT false,
  create_task BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert history
CREATE TABLE performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES performance_alert_rules(id) ON DELETE SET NULL,

  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Reference
  reference_id UUID,
  reference_table TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'dismissed')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Files to Create:**
- `src/lib/alerts/alert-service.ts`
- `src/app/api/alerts/rules/route.ts`
- `src/app/api/cron/performance-alerts/route.ts`
- `src/app/(dashboard)/dashboard/settings/alerts/page.tsx`

---

### 2.3 Enhanced Copy Templates (V1 Hooks/Moods/Contexts)

**Status:** ✅ IMPLEMENTED (2025-12-26)

**V1 Reference:** Prompt 4 - Auto-Generate Pin Copy
**Estimated Effort:** 8 hours

**Implemented Files:**
- `supabase/migrations/20251226140001_enhanced_copy_templates.sql`
- `src/lib/copy-engine/copy-generator.ts`
- `src/app/api/copy-templates/hooks/route.ts`
- `src/app/api/copy-templates/moods/route.ts`
- `src/app/api/copy-templates/rooms/route.ts`
- `src/app/api/copy-templates/generate/route.ts`
- `src/app/(dashboard)/dashboard/settings/copy-templates/page.tsx`

#### Description
V1 has richer template system with:
- Collection hooks (e.g., "Find your center with...")
- Mood descriptors (e.g., "calming", "inspiring")
- Room context (e.g., "Perfect for your home office")

#### Implementation

**Database Migration:** `supabase/migrations/030_enhanced_copy_templates.sql`
```sql
-- Collection hooks
CREATE TABLE copy_collection_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  collection TEXT NOT NULL,
  hook_type TEXT NOT NULL CHECK (hook_type IN ('opening', 'closing', 'cta')),
  hook_text TEXT NOT NULL,

  -- Performance
  times_used INTEGER NOT NULL DEFAULT 0,
  total_saves INTEGER NOT NULL DEFAULT 0,
  avg_engagement_rate NUMERIC(5,4),

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mood descriptors
CREATE TABLE copy_mood_descriptors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  mood TEXT NOT NULL,
  descriptors TEXT[] NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Room contexts
CREATE TABLE copy_room_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  room_type TEXT NOT NULL, -- office, bedroom, living_room, etc.
  context_phrases TEXT[] NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default hooks
INSERT INTO copy_collection_hooks (user_id, collection, hook_type, hook_text)
SELECT u.id, h.collection, h.hook_type, h.hook_text
FROM auth.users u
CROSS JOIN (VALUES
  ('grounding', 'opening', 'Find your center with'),
  ('grounding', 'opening', 'Stay grounded with'),
  ('grounding', 'closing', 'Let this reminder anchor your day'),
  ('wholeness', 'opening', 'Embrace your whole self with'),
  ('wholeness', 'opening', 'Celebrate completeness with'),
  ('wholeness', 'closing', 'You are already whole'),
  ('growth', 'opening', 'Grow into your potential with'),
  ('growth', 'opening', 'Nurture your journey with'),
  ('growth', 'closing', 'Every day is a chance to bloom')
) AS h(collection, hook_type, hook_text);
```

**Files to Update:**
- `src/lib/pinterest/pin-service.ts` - Enhanced `generatePinCopy()` function

**Files to Create:**
- `src/lib/copy-engine/copy-generator.ts`
- `src/app/api/copy-templates/hooks/route.ts`
- `src/app/(dashboard)/dashboard/settings/copy-templates/page.tsx`

---

### 2.4 Bulk Pin Creator with Scheduling Strategies

**Status:** ✅ IMPLEMENTED (2025-12-26)

**V1 Reference:** Prompt 5 - Bulk Pin Creator
**Estimated Effort:** 4 hours

**Implemented Files:**
- `src/lib/pinterest/pin-service.ts` (added scheduleBulkPins, getOptimalPostingTimes)
- `src/app/api/pins/bulk-schedule/route.ts`

#### Description
V1 has scheduling strategies:
- **Immediate**: Publish all now
- **Optimal**: Use best posting times
- **Spread**: Distribute evenly over time period

#### Implementation

**Files to Update:**
- `src/lib/pinterest/pin-service.ts`
- `src/app/api/pins/bulk/route.ts`

Add to `pin-service.ts`:
```typescript
type SchedulingStrategy = 'immediate' | 'optimal' | 'spread';

interface BulkPinOptions {
  strategy: SchedulingStrategy;
  spreadDays?: number; // For 'spread' strategy
  pinsPerDay?: number; // For 'spread' strategy
}

export async function getOptimalPostingTimes(userId: string): Promise<Date[]> {
  // Analyze past pin performance to find best times
  // Default: 8am, 12pm, 5pm, 8pm in user's timezone
}

export async function scheduleBulkPins(
  userId: string,
  pinIds: string[],
  options: BulkPinOptions
): Promise<void> {
  switch (options.strategy) {
    case 'immediate':
      // Set all to publish now
      break;
    case 'optimal':
      // Distribute across optimal times
      const times = await getOptimalPostingTimes(userId);
      // Assign pins to times
      break;
    case 'spread':
      // Spread evenly over spreadDays
      break;
  }
}
```

---

### 2.5 Copy-to-Ads Workflow (UTM Export)

**Status:** ✅ IMPLEMENTED (2025-12-26)

**V1 Reference:** Prompt 6 - Copy-to-Ads Workflow
**Estimated Effort:** 3 hours

**Implemented Files:**
- `src/lib/pinterest/ad-export.ts`
- `src/app/api/pinterest/ad-export/route.ts`

#### Description
Export approved assets with auto-generated UTM-tagged URLs for Pinterest Ads Manager import.

#### Implementation

**Files to Create:**
- `src/lib/pinterest/ad-export.ts`

```typescript
interface AdExportConfig {
  utmSource: string; // 'pinterest'
  utmMedium: string; // 'paid_social'
  utmCampaign: string; // Campaign name
  utmContent?: string; // Asset identifier
}

export function generateAdExport(
  assets: Asset[],
  config: AdExportConfig
): AdExportRow[] {
  return assets.map(asset => ({
    imageUrl: asset.file_url,
    title: asset.title,
    description: asset.description,
    destinationUrl: buildUtmUrl(asset.product_link, config),
    // Pinterest Ads CSV format fields
  }));
}

export function downloadAdsCsv(rows: AdExportRow[]): void {
  // Generate and download CSV in Pinterest Ads format
}
```

**Files to Update:**
- `src/app/(dashboard)/dashboard/approvals/page.tsx` - Add "Export for Ads" button

---

## Part 3: Klaviyo Automation

### Current Klaviyo Implementation

V2 currently supports:
- ✅ Profile sync (create/update)
- ✅ List management (get lists, add to lists)
- ✅ Tag management (create tags, tag profiles)
- ✅ Event tracking (quiz, purchase, abandonment)
- ✅ Segment reading (get segments)

### What's NOT Supported (and not in V1 either)

The V1 and V2 plans both treat Klaviyo as an external system where:
- **Flows/Workflows** are created in Klaviyo directly
- **Email templates** are designed in Klaviyo
- **Campaigns** are managed in Klaviyo

Haven Hub triggers events that start pre-configured flows but doesn't create/manage them.

### Potential Klaviyo Automation Additions

If you want full Klaviyo automation, these would be new features (not in V1):

#### 3.1 Klaviyo Flow Sync (Read-Only Dashboard)

**Estimated Effort:** 6 hours

Display Klaviyo flow performance in Haven Hub dashboard without managing them.

```typescript
// src/lib/integrations/klaviyo/client.ts - Add:
async getFlows(): Promise<KlaviyoFlow[]> {
  const response = await this.request('/flows/');
  return response.data;
}

async getFlowMessages(flowId: string): Promise<KlaviyoMessage[]> {
  // Get email templates in a flow
}

async getFlowMetrics(flowId: string): Promise<FlowMetrics> {
  // Get open rates, click rates, revenue attributed
}
```

#### 3.2 Klaviyo Template Preview

**Estimated Effort:** 4 hours

Preview email templates that will be sent from Haven Hub triggers.

#### 3.3 Klaviyo Segment Builder Integration

**Estimated Effort:** 10 hours

Create Klaviyo segments from Haven Hub customer segments.

```typescript
async createSegment(name: string, definition: SegmentDefinition): Promise<string> {
  // Klaviyo API doesn't support programmatic segment creation
  // Would need to use profile properties instead
}
```

**Note:** Klaviyo's API doesn't support creating segments programmatically. You can only:
- Add profiles to lists
- Tag profiles
- Set profile properties that can be used in Klaviyo's segment builder

---

## Implementation Priority

### Phase 1 (High Priority) - 2 weeks
1. Pinterest Conversion API (12h)
2. Enhanced Performance Alerts (6h)
3. Complete Seasonal Rotation (6h)

### Phase 2 (Medium Priority) - 2 weeks
4. Audience Segment Export (10h)
5. 16-Week KPI Dashboard (12h)
6. Enhanced Copy Templates (8h)

### Phase 3 (Lower Priority) - 1 week
7. Bulk Pin Scheduling Strategies (4h)
8. Copy-to-Ads UTM Export (3h)
9. Weekly Rhythm System (8h)

---

## Part 4: Klaviyo Integration & Setup

### 4.1 Required Klaviyo Setup (Manual in Klaviyo)

Before Haven Hub can trigger email automations, these flows need to be created in Klaviyo. This section documents what to set up.

#### Lists to Create

| List Name | Purpose | Haven Hub Trigger |
|-----------|---------|-------------------|
| `Haven Hub - All Leads` | Master list for all captured leads | On any lead capture |
| `Haven Hub - Quiz Takers` | People who completed the quiz | On quiz completion |
| `Haven Hub - Grounding` | Quiz result: Grounding collection | Quiz result = grounding |
| `Haven Hub - Wholeness` | Quiz result: Wholeness collection | Quiz result = wholeness |
| `Haven Hub - Growth` | Quiz result: Growth collection | Quiz result = growth |
| `Haven Hub - Customers` | People who made a purchase | On Shopify order |
| `Haven Hub - VIP` | High LTV customers ($100+) | On LTV threshold |

#### Flows to Create

**1. Welcome Flow** (Trigger: Added to "All Leads" list)
```
Email 1 (Immediate): Welcome + Lead Magnet Delivery
Email 2 (Day 2): Brand Story
Email 3 (Day 4): Best Sellers by Collection
Email 4 (Day 7): Social Proof + First Purchase Offer
```

**2. Quiz Result Flow** (Trigger: "Quiz Completed" event)
```
Email 1 (Immediate): Your Quiz Results + Collection Recommendations
Email 2 (Day 1): Deep Dive into Your Collection
Email 3 (Day 3): Styled Room Inspiration
Email 4 (Day 5): Limited Time Offer for Your Collection
```

**3. Cart Abandonment Flow** (Trigger: "Cart Abandoned" event)
```
Email 1 (1 hour): You left something behind
Email 2 (24 hours): Still thinking about it?
Email 3 (72 hours): Last chance + small discount
```

**4. Post-Purchase Flow** (Trigger: "Placed Order" event)
```
Email 1 (Immediate): Order Confirmation + What to Expect
Email 2 (Day 3): Care Instructions
Email 3 (Day 7): Request Review
Email 4 (Day 14): Complementary Products
```

**5. Win-Back Flow** (Trigger: "Win Back Started" event)
```
Email 1 (Immediate): We miss you + Special offer
Email 2 (Day 3): What's new since you left
Email 3 (Day 7): Final reminder
```

**6. Gift Notification Flow** (Trigger: "Gift Purchased" event)
```
Email 1 (Immediate): Someone sent you a gift!
Email 2 (Day 1): Reminder to redeem
```

---

### 4.2 Klaviyo Dashboard in Haven Hub

**Status:** ✅ IMPLEMENTED (2025-12-26)

**Priority:** Medium
**Estimated Effort:** 8 hours

**Implemented Files:**
- `src/app/(dashboard)/dashboard/email/page.tsx`
- `src/app/(dashboard)/dashboard/email/flows/page.tsx`
- `src/app/api/klaviyo/flows/route.ts`
- `src/app/api/klaviyo/metrics/route.ts`
- `src/lib/integrations/klaviyo/client.ts` (updated with flow methods)
- `src/lib/navigation.ts` (Email section added)

Display Klaviyo flow performance directly in Haven Hub so you don't need to switch between apps.

#### Implementation

**Files to Create:**

1. `src/app/(dashboard)/dashboard/email/page.tsx`
```typescript
// Main email dashboard showing:
// - Flow performance overview
// - Recent sends
// - List growth
// - Revenue attributed to email
```

2. `src/app/(dashboard)/dashboard/email/flows/page.tsx`
```typescript
// Detailed flow analytics:
// - Open rates, click rates by flow
// - Revenue per flow
// - Conversion funnel
```

3. `src/app/api/klaviyo/flows/route.ts`
```typescript
import { getKlaviyoClient } from '@/lib/integrations/klaviyo/service';

export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  const client = await getKlaviyoClient(userId);

  if (!client) {
    return NextResponse.json({ error: 'Klaviyo not connected' }, { status: 400 });
  }

  // Get all flows
  const flows = await client.getFlows();

  // Get metrics for each flow
  const flowsWithMetrics = await Promise.all(
    flows.map(async (flow) => ({
      ...flow,
      metrics: await client.getFlowMetrics(flow.id),
    }))
  );

  return NextResponse.json({ flows: flowsWithMetrics });
}
```

4. `src/lib/integrations/klaviyo/client.ts` - Add methods:
```typescript
async getFlows(): Promise<KlaviyoFlow[]> {
  const response = await this.request<PaginatedResponse<any>>('/flows/');
  return response.data.map(flow => ({
    id: flow.id,
    name: flow.attributes.name,
    status: flow.attributes.status,
    trigger_type: flow.attributes.trigger_type,
    created: flow.attributes.created,
    updated: flow.attributes.updated,
  }));
}

async getFlowMetrics(flowId: string, timeframe: string = '30d'): Promise<FlowMetrics> {
  // Get flow message statistics
  const response = await this.request(`/flows/${flowId}/flow-messages/`);

  // Aggregate metrics
  let totalSent = 0, totalOpened = 0, totalClicked = 0, totalRevenue = 0;

  for (const message of response.data) {
    const stats = await this.request(`/flow-messages/${message.id}/statistics/`);
    totalSent += stats.data.attributes.statistics.sent || 0;
    totalOpened += stats.data.attributes.statistics.opened || 0;
    totalClicked += stats.data.attributes.statistics.clicked || 0;
    // Revenue requires metric aggregation query
  }

  return {
    sent: totalSent,
    opened: totalOpened,
    clicked: totalClicked,
    openRate: totalSent > 0 ? totalOpened / totalSent : 0,
    clickRate: totalOpened > 0 ? totalClicked / totalOpened : 0,
    revenue: totalRevenue,
  };
}
```

---

### 4.3 List & Tag Management UI

**Status:** ✅ IMPLEMENTED (2025-12-26)

**Priority:** Medium
**Estimated Effort:** 6 hours

**Implemented Files:**
- `src/app/api/klaviyo/lists/route.ts`
- `src/app/api/klaviyo/tags/route.ts`
- `src/app/(dashboard)/dashboard/email/lists/page.tsx`
- `src/app/(dashboard)/dashboard/email/tags/page.tsx`

Manage Klaviyo lists and tags from Haven Hub without switching apps.

#### Implementation

**Files to Create:**

1. `src/app/(dashboard)/dashboard/email/lists/page.tsx`
```typescript
// List management:
// - View all lists with subscriber counts
// - Create new lists
// - Set default list for lead capture
// - View list growth over time
```

2. `src/app/(dashboard)/dashboard/email/tags/page.tsx`
```typescript
// Tag management:
// - View all tags with profile counts
// - Create new tags
// - Bulk tag/untag profiles
// - Tag performance (if used in segments)
```

3. `src/app/api/klaviyo/lists/route.ts`
```typescript
export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  const client = await getKlaviyoClient(userId);

  const lists = await client.getLists();

  // Get subscriber counts for each list
  const listsWithCounts = await Promise.all(
    lists.map(async (list) => ({
      ...list,
      subscriberCount: await client.getListProfileCount(list.id),
    }))
  );

  return NextResponse.json({ lists: listsWithCounts });
}

export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  const client = await getKlaviyoClient(userId);
  const { name } = await request.json();

  const list = await client.createList(name);
  return NextResponse.json({ list });
}
```

4. `src/lib/integrations/klaviyo/client.ts` - Add method:
```typescript
async getListProfileCount(listId: string): Promise<number> {
  const response = await this.request(
    `/lists/${listId}/profiles/?page[size]=1`,
    { method: 'GET' }
  );
  // The response includes total count in meta
  return response.meta?.total || 0;
}
```

---

### 4.4 Klaviyo Setup Wizard

**Status:** ✅ IMPLEMENTED (2025-12-26)

**Priority:** High
**Estimated Effort:** 10 hours

**Implemented Files:**
- `src/app/api/klaviyo/setup-status/route.ts`
- `src/app/api/klaviyo/setup/route.ts`
- `src/app/(dashboard)/dashboard/email/setup/page.tsx`

Guided setup that checks if required Klaviyo resources exist and helps create them.

#### Implementation

**Files to Create:**

1. `src/app/(dashboard)/dashboard/email/setup/page.tsx`
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, Button, Badge, Checkbox } from '@/components/ui';

interface SetupStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'complete' | 'missing';
  action?: () => void;
}

export default function KlaviyoSetupPage() {
  const { data: setupStatus } = useQuery({
    queryKey: ['klaviyo-setup'],
    queryFn: () => api.get('/klaviyo/setup-status'),
  });

  const steps: SetupStep[] = [
    {
      id: 'connection',
      name: 'Connect Klaviyo',
      description: 'API key connected and verified',
      status: setupStatus?.connected ? 'complete' : 'pending',
    },
    {
      id: 'lists',
      name: 'Create Required Lists',
      description: 'All Leads, Quiz Takers, Collection lists',
      status: setupStatus?.listsComplete ? 'complete' : 'missing',
    },
    {
      id: 'welcome_flow',
      name: 'Welcome Flow',
      description: 'Triggered when leads are added',
      status: setupStatus?.flows?.welcome ? 'complete' : 'missing',
    },
    {
      id: 'quiz_flow',
      name: 'Quiz Result Flow',
      description: 'Triggered on Quiz Completed event',
      status: setupStatus?.flows?.quiz ? 'complete' : 'missing',
    },
    {
      id: 'abandonment_flow',
      name: 'Cart Abandonment Flow',
      description: 'Triggered on Cart Abandoned event',
      status: setupStatus?.flows?.abandonment ? 'complete' : 'missing',
    },
    {
      id: 'purchase_flow',
      name: 'Post-Purchase Flow',
      description: 'Triggered on Placed Order event',
      status: setupStatus?.flows?.purchase ? 'complete' : 'missing',
    },
    {
      id: 'winback_flow',
      name: 'Win-Back Flow',
      description: 'Triggered on Win Back Started event',
      status: setupStatus?.flows?.winback ? 'complete' : 'missing',
    },
  ];

  return (
    <PageContainer title="Klaviyo Setup">
      {/* Step-by-step checklist with status and action buttons */}
    </PageContainer>
  );
}
```

2. `src/app/api/klaviyo/setup-status/route.ts`
```typescript
export async function GET(request: NextRequest) {
  const userId = await getApiUserId();
  const client = await getKlaviyoClient(userId);

  if (!client) {
    return NextResponse.json({ connected: false });
  }

  // Check lists
  const lists = await client.getLists();
  const requiredLists = ['Haven Hub - All Leads', 'Haven Hub - Quiz Takers'];
  const listsComplete = requiredLists.every(name =>
    lists.some(l => l.name === name)
  );

  // Check flows by looking for specific trigger metrics
  const metrics = await client.getMetrics();
  const flows = {
    welcome: lists.some(l => l.name.includes('All Leads')), // Proxy check
    quiz: metrics.some(m => m.name === 'Quiz Completed'),
    abandonment: metrics.some(m => m.name === 'Cart Abandoned'),
    purchase: metrics.some(m => m.name === 'Placed Order'),
    winback: metrics.some(m => m.name === 'Win Back Started'),
  };

  return NextResponse.json({
    connected: true,
    listsComplete,
    flows,
    lists: lists.map(l => l.name),
    metrics: metrics.map(m => m.name),
  });
}
```

3. `src/app/api/klaviyo/setup/create-lists/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  const client = await getKlaviyoClient(userId);

  const requiredLists = [
    'Haven Hub - All Leads',
    'Haven Hub - Quiz Takers',
    'Haven Hub - Grounding',
    'Haven Hub - Wholeness',
    'Haven Hub - Growth',
    'Haven Hub - Customers',
    'Haven Hub - VIP',
  ];

  const existing = await client.getLists();
  const existingNames = existing.map(l => l.name);

  const created: string[] = [];
  for (const name of requiredLists) {
    if (!existingNames.includes(name)) {
      await client.createList(name);
      created.push(name);
    }
  }

  return NextResponse.json({ created });
}
```

---

### 4.5 Event Testing & Debugging

**Status:** ✅ IMPLEMENTED (2025-12-26)

**Priority:** Medium
**Estimated Effort:** 4 hours

**Implemented Files:**
- `src/app/api/klaviyo/test-event/route.ts`
- `src/app/(dashboard)/dashboard/email/debug/page.tsx`

Test that Haven Hub events are reaching Klaviyo correctly.

#### Implementation

**Files to Create:**

1. `src/app/(dashboard)/dashboard/email/debug/page.tsx`
```typescript
// Event debugging:
// - Send test events to Klaviyo
// - View recent events sent
// - Check if events are triggering flows
```

2. `src/app/api/klaviyo/test-event/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  const client = await getKlaviyoClient(userId);
  const { eventType, testEmail } = await request.json();

  switch (eventType) {
    case 'quiz_completed':
      await client.trackQuizComplete(testEmail, {
        grounding: 0.6,
        wholeness: 0.3,
        growth: 0.1,
      }, 'grounding');
      break;
    case 'cart_abandoned':
      await client.trackCartAbandonment(testEmail, 'test_cart_123', [
        { name: 'Test Product', quantity: 1, price: 25 }
      ], 25);
      break;
    case 'placed_order':
      await client.trackPurchase(testEmail, 'test_order_123', 50, [
        { name: 'Test Product', quantity: 2, price: 25 }
      ]);
      break;
  }

  return NextResponse.json({ success: true, eventType, testEmail });
}
```

---

### 4.6 Klaviyo Revenue Attribution

**Status:** ✅ IMPLEMENTED (2025-12-26)

**Priority:** Low
**Estimated Effort:** 6 hours

**Implemented Files:**
- `src/app/api/klaviyo/revenue/route.ts`
- `src/app/(dashboard)/dashboard/email/revenue/page.tsx`

Show email-attributed revenue in Haven Hub analytics.

#### Implementation

```typescript
// Add to analytics dashboard:
// - Revenue from Welcome flow
// - Revenue from Quiz flow
// - Revenue from Abandonment flow
// - Revenue from Win-back flow
// - Total email-attributed revenue
// - Email revenue as % of total revenue
```

---

## Updated Implementation Priority

### Phase 1 (High Priority) - 2 weeks
1. Pinterest Conversion API (12h)
2. Enhanced Performance Alerts (6h)
3. Complete Seasonal Rotation (6h)
4. **Klaviyo Setup Wizard (10h)** ← New

### Phase 2 (Medium Priority) - 2 weeks
5. Audience Segment Export (10h)
6. 16-Week KPI Dashboard (12h)
7. **Klaviyo Dashboard (8h)** ← New
8. Enhanced Copy Templates (8h)

### Phase 3 (Lower Priority) - 1 week
9. **Klaviyo List/Tag Management (6h)** ← New
10. Bulk Pin Scheduling Strategies (4h)
11. Copy-to-Ads UTM Export (3h)
12. Weekly Rhythm System (8h)
13. **Klaviyo Event Debugging (4h)** ← New

---

## Testing Checklist

### Pinterest
- [x] Pinterest Conversion API sends events correctly
- [x] Audience exports create valid Pinterest audiences
- [x] KPI dashboard shows accurate weekly snapshots
- [x] Seasonal rotation activates/deactivates correctly
- [x] Performance alerts trigger at correct thresholds
- [x] Enhanced copy templates generate varied copy
- [x] Bulk scheduling distributes pins correctly
- [x] UTM export creates valid Pinterest Ads CSV
- [x] Weekly rhythm tasks show correct daily items

### Klaviyo
- [x] Setup wizard correctly identifies missing lists/flows
- [x] Required lists can be created from Haven Hub
- [x] Flow performance metrics display correctly
- [x] Test events reach Klaviyo and trigger flows
- [x] List subscriber counts are accurate
- [x] Tags can be created and applied from Haven Hub
- [x] Revenue attribution matches Klaviyo reports

---

## Implementation Complete

All 14 V1 Feature Parity items have been successfully implemented:

**Pinterest Features (6):**
1. Pinterest Conversion API (Server-side events)
2. Enhanced Performance Alerts
3. Complete Seasonal Rotation
4. Audience Segment Export
5. 16-Week KPI Dashboard
6. Copy-to-Ads UTM Export

**Klaviyo Features (5):**
1. Klaviyo Setup Wizard
2. Klaviyo Dashboard
3. List & Tag Management UI
4. Event Testing & Debugging
5. Revenue Attribution

**Workflow Features (3):**
1. Enhanced Copy Templates
2. Bulk Pin Scheduling Strategies
3. Weekly Rhythm System
