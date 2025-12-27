# Haven Hub: Pinterest Automation Suite
## Cursor Implementation Prompts

**Purpose:** Complete the Pinterest automation pipeline to enable hands-off campaign management

**Based on:** Existing Haven Hub codebase (Next.js 15, Supabase, TypeScript)

---

## Overview: What We're Building

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| 1. Pinterest Publish Cron | 🔴 Critical | Medium | Enables scheduled pins to actually publish |
| 2. Pinterest Insights Cron | 🔴 Critical | Medium | Performance data for optimization |
| 3. Dynamic Mockups Integration | 🟡 High | Medium | Automated mockup generation |
| 4. Auto-Generate Pin Copy | 🟡 High | Low | Eliminates manual copywriting |
| 5. Bulk Pin Creator | 🟡 High | Medium | Batch operations from approved assets |
| 6. Copy-to-Ads Workflow | 🟢 Medium | Low | Streamlines paid campaign setup |
| 7. A/B Test Tracker | 🟢 Medium | Medium | Track creative/audience tests |
| 8. Performance Alerts | 🟢 Medium | Low | Email notifications for wins/issues |
| 9. Temporal Auto-Scheduler | 🟢 Medium | Medium | AI-powered optimal scheduling |
| 10. Winner Refresh System | 🟢 Medium | High | Auto-create variations of top performers |
| 11. Master File Upload | 🟡 High | Medium | Upload existing designs → generate all assets |
| 12. Pinterest Conversion API | 🟢 Medium | Medium | Server-side event tracking for better attribution |
| 13. Smart Budget Recommendations | 🟢 Medium | Medium | Weekly budget advice based on ROAS/CPA |
| 14. Seasonal Content Rotation | 🟢 Medium | Low | Auto-activate/deactivate by date range |
| 15. Cross-Platform Winners | 🔵 Nice-to-have | Medium | Auto cross-post Instagram ↔ Pinterest winners |
| 16. Audience Segment Export | 🔵 Nice-to-have | Low | Export segments for Pinterest lookalikes |
| 17. 16-Week KPI Dashboard | 🟡 High | Medium | Phase-aware tracking with playbook targets |
| 18. Campaign Setup Wizard | 🟡 High | Low | Guided 3-tier campaign structure setup |
| 19. Weekly Rhythm System | 🟢 Medium | Medium | Automated daily task reminders and tracking |

---

# PROMPT 1: Pinterest Publish Cron Job

## Context

Haven Hub has Instagram publishing via cron (`/api/cron/instagram-publish`), but Pinterest scheduled pins don't have a corresponding publish job. The `scheduled_pins` table exists but pins aren't being published automatically.

## Existing Patterns to Follow

```typescript
// From app/api/cron/instagram-publish/route.ts pattern:
// 1. Query for posts ready to publish (scheduled_at <= now, not published)
// 2. Call platform API to publish
// 3. Update database with published status and platform IDs
// 4. Handle errors gracefully, continue on failures
// 5. Send email notification on completion
```

## Database Schema (Existing)

```sql
-- pinterest_boards table
pinterest_board_id TEXT,
name TEXT,
primary_segment quiz_segment

-- scheduled_pins table
id UUID PRIMARY KEY,
board_id UUID REFERENCES pinterest_boards(id),
image_url TEXT NOT NULL,
title TEXT,
description TEXT,
link TEXT,
scheduled_at TIMESTAMP,
published_at TIMESTAMP,
pinterest_pin_id TEXT,
status TEXT DEFAULT 'scheduled', -- scheduled, publishing, published, failed
error_message TEXT,
created_at TIMESTAMP DEFAULT NOW()
```

## Implementation Requirements

### File: `app/api/cron/pinterest-publish/route.ts`

```typescript
// Cron job to publish scheduled Pinterest pins
// Schedule: Every 5 minutes (matches Instagram pattern)

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { pinterestClient } from '@/lib/integrations/pinterest';
import { sendNotificationEmail } from '@/lib/integrations/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NOTIFICATION_EMAIL = 'hello@havenandhold.com';

export async function GET(request: Request) {
  // Verify cron secret (Vercel cron authentication)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const results = { published: 0, failed: 0, errors: [] as string[] };

  try {
    // 1. Get pins ready to publish
    const { data: pins, error } = await supabase
      .from('scheduled_pins')
      .select(`
        *,
        pinterest_boards (
          pinterest_board_id,
          name
        )
      `)
      .lte('scheduled_at', new Date().toISOString())
      .is('published_at', null)
      .in('status', ['scheduled', 'failed']) // Retry failed pins
      .order('scheduled_at', { ascending: true })
      .limit(10); // Process in batches

    if (error) throw error;
    if (!pins || pins.length === 0) {
      return NextResponse.json({ message: 'No pins to publish', results });
    }

    // 2. Publish each pin
    for (const pin of pins) {
      try {
        // Update status to publishing
        await supabase
          .from('scheduled_pins')
          .update({ status: 'publishing' })
          .eq('id', pin.id);

        // Call Pinterest API
        const result = await pinterestClient.createPin({
          board_id: pin.pinterest_boards.pinterest_board_id,
          media_source: {
            source_type: 'image_url',
            url: pin.image_url,
          },
          title: pin.title,
          description: pin.description,
          link: pin.link,
        });

        // Update with success
        await supabase
          .from('scheduled_pins')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            pinterest_pin_id: result.id,
            error_message: null,
          })
          .eq('id', pin.id);

        results.published++;

      } catch (pinError) {
        // Update with failure
        const errorMessage = pinError instanceof Error ? pinError.message : 'Unknown error';
        await supabase
          .from('scheduled_pins')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', pin.id);

        results.failed++;
        results.errors.push(`Pin ${pin.id}: ${errorMessage}`);
      }
    }

    // 3. Send email notification if any activity
    if (results.published > 0 || results.failed > 0) {
      await sendNotificationEmail({
        to: NOTIFICATION_EMAIL,
        subject: `Pinterest Publish: ${results.published} published, ${results.failed} failed`,
        html: `
          <h2>Pinterest Publish Report</h2>
          <p><strong>Published:</strong> ${results.published}</p>
          <p><strong>Failed:</strong> ${results.failed}</p>
          ${results.errors.length > 0 ? `
            <h3>Errors:</h3>
            <ul>${results.errors.map(e => `<li>${e}</li>`).join('')}</ul>
          ` : ''}
        `,
      });
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error('Pinterest publish cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

### Update: `vercel.json`

Add to existing crons array:

```json
{
  "crons": [
    {
      "path": "/api/cron/pinterest-publish",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Update: `lib/integrations/pinterest.ts`

Ensure the Pinterest client has a `createPin` method:

```typescript
export const pinterestClient = {
  // ... existing methods
  
  async createPin(params: {
    board_id: string;
    media_source: { source_type: 'image_url'; url: string };
    title?: string;
    description?: string;
    link?: string;
  }) {
    const response = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Pinterest API error');
    }

    return response.json();
  },
};
```

---

# PROMPT 2: Pinterest Insights Cron Job

## Context

Instagram has an insights cron (`/api/cron/instagram-insights`) that fetches performance data. Pinterest needs the same for optimization decisions.

## Implementation Requirements

### File: `app/api/cron/pinterest-insights/route.ts`

```typescript
// Cron job to fetch Pinterest pin insights
// Schedule: Daily at 7 AM (after Instagram insights at 6 AM)

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { pinterestClient } from '@/lib/integrations/pinterest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Get published pins from last 30 days
    const { data: pins, error } = await supabase
      .from('scheduled_pins')
      .select('id, pinterest_pin_id')
      .eq('status', 'published')
      .not('pinterest_pin_id', 'is', null)
      .gte('published_at', thirtyDaysAgo.toISOString());

    if (error) throw error;
    if (!pins || pins.length === 0) {
      return NextResponse.json({ message: 'No pins to fetch insights for' });
    }

    let updated = 0;
    let failed = 0;

    for (const pin of pins) {
      try {
        const analytics = await pinterestClient.getPinAnalytics(pin.pinterest_pin_id, {
          start_date: thirtyDaysAgo.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          metric_types: ['IMPRESSION', 'SAVE', 'PIN_CLICK', 'OUTBOUND_CLICK'],
        });

        // Aggregate metrics
        const metrics = {
          impressions: analytics.all?.summary_metrics?.IMPRESSION || 0,
          saves: analytics.all?.summary_metrics?.SAVE || 0,
          pin_clicks: analytics.all?.summary_metrics?.PIN_CLICK || 0,
          outbound_clicks: analytics.all?.summary_metrics?.OUTBOUND_CLICK || 0,
          engagement_rate: 0,
          updated_at: new Date().toISOString(),
        };

        // Calculate engagement rate
        if (metrics.impressions > 0) {
          metrics.engagement_rate = 
            ((metrics.saves + metrics.pin_clicks + metrics.outbound_clicks) / metrics.impressions) * 100;
        }

        await supabase
          .from('scheduled_pins')
          .update({ performance_metrics: metrics })
          .eq('id', pin.id);

        updated++;
      } catch (pinError) {
        console.error(`Failed to fetch insights for pin ${pin.pinterest_pin_id}:`, pinError);
        failed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated, 
      failed,
      total: pins.length 
    });

  } catch (error) {
    console.error('Pinterest insights cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
```

### Database Migration

Add `performance_metrics` column to `scheduled_pins` if not exists:

```sql
ALTER TABLE scheduled_pins 
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_scheduled_pins_performance 
ON scheduled_pins ((performance_metrics->>'impressions')::int DESC);
```

### Update: `lib/integrations/pinterest.ts`

```typescript
async getPinAnalytics(pinId: string, params: {
  start_date: string;
  end_date: string;
  metric_types: string[];
}) {
  const url = new URL(`https://api.pinterest.com/v5/pins/${pinId}/analytics`);
  url.searchParams.set('start_date', params.start_date);
  url.searchParams.set('end_date', params.end_date);
  url.searchParams.set('metric_types', params.metric_types.join(','));
  url.searchParams.set('app_types', 'ALL');
  url.searchParams.set('split_field', 'NO_SPLIT');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Pinterest Analytics API error: ${response.status}`);
  }

  return response.json();
}
```

### Update: `vercel.json`

```json
{
  "path": "/api/cron/pinterest-insights",
  "schedule": "0 7 * * *"
}
```

---

# PROMPT 3: Dynamic Mockups API Integration

## Context

The Design Engine generates quote assets but mockups are uploaded manually. This integrates Dynamic Mockups API to auto-generate room scene mockups when a quote is approved.

## Existing Patterns

- `lib/design-engine/generate-quote.ts` orchestrates asset generation
- `mockup_uploads` table stores mockups with `mockup_source` enum
- Cloudinary handles final asset storage
- Approval workflow in Design Engine review queue

## Database Updates

```sql
-- Add to mockup_source enum
ALTER TYPE mockup_source ADD VALUE IF NOT EXISTS 'dynamic_mockups';

-- New table for template configuration
CREATE TABLE IF NOT EXISTS dynamic_mockup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL, -- External ID from Dynamic Mockups
  name TEXT NOT NULL,
  scene_type TEXT NOT NULL, -- bedroom, therapy_office, living_room, reading_nook, home_office
  mockup_uuid TEXT NOT NULL,
  smart_object_uuid TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Collection UUID for bulk operations
CREATE TABLE IF NOT EXISTS dynamic_mockup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_uuid TEXT,
  api_key_encrypted TEXT, -- Store encrypted
  default_format TEXT DEFAULT 'webp',
  default_size INT DEFAULT 1000,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation

### File: `lib/integrations/dynamic-mockups.ts`

```typescript
/**
 * Dynamic Mockups API Integration
 * Generates room scene mockups from quote images
 */

export interface MockupTemplate {
  id: string;
  name: string;
  scene_type: string;
  mockup_uuid: string;
  smart_object_uuid: string;
}

export interface GeneratedMockup {
  template_id: string;
  template_name: string;
  scene_type: string;
  image_url: string;
  format: string;
}

export interface MockupGenerationResult {
  success: boolean;
  quote_id: string;
  mockups: GeneratedMockup[];
  errors: string[];
}

class DynamicMockupsClient {
  private apiKey: string;
  private baseUrl = 'https://app.dynamicmockups.com/api/v1';

  constructor() {
    const apiKey = process.env.DYNAMIC_MOCKUPS_API_KEY;
    if (!apiKey) {
      throw new Error('DYNAMIC_MOCKUPS_API_KEY not configured');
    }
    this.apiKey = apiKey;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  /**
   * Generate mockups using bulk render (collection-based)
   */
  async bulkRender(params: {
    collection_uuid: string;
    artwork_url: string;
    export_label?: string;
    format?: 'jpg' | 'png' | 'webp';
    size?: number;
  }): Promise<{ exports: Array<{ url: string; label: string }> }> {
    const response = await fetch(`${this.baseUrl}/renders/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        collection_uuid: params.collection_uuid,
        artworks: {
          artwork_main: params.artwork_url,
        },
        export_label: params.export_label,
        export_options: {
          image_format: params.format || 'webp',
          image_size: params.size || 1000,
          mode: 'view',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Bulk render failed');
    }

    return data.data;
  }

  /**
   * Generate a single mockup
   */
  async renderSingle(params: {
    mockup_uuid: string;
    smart_object_uuid: string;
    artwork_url: string;
    format?: 'jpg' | 'png' | 'webp';
    size?: number;
  }): Promise<{ url: string }> {
    const response = await fetch(`${this.baseUrl}/renders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        mockup_uuid: params.mockup_uuid,
        smart_objects: [{
          uuid: params.smart_object_uuid,
          asset: {
            url: params.artwork_url,
            fit: 'contain',
          },
        }],
        export_options: {
          image_format: params.format || 'webp',
          image_size: params.size || 1000,
          mode: 'view',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Render API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Render failed');
    }

    return data.data;
  }
}

export const dynamicMockupsClient = new DynamicMockupsClient();
```

### File: `lib/design-engine/mockup-generator.ts`

```typescript
/**
 * Mockup generation orchestration
 * Called after quote approval to generate room mockups
 */

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { dynamicMockupsClient, MockupGenerationResult } from '@/lib/integrations/dynamic-mockups';
import { uploadToCloudinary } from '@/lib/integrations/cloudinary';

export async function generateMockupsForQuote(
  quoteId: string,
  quoteImageUrl: string
): Promise<MockupGenerationResult> {
  const supabase = getSupabaseAdmin();
  const result: MockupGenerationResult = {
    success: false,
    quote_id: quoteId,
    mockups: [],
    errors: [],
  };

  try {
    // Get configuration
    const { data: config } = await supabase
      .from('dynamic_mockup_config')
      .select('collection_uuid, default_format, default_size')
      .single();

    if (!config?.collection_uuid) {
      // Fall back to individual templates
      return generateMockupsIndividually(quoteId, quoteImageUrl);
    }

    // Bulk render using collection
    const renderResult = await dynamicMockupsClient.bulkRender({
      collection_uuid: config.collection_uuid,
      artwork_url: quoteImageUrl,
      export_label: `quote-${quoteId}`,
      format: config.default_format as 'webp',
      size: config.default_size,
    });

    // Get template metadata for labeling
    const { data: templates } = await supabase
      .from('dynamic_mockup_templates')
      .select('*')
      .eq('is_active', true);

    // Process each generated mockup
    for (let i = 0; i < renderResult.exports.length; i++) {
      const exp = renderResult.exports[i];
      const template = templates?.[i];

      try {
        // Upload to Cloudinary for permanent storage
        const cloudinaryUrl = await uploadToCloudinary(exp.url, {
          folder: `haven-hold/mockups/${quoteId}`,
          public_id: `${template?.scene_type || `scene-${i}`}`,
        });

        // Save to mockup_uploads table
        await supabase.from('mockup_uploads').insert({
          quote_id: quoteId,
          image_url: cloudinaryUrl,
          mockup_source: 'dynamic_mockups',
          scene_type: template?.scene_type,
          template_name: template?.name || exp.label,
          approval_status: 'pending',
        });

        result.mockups.push({
          template_id: template?.id || `template-${i}`,
          template_name: template?.name || exp.label,
          scene_type: template?.scene_type || 'unknown',
          image_url: cloudinaryUrl,
          format: config.default_format,
        });
      } catch (uploadError) {
        result.errors.push(
          `Failed to process mockup ${i}: ${uploadError instanceof Error ? uploadError.message : 'Unknown'}`
        );
      }
    }

    result.success = result.mockups.length > 0;

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Generation failed');
  }

  return result;
}

async function generateMockupsIndividually(
  quoteId: string,
  quoteImageUrl: string
): Promise<MockupGenerationResult> {
  // Fallback: generate using individual template UUIDs
  // Implementation similar to above but using renderSingle for each template
  // ...
}
```

### Integration Point: `lib/design-engine/generate-quote.ts`

Add mockup generation after quote approval:

```typescript
// In the approval handler or post-generation hook:
import { generateMockupsForQuote } from './mockup-generator';

export async function onQuoteApproved(quoteId: string) {
  // Get the approved quote's main image
  const { data: asset } = await supabase
    .from('generated_assets')
    .select('cloudinary_url')
    .eq('quote_id', quoteId)
    .eq('format', 'print_2x3') // Use main print format
    .eq('approval_status', 'approved')
    .single();

  if (asset?.cloudinary_url) {
    // Generate mockups asynchronously
    const mockupResult = await generateMockupsForQuote(quoteId, asset.cloudinary_url);
    
    // Notify via email
    if (mockupResult.success) {
      await sendNotificationEmail({
        to: 'hello@havenandhold.com',
        subject: `🖼️ Mockups Generated: ${mockupResult.mockups.length} new mockups`,
        html: `
          <h2>Mockup Generation Complete</h2>
          <p>Generated ${mockupResult.mockups.length} mockups for quote ${quoteId}</p>
          <p><a href="https://hub.havenandhold.com/design-engine/review/${quoteId}">Review mockups →</a></p>
        `,
      });
    }
  }
}
```

### API Endpoint: `app/api/design-engine/mockups/generate/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { generateMockupsForQuote } from '@/lib/design-engine/mockup-generator';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

export async function POST(request: Request) {
  const { quote_id } = await request.json();

  if (!quote_id) {
    return NextResponse.json({ error: 'quote_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get quote's main image
  const { data: asset } = await supabase
    .from('generated_assets')
    .select('cloudinary_url')
    .eq('quote_id', quote_id)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!asset?.cloudinary_url) {
    return NextResponse.json(
      { error: 'No approved asset found for quote' },
      { status: 404 }
    );
  }

  const result = await generateMockupsForQuote(quote_id, asset.cloudinary_url);

  return NextResponse.json(result);
}
```

---

# PROMPT 4: Auto-Generate Pin Copy

## Context

When scheduling pins, users currently write titles and descriptions manually. This feature auto-generates Pinterest-optimized copy from quote metadata using templates and the temporal rules engine.

## Implementation

### File: `lib/pinterest/copy-generator.ts`

```typescript
/**
 * Auto-generate Pinterest pin titles and descriptions
 * Based on quote metadata, collection, mood, and temporal context
 */

import { getActiveTemporalRules } from '@/lib/temporal/engine';

interface QuoteMetadata {
  quote_text: string;
  mantra_text?: string;
  collection: 'grounding' | 'wholeness' | 'growth';
  mood: string;
  product_version: 'minimal' | 'full_mantra';
}

interface GeneratedCopy {
  title: string;
  description: string;
  alt_text: string;
  hashtags: string[];
}

// Collection-specific messaging
const COLLECTION_HOOKS: Record<string, string[]> = {
  grounding: [
    'Find your anchor',
    'Steady yourself',
    'Come back to center',
    'Your foundation matters',
    'Roots before branches',
  ],
  wholeness: [
    'You are already complete',
    'Embrace all of you',
    'Nothing to fix, only to accept',
    'Your wholeness awaits',
    'Permission to be',
  ],
  growth: [
    'Becoming takes time',
    'You\'re still unfolding',
    'Growth isn\'t linear',
    'Trust the process',
    'One step, then another',
  ],
};

const MOOD_DESCRIPTORS: Record<string, string[]> = {
  calm: ['peaceful', 'serene', 'tranquil', 'soothing'],
  warm: ['comforting', 'nurturing', 'gentle', 'soft'],
  hopeful: ['uplifting', 'inspiring', 'encouraging', 'bright'],
  reflective: ['contemplative', 'thoughtful', 'introspective', 'mindful'],
  empowering: ['strong', 'bold', 'confident', 'affirming'],
};

const ROOM_CONTEXTS = [
  'bedroom sanctuary',
  'therapy office',
  'reading nook',
  'home office',
  'meditation corner',
  'living room',
];

export function generatePinCopy(quote: QuoteMetadata): GeneratedCopy {
  const hooks = COLLECTION_HOOKS[quote.collection] || COLLECTION_HOOKS.grounding;
  const moods = MOOD_DESCRIPTORS[quote.mood] || MOOD_DESCRIPTORS.calm;
  const room = ROOM_CONTEXTS[Math.floor(Math.random() * ROOM_CONTEXTS.length)];

  // Select random elements for variety
  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  const mood = moods[Math.floor(Math.random() * moods.length)];

  // Generate title (max 100 chars for Pinterest)
  const title = generateTitle(quote, hook);

  // Generate description (max 500 chars)
  const description = generateDescription(quote, mood, room);

  // Generate alt text for accessibility
  const alt_text = `Minimalist quote print: "${truncate(quote.quote_text, 100)}" - ${mood} wall art`;

  // Generate hashtags
  const hashtags = generateHashtags(quote);

  return { title, description, alt_text, hashtags };
}

function generateTitle(quote: QuoteMetadata, hook: string): string {
  const templates = [
    `${hook} | Minimalist Quote Print`,
    `"${truncate(quote.quote_text, 50)}" | Wall Art`,
    `${capitalize(quote.collection)} Collection | ${hook}`,
    `Therapeutic Wall Art | ${hook}`,
  ];

  const title = templates[Math.floor(Math.random() * templates.length)];
  return truncate(title, 100);
}

function generateDescription(quote: QuoteMetadata, mood: string, room: string): string {
  const quotePreview = truncate(quote.quote_text, 80);
  
  const templates = [
    `"${quotePreview}"

This ${mood} minimalist print brings intention to your ${room}. Part of our ${capitalize(quote.collection)} Collection—designed for those seeking quiet anchors in turbulent times.

✨ Instant digital download
🖼️ Multiple sizes included (4x6 to 24x36)
🎨 Print-ready 300 DPI

Perfect for therapy offices, bedrooms, and spaces that hold you.`,

    `${mood.charAt(0).toUpperCase() + mood.slice(1)} words for ${mood} spaces.

"${quotePreview}"

From our ${capitalize(quote.collection)} Collection: wall art that whispers what you need to hear.

📥 Digital download • Print at home or any print shop
📐 15+ sizes for any frame
🤍 Minimalist design, maximum meaning`,

    `Your walls can hold space for you.

"${quotePreview}"

This therapeutic quote print is designed to be a quiet anchor—not a loud demand. The ${capitalize(quote.collection)} Collection speaks to those building foundations, finding wholeness, or trusting growth.

Instant download → Print → Frame → Breathe.`,
  ];

  const desc = templates[Math.floor(Math.random() * templates.length)];
  return truncate(desc, 500);
}

function generateHashtags(quote: QuoteMetadata): string[] {
  const base = [
    'minimalistdecor',
    'quoteprintable',
    'wallart',
    'homedecor',
    'therapyoffice',
    'mentalhealth',
    'selfcare',
  ];

  const collectionTags: Record<string, string[]> = {
    grounding: ['grounded', 'innerpeace', 'stability', 'anxietyrelief'],
    wholeness: ['selfacceptance', 'selflove', 'enoughness', 'healing'],
    growth: ['personalgrowth', 'becoming', 'mindset', 'transformation'],
  };

  return [...base, ...(collectionTags[quote.collection] || [])].slice(0, 10);
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Batch generate for multiple quotes
export function generateBulkPinCopy(quotes: QuoteMetadata[]): Map<string, GeneratedCopy> {
  const results = new Map<string, GeneratedCopy>();
  
  for (const quote of quotes) {
    // Generate multiple variants to avoid repetition
    const copy = generatePinCopy(quote);
    results.set(quote.quote_text, copy);
  }

  return results;
}
```

### API Endpoint: `app/api/pinterest/generate-copy/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { generatePinCopy, generateBulkPinCopy } from '@/lib/pinterest/copy-generator';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

export async function POST(request: Request) {
  const { quote_id, quote_ids } = await request.json();
  const supabase = getSupabaseAdmin();

  // Single quote
  if (quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('quote_text, mantra_text, collection, mood')
      .eq('id', quote_id)
      .single();

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const copy = generatePinCopy(quote);
    return NextResponse.json({ copy });
  }

  // Bulk quotes
  if (quote_ids && Array.isArray(quote_ids)) {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, quote_text, mantra_text, collection, mood')
      .in('id', quote_ids);

    if (!quotes) {
      return NextResponse.json({ error: 'Quotes not found' }, { status: 404 });
    }

    const results = quotes.map(q => ({
      quote_id: q.id,
      copy: generatePinCopy(q),
    }));

    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: 'quote_id or quote_ids required' }, { status: 400 });
}
```

---

# PROMPT 5: Bulk Pin Creator

## Context

After Design Engine generates approved assets, users should be able to bulk-create pins for all Pinterest-format assets with auto-generated copy and optimal scheduling.

## Implementation

### File: `app/api/pinterest/bulk-create/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { generatePinCopy } from '@/lib/pinterest/copy-generator';
import { suggestOptimalTimes } from '@/lib/temporal/engine';

interface BulkPinRequest {
  quote_ids: string[];
  board_id: string;
  schedule_strategy: 'immediate' | 'optimal' | 'spread';
  spread_days?: number; // For 'spread' strategy
  include_mockups?: boolean;
}

export async function POST(request: Request) {
  const body: BulkPinRequest = await request.json();
  const { quote_ids, board_id, schedule_strategy, spread_days = 7, include_mockups = true } = body;

  if (!quote_ids?.length || !board_id) {
    return NextResponse.json({ error: 'quote_ids and board_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const results = { created: 0, failed: 0, errors: [] as string[] };

  // Get board info for segment-aware copy
  const { data: board } = await supabase
    .from('pinterest_boards')
    .select('*')
    .eq('id', board_id)
    .single();

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Get all approved Pinterest assets for these quotes
  const { data: assets } = await supabase
    .from('generated_assets')
    .select(`
      *,
      quotes (
        id,
        quote_text,
        mantra_text,
        collection,
        mood
      )
    `)
    .in('quote_id', quote_ids)
    .in('format', ['pinterest_portrait', 'pinterest_square'])
    .eq('approval_status', 'approved');

  if (!assets?.length) {
    return NextResponse.json({ error: 'No approved Pinterest assets found' }, { status: 404 });
  }

  // Optionally include mockups
  let mockups: any[] = [];
  if (include_mockups) {
    const { data: mockupData } = await supabase
      .from('mockup_uploads')
      .select(`
        *,
        quotes (id, quote_text, mantra_text, collection, mood)
      `)
      .in('quote_id', quote_ids)
      .eq('approval_status', 'approved');
    
    mockups = mockupData || [];
  }

  // Combine assets and mockups
  const allImages = [
    ...assets.map(a => ({ ...a, type: 'asset' })),
    ...mockups.map(m => ({ ...m, type: 'mockup', cloudinary_url: m.image_url })),
  ];

  // Calculate scheduling
  const scheduleTimes = calculateScheduleTimes(
    allImages.length,
    schedule_strategy,
    spread_days
  );

  // Create pins
  for (let i = 0; i < allImages.length; i++) {
    const item = allImages[i];
    const quote = item.quotes;

    try {
      // Generate copy
      const copy = generatePinCopy({
        quote_text: quote.quote_text,
        mantra_text: quote.mantra_text,
        collection: quote.collection,
        mood: quote.mood,
        product_version: item.product_version || 'minimal',
      });

      // Create scheduled pin
      const { error } = await supabase.from('scheduled_pins').insert({
        board_id: board_id,
        image_url: item.cloudinary_url,
        title: copy.title,
        description: `${copy.description}\n\n${copy.hashtags.map(h => `#${h}`).join(' ')}`,
        link: `https://havenandhold.com/products/${quote.id}`, // Adjust URL pattern
        scheduled_at: scheduleTimes[i],
        status: 'scheduled',
        source_type: item.type,
        source_id: item.id,
        quote_id: quote.id,
      });

      if (error) throw error;
      results.created++;

    } catch (err) {
      results.failed++;
      results.errors.push(`Failed to create pin for ${item.id}: ${err}`);
    }
  }

  return NextResponse.json({
    success: results.created > 0,
    ...results,
    total_images: allImages.length,
  });
}

function calculateScheduleTimes(
  count: number,
  strategy: 'immediate' | 'optimal' | 'spread',
  spreadDays: number
): Date[] {
  const times: Date[] = [];
  const now = new Date();

  switch (strategy) {
    case 'immediate':
      // All now (will be picked up by next cron run)
      for (let i = 0; i < count; i++) {
        times.push(new Date(now.getTime() + i * 60000)); // 1 min apart
      }
      break;

    case 'optimal':
      // Use temporal engine suggestions
      // Peak Pinterest times: 8-11pm, especially Saturdays
      const optimalHours = [20, 21, 22]; // 8pm, 9pm, 10pm
      let dayOffset = 0;
      
      for (let i = 0; i < count; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + dayOffset);
        date.setHours(optimalHours[i % optimalHours.length], 0, 0, 0);
        times.push(date);
        
        if ((i + 1) % optimalHours.length === 0) dayOffset++;
      }
      break;

    case 'spread':
      // Evenly distribute over spreadDays
      const intervalMs = (spreadDays * 24 * 60 * 60 * 1000) / count;
      
      for (let i = 0; i < count; i++) {
        times.push(new Date(now.getTime() + i * intervalMs));
      }
      break;
  }

  return times;
}
```

### UI Component: Bulk Pin Creator Dialog

Add to `app/(admin)/pinterest/page.tsx`:

```tsx
// Component for bulk pin creation from approved assets
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

export function BulkPinCreator({ 
  boards, 
  approvedQuotes 
}: { 
  boards: any[]; 
  approvedQuotes: any[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [boardId, setBoardId] = useState('');
  const [strategy, setStrategy] = useState<'immediate' | 'optimal' | 'spread'>('optimal');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pinterest/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_ids: selectedQuotes,
          board_id: boardId,
          schedule_strategy: strategy,
          include_mockups: true,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to create pins' });
    }
    setLoading(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Bulk Create Pins
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Create Pinterest Pins</DialogTitle>
          </DialogHeader>

          {/* Quote selection, board selection, strategy selection */}
          {/* ... UI implementation ... */}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={loading || !selectedQuotes.length || !boardId}
            >
              {loading ? 'Creating...' : `Create ${selectedQuotes.length * 2} Pins`}
            </Button>
          </div>

          {result && (
            <div className={`p-4 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {result.success 
                ? `✅ Created ${result.created} pins` 
                : `❌ ${result.error}`}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

# PROMPT 6: Copy-to-Ads Workflow

## Context

When ready to create paid Pinterest campaigns, users need easy access to approved asset URLs and campaign-ready copy for pasting into Pinterest Ads Manager.

## Implementation

### File: `app/api/pinterest/export-for-ads/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { generatePinCopy } from '@/lib/pinterest/copy-generator';

export async function POST(request: Request) {
  const { quote_ids, campaign_name, utm_source = 'pinterest', utm_medium = 'paid' } = await request.json();

  if (!quote_ids?.length) {
    return NextResponse.json({ error: 'quote_ids required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get quotes with all their assets and mockups
  const { data: quotes } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_text,
      mantra_text,
      collection,
      mood,
      generated_assets (
        id,
        cloudinary_url,
        format,
        product_version,
        approval_status
      ),
      mockup_uploads (
        id,
        image_url,
        scene_type,
        approval_status
      )
    `)
    .in('id', quote_ids);

  if (!quotes?.length) {
    return NextResponse.json({ error: 'Quotes not found' }, { status: 404 });
  }

  // Generate export package for each quote
  const exports = quotes.map(quote => {
    const copy = generatePinCopy({
      quote_text: quote.quote_text,
      mantra_text: quote.mantra_text,
      collection: quote.collection,
      mood: quote.mood,
      product_version: 'minimal',
    });

    // Build UTM-tagged destination URL
    const utm_campaign = campaign_name 
      ? campaign_name.toLowerCase().replace(/\s+/g, '-')
      : `${quote.collection}-${quote.id.slice(0, 8)}`;
    
    const destinationUrl = new URL('https://havenandhold.com/products/' + quote.id);
    destinationUrl.searchParams.set('utm_source', utm_source);
    destinationUrl.searchParams.set('utm_medium', utm_medium);
    destinationUrl.searchParams.set('utm_campaign', utm_campaign);

    // Collect all approved images
    const images = [
      // Pinterest-format assets
      ...(quote.generated_assets || [])
        .filter((a: any) => a.approval_status === 'approved')
        .filter((a: any) => a.format.startsWith('pinterest'))
        .map((a: any) => ({
          url: a.cloudinary_url,
          type: 'asset',
          format: a.format,
          label: `${a.format} - ${a.product_version}`,
        })),
      // Mockups
      ...(quote.mockup_uploads || [])
        .filter((m: any) => m.approval_status === 'approved')
        .map((m: any) => ({
          url: m.image_url,
          type: 'mockup',
          format: 'room_mockup',
          label: m.scene_type || 'Room Mockup',
        })),
    ];

    return {
      quote_id: quote.id,
      quote_preview: quote.quote_text.slice(0, 50) + '...',
      collection: quote.collection,
      
      // Copy for Ads Manager
      ad_copy: {
        title: copy.title,
        description: copy.description,
        destination_url: destinationUrl.toString(),
      },
      
      // All available images with direct URLs
      images,
      
      // Suggested targeting
      targeting_suggestions: {
        interests: getInterestsForCollection(quote.collection),
        keywords: copy.hashtags,
        demographics: 'Women 28-45',
      },
    };
  });

  return NextResponse.json({
    campaign_name,
    export_date: new Date().toISOString(),
    quotes: exports,
    
    // Summary for quick copy
    quick_copy: {
      all_image_urls: exports.flatMap(e => e.images.map(i => i.url)),
      destination_base: 'https://havenandhold.com/products/',
      utm_template: `?utm_source=${utm_source}&utm_medium=${utm_medium}&utm_campaign=[CAMPAIGN_NAME]`,
    },
  });
}

function getInterestsForCollection(collection: string): string[] {
  const base = [
    'Home decor',
    'Interior design',
    'Minimalism',
    'Wall art',
    'Mental health awareness',
    'Self-care',
    'Wellness',
  ];

  const specific: Record<string, string[]> = {
    grounding: ['Anxiety relief', 'Meditation', 'Mindfulness', 'Stress relief'],
    wholeness: ['Self-love', 'Body positivity', 'Therapy', 'Healing'],
    growth: ['Personal development', 'Life coaching', 'Motivation', 'Journaling'],
  };

  return [...base, ...(specific[collection] || [])];
}
```

### UI: Export Dialog

```tsx
// Component for exporting to ads
export function ExportForAds({ selectedQuotes }: { selectedQuotes: string[] }) {
  const [exportData, setExportData] = useState<any>(null);

  const handleExport = async () => {
    const res = await fetch('/api/pinterest/export-for-ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        quote_ids: selectedQuotes,
        campaign_name: 'Q1 2025 Launch',
      }),
    });
    const data = await res.json();
    setExportData(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleExport}>Export for Pinterest Ads</Button>

      {exportData && (
        <div className="space-y-6">
          {exportData.quotes.map((q: any) => (
            <div key={q.quote_id} className="border rounded-lg p-4">
              <h3 className="font-medium">{q.quote_preview}</h3>
              
              {/* Copy buttons for each field */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(q.ad_copy.title)}
                >
                  Copy Title
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(q.ad_copy.description)}
                >
                  Copy Description
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(q.ad_copy.destination_url)}
                >
                  Copy URL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(q.images.map((i: any) => i.url).join('\n'))}
                >
                  Copy All Image URLs
                </Button>
              </div>

              {/* Image previews */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {q.images.map((img: any, i: number) => (
                  <div key={i} className="relative group">
                    <img src={img.url} alt={img.label} className="rounded" />
                    <Button
                      size="sm"
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100"
                      onClick={() => copyToClipboard(img.url)}
                    >
                      Copy URL
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

# PROMPT 7: A/B Test Tracker

## Context

Track creative and audience A/B tests run in Pinterest Ads Manager, with results logged back to Haven Hub for analysis and learning.

## Database Schema

```sql
CREATE TABLE pinterest_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  test_type TEXT NOT NULL, -- 'creative', 'audience', 'copy', 'landing_page'
  status TEXT DEFAULT 'running', -- running, completed, paused
  
  -- Test configuration
  hypothesis TEXT,
  variants JSONB NOT NULL, -- Array of variant configs
  
  -- External references
  pinterest_campaign_id TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  
  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  min_sample_size INT DEFAULT 1000,
  
  -- Results
  results JSONB, -- Stored when test completes
  winner_variant TEXT,
  confidence_level DECIMAL,
  
  -- Metadata
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_status ON pinterest_ab_tests(status);
CREATE INDEX idx_ab_tests_campaign ON pinterest_ab_tests(campaign_id);
```

## Implementation

### File: `app/api/pinterest/ab-tests/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

// GET: List all A/B tests
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  
  const supabase = getSupabaseAdmin();
  
  let query = supabase
    .from('pinterest_ab_tests')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ tests: data });
}

// POST: Create new A/B test
export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('pinterest_ab_tests')
    .insert({
      name: body.name,
      test_type: body.test_type,
      hypothesis: body.hypothesis,
      variants: body.variants,
      pinterest_campaign_id: body.pinterest_campaign_id,
      campaign_id: body.campaign_id,
      min_sample_size: body.min_sample_size || 1000,
      notes: body.notes,
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ test: data });
}
```

### File: `app/api/pinterest/ab-tests/[id]/results/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

// POST: Log test results
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const supabase = getSupabaseAdmin();
  
  // Calculate winner and confidence
  const { variants, winner, confidence } = analyzeResults(body.variant_results);
  
  const { data, error } = await supabase
    .from('pinterest_ab_tests')
    .update({
      status: body.status || 'completed',
      ended_at: body.status === 'completed' ? new Date().toISOString() : null,
      results: {
        variant_results: body.variant_results,
        total_impressions: body.total_impressions,
        total_clicks: body.total_clicks,
        total_conversions: body.total_conversions,
        analysis: variants,
      },
      winner_variant: winner,
      confidence_level: confidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // If we have a clear winner, send email notification
  if (winner && confidence >= 0.95) {
    await sendNotificationEmail({
      to: 'hello@havenandhold.com',
      subject: `🏆 A/B Test Winner: ${data.name}`,
      html: `
        <h2>A/B Test Complete</h2>
        <p><strong>Test:</strong> ${data.name}</p>
        <p><strong>Winner:</strong> Variant ${winner}</p>
        <p><strong>Confidence:</strong> ${(confidence * 100).toFixed(1)}%</p>
        <p><a href="https://hub.havenandhold.com/pinterest/ab-tests/${params.id}">View full results →</a></p>
      `,
    });
  }
  
  return NextResponse.json({ test: data });
}

function analyzeResults(variantResults: any[]) {
  // Simple analysis - in production, use proper statistical testing
  let best = { variant: '', conversionRate: 0 };
  
  const analyzed = variantResults.map(v => {
    const conversionRate = v.conversions / v.impressions;
    const ctr = v.clicks / v.impressions;
    
    if (conversionRate > best.conversionRate) {
      best = { variant: v.name, conversionRate };
    }
    
    return {
      ...v,
      conversion_rate: conversionRate,
      ctr,
    };
  });
  
  // Calculate rough confidence (simplified)
  const sortedByConversion = [...analyzed].sort(
    (a, b) => b.conversion_rate - a.conversion_rate
  );
  
  const improvement = sortedByConversion[0]?.conversion_rate / 
    (sortedByConversion[1]?.conversion_rate || 0.001);
  
  // Rough confidence estimate based on sample size and improvement
  const minImpressions = Math.min(...variantResults.map(v => v.impressions));
  const confidence = Math.min(
    0.99,
    0.5 + (improvement - 1) * 0.3 + Math.log10(minImpressions) * 0.05
  );
  
  return {
    variants: analyzed,
    winner: best.variant,
    confidence,
  };
}
```

---

# PROMPT 8: Performance Alerts (Email)

## Context

Automated email notifications to hello@havenandhold.com for Pinterest performance events—winners, issues, milestones.

## Resend Setup Instructions

### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com) and sign up
2. Free tier includes 3,000 emails/month (plenty for notifications)

### Step 2: Add & Verify Domain
1. In Resend dashboard → Domains → Add Domain
2. Add `havenandhold.com`
3. Add the DNS records Resend provides:
   - SPF record (TXT)
   - DKIM records (TXT)
   - Usually takes 5-15 minutes to verify

### Step 3: Create API Key
1. Resend dashboard → API Keys → Create API Key
2. Name it "Haven Hub Notifications"
3. Copy the key (starts with `re_`)

### Step 4: Add Environment Variable
```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Add to Vercel
1. Vercel dashboard → Your project → Settings → Environment Variables
2. Add `RESEND_API_KEY` for Production, Preview, and Development

## Email Helper Function

### File: `lib/integrations/email.ts`

```typescript
/**
 * Email notification helper for system alerts
 * Uses Resend for transactional email delivery
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const NOTIFICATION_EMAIL = 'hello@havenandhold.com';
const FROM_EMAIL = 'Haven Hub <notifications@havenandhold.com>';

interface NotificationEmailParams {
  to?: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendNotificationEmail(params: NotificationEmailParams) {
  const { to = NOTIFICATION_EMAIL, subject, html, text } = params;

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email notification');
    console.log('Would have sent:', { to, subject });
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    });

    if (error) {
      console.error('Failed to send notification email:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Email send error:', err);
    // Don't throw - notifications shouldn't break the main flow
    return null;
  }
}

// Send digest email (batches multiple alerts)
export async function sendDigestEmail(params: {
  subject: string;
  sections: Array<{ title: string; items: string[] }>;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #5F9EA0; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 16px; font-weight: 600; color: #36454F; margin-bottom: 8px; }
        .item { padding: 8px 0; border-bottom: 1px solid #eee; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
        a { color: #5F9EA0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #36454F;">Haven Hub</h1>
        </div>
        ${params.sections.map(section => `
          <div class="section">
            <div class="section-title">${section.title}</div>
            ${section.items.map(item => `<div class="item">${item}</div>`).join('')}
          </div>
        `).join('')}
        <div class="footer">
          <a href="https://hub.havenandhold.com">Open Haven Hub</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendNotificationEmail({
    subject: params.subject,
    html,
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Package Installation

```bash
npm install resend
```

## Implementation

### File: `lib/pinterest/alerts.ts`

```typescript
import { sendNotificationEmail } from '@/lib/integrations/email';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

const NOTIFICATION_EMAIL = 'hello@havenandhold.com';

interface AlertConfig {
  // Thresholds
  highEngagementRate: number; // e.g., 0.05 (5%)
  lowEngagementRate: number;  // e.g., 0.01 (1%)
  impressionMilestones: number[]; // e.g., [1000, 5000, 10000]
  conversionMilestones: number[]; // e.g., [10, 50, 100]
}

const DEFAULT_CONFIG: AlertConfig = {
  highEngagementRate: 0.05,
  lowEngagementRate: 0.01,
  impressionMilestones: [1000, 5000, 10000, 50000],
  conversionMilestones: [10, 50, 100, 500],
};

export async function checkPinPerformance(config = DEFAULT_CONFIG) {
  const supabase = getSupabaseAdmin();
  const alerts: string[] = [];

  // Get recent pins with performance data
  const { data: pins } = await supabase
    .from('scheduled_pins')
    .select('*, performance_metrics')
    .eq('status', 'published')
    .not('performance_metrics', 'is', null)
    .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!pins?.length) return;

  for (const pin of pins) {
    const metrics = pin.performance_metrics;
    if (!metrics) continue;

    const engagementRate = metrics.engagement_rate / 100;

    // High performer alert
    if (engagementRate >= config.highEngagementRate) {
      alerts.push(`🔥 *High Performer*: Pin ${pin.id.slice(0, 8)} has ${(engagementRate * 100).toFixed(2)}% engagement`);
    }

    // Low performer alert
    if (metrics.impressions > 500 && engagementRate <= config.lowEngagementRate) {
      alerts.push(`⚠️ *Low Performer*: Pin ${pin.id.slice(0, 8)} has only ${(engagementRate * 100).toFixed(2)}% engagement after ${metrics.impressions} impressions`);
    }

    // Milestone alerts
    for (const milestone of config.impressionMilestones) {
      if (metrics.impressions >= milestone && 
          (!metrics.last_milestone || metrics.last_milestone < milestone)) {
        alerts.push(`🎯 *Milestone*: Pin ${pin.id.slice(0, 8)} reached ${milestone.toLocaleString()} impressions!`);
        
        // Update last milestone
        await supabase
          .from('scheduled_pins')
          .update({ 
            performance_metrics: { ...metrics, last_milestone: milestone } 
          })
          .eq('id', pin.id);
      }
    }
  }

  // Send consolidated email alert
  if (alerts.length > 0) {
    await sendNotificationEmail({
      to: 'hello@havenandhold.com',
      subject: '📊 Pinterest Performance Update',
      html: `
        <h2>Pinterest Performance Update</h2>
        <ul>${alerts.map(a => `<li>${a.replace(/\*/g, '')}</li>`).join('')}</ul>
        <p><a href="https://hub.havenandhold.com/pinterest/analytics">View full analytics →</a></p>
      `,
    });
  }
}

// Run daily after insights fetch
export async function checkCampaignROAS() {
  const supabase = getSupabaseAdmin();

  // Get active campaigns with Pinterest content
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .not('metrics', 'is', null);

  const alerts: string[] = [];

  for (const campaign of campaigns || []) {
    const metrics = campaign.metrics;
    if (!metrics?.spend || !metrics?.revenue) continue;

    const roas = metrics.revenue / metrics.spend;

    if (roas >= 3) {
      alerts.push(`💰 *Campaign "${campaign.name}"*: ROAS is ${roas.toFixed(2)}x - consider scaling!`);
    } else if (roas < 1.5 && metrics.spend > 50) {
      alerts.push(`🚨 *Campaign "${campaign.name}"*: ROAS is only ${roas.toFixed(2)}x - review or pause`);
    }
  }

  if (alerts.length > 0) {
    await sendNotificationEmail({
      to: 'hello@havenandhold.com',
      subject: '💵 Campaign ROAS Alerts',
      html: `
        <h2>Campaign ROAS Alerts</h2>
        <ul>${alerts.map(a => `<li>${a.replace(/\*/g, '')}</li>`).join('')}</ul>
        <p><a href="https://hub.havenandhold.com/campaigns">View campaigns →</a></p>
      `,
    });
  }
}
```

### Add to insights cron: `app/api/cron/pinterest-insights/route.ts`

```typescript
// At the end of the insights cron:
import { checkPinPerformance, checkCampaignROAS } from '@/lib/pinterest/alerts';

// ... existing code ...

// After updating all insights:
await checkPinPerformance();
await checkCampaignROAS();
```

---

# PROMPT 9: Temporal Auto-Scheduler

## Context

Leverage the existing temporal rules engine to automatically schedule pins at optimal times based on segment, collection, and historical performance.

## Implementation

### File: `lib/pinterest/auto-scheduler.ts`

```typescript
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { getActiveTemporalRules, suggestOptimalTimes } from '@/lib/temporal/engine';

interface AutoScheduleConfig {
  quote_ids: string[];
  board_id: string;
  pins_per_day: number;
  days_ahead: number;
  respect_temporal_rules: boolean;
}

export async function autoSchedulePins(config: AutoScheduleConfig) {
  const supabase = getSupabaseAdmin();
  const {
    quote_ids,
    board_id,
    pins_per_day = 3,
    days_ahead = 14,
    respect_temporal_rules = true,
  } = config;

  // Get board segment for temporal matching
  const { data: board } = await supabase
    .from('pinterest_boards')
    .select('primary_segment')
    .eq('id', board_id)
    .single();

  // Get temporal rules for this segment
  const temporalRules = respect_temporal_rules
    ? await getActiveTemporalRules(board?.primary_segment)
    : [];

  // Calculate optimal posting slots for the next N days
  const slots = generateOptimalSlots({
    daysAhead: days_ahead,
    pinsPerDay: pins_per_day,
    temporalRules,
    segment: board?.primary_segment,
  });

  // Get approved assets for the quotes
  const { data: assets } = await supabase
    .from('generated_assets')
    .select(`
      *,
      quotes (id, quote_text, collection, mood)
    `)
    .in('quote_id', quote_ids)
    .in('format', ['pinterest_portrait', 'pinterest_square'])
    .eq('approval_status', 'approved');

  if (!assets?.length) {
    return { success: false, error: 'No approved assets found' };
  }

  // Match assets to slots based on temporal rules
  const scheduledPins = [];
  let assetIndex = 0;

  for (const slot of slots) {
    if (assetIndex >= assets.length) {
      assetIndex = 0; // Cycle through assets
    }

    const asset = assets[assetIndex];
    const quote = asset.quotes;

    // Check if this asset matches the slot's temporal preferences
    if (respect_temporal_rules && slot.preferredMoods?.length) {
      // Try to find a better match
      const betterMatch = assets.find(a => 
        slot.preferredMoods.includes(a.quotes.mood) ||
        slot.preferredCollections?.includes(a.quotes.collection)
      );
      if (betterMatch) {
        asset = betterMatch;
      }
    }

    scheduledPins.push({
      board_id,
      quote_id: quote.id,
      asset_id: asset.id,
      scheduled_at: slot.datetime,
      temporal_rule_id: slot.ruleId,
    });

    assetIndex++;
  }

  // Insert all scheduled pins
  const { data: inserted, error } = await supabase
    .from('scheduled_pins')
    .insert(
      scheduledPins.map(pin => ({
        board_id: pin.board_id,
        image_url: assets.find(a => a.id === pin.asset_id)?.cloudinary_url,
        title: '', // Will be generated by copy generator
        description: '',
        scheduled_at: pin.scheduled_at,
        status: 'scheduled',
        source_id: pin.asset_id,
        quote_id: pin.quote_id,
        metadata: { temporal_rule_id: pin.temporal_rule_id },
      }))
    )
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  // Generate copy for all scheduled pins
  await generateCopyForScheduledPins(inserted.map(p => p.id));

  return {
    success: true,
    scheduled: inserted.length,
    date_range: {
      start: slots[0]?.datetime,
      end: slots[slots.length - 1]?.datetime,
    },
  };
}

interface TimeSlot {
  datetime: Date;
  ruleId?: string;
  preferredMoods?: string[];
  preferredCollections?: string[];
}

function generateOptimalSlots(config: {
  daysAhead: number;
  pinsPerDay: number;
  temporalRules: any[];
  segment?: string;
}): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();

  // Pinterest optimal hours (based on general best practices)
  const defaultOptimalHours = [8, 12, 20, 21]; // 8am, noon, 8pm, 9pm

  for (let day = 0; day < config.daysAhead; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    // Check for temporal rules matching this day
    const dayOfWeek = date.getDay();
    const matchingRules = config.temporalRules.filter(rule => {
      if (rule.trigger_type === 'day_of_week') {
        return rule.trigger_config.days?.includes(dayOfWeek);
      }
      return false;
    });

    // Generate slots for this day
    const hoursToUse = matchingRules.length > 0
      ? matchingRules[0].trigger_config.hours || defaultOptimalHours
      : defaultOptimalHours;

    for (let i = 0; i < config.pinsPerDay && i < hoursToUse.length; i++) {
      const slotDate = new Date(date);
      slotDate.setHours(hoursToUse[i], 0, 0, 0);

      slots.push({
        datetime: slotDate,
        ruleId: matchingRules[0]?.id,
        preferredMoods: matchingRules[0]?.preferred_moods,
        preferredCollections: matchingRules[0]?.preferred_collections,
      });
    }
  }

  return slots.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
}

async function generateCopyForScheduledPins(pinIds: string[]) {
  // Call the copy generator API for each pin
  // ... implementation
}
```

---

# PROMPT 10: Winner Refresh System

## Context

Automatically create new variations of top-performing pins to extend their success while maintaining freshness.

## Implementation

### File: `app/api/cron/pinterest-winner-refresh/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { generateMockupsForQuote } from '@/lib/design-engine/mockup-generator';
import { generatePinCopy } from '@/lib/pinterest/copy-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Run weekly on Mondays
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const results = { refreshed: 0, errors: [] as string[] };

  try {
    // Find top performers from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: topPins } = await supabase
      .from('scheduled_pins')
      .select(`
        *,
        quotes (id, quote_text, collection, mood)
      `)
      .eq('status', 'published')
      .gte('published_at', thirtyDaysAgo.toISOString())
      .not('performance_metrics', 'is', null)
      .order('performance_metrics->engagement_rate', { ascending: false })
      .limit(5);

    if (!topPins?.length) {
      return NextResponse.json({ message: 'No top performers found' });
    }

    for (const pin of topPins) {
      const engagementRate = pin.performance_metrics?.engagement_rate || 0;
      
      // Only refresh if engagement rate > 3%
      if (engagementRate < 3) continue;

      try {
        // Option 1: Generate new mockups with different scenes
        const quote = pin.quotes;
        const existingMockups = await supabase
          .from('mockup_uploads')
          .select('scene_type')
          .eq('quote_id', quote.id);

        const usedScenes = existingMockups.data?.map(m => m.scene_type) || [];
        
        // If we haven't used all scene types, generate more
        const allScenes = ['bedroom', 'therapy_office', 'living_room', 'reading_nook', 'home_office'];
        const unusedScenes = allScenes.filter(s => !usedScenes.includes(s));

        if (unusedScenes.length > 0) {
          // Generate new mockup with unused scene
          // This would require Dynamic Mockups to support specific scene selection
          // For now, regenerate all and the new ones will be added
          await generateMockupsForQuote(quote.id, pin.image_url);
        }

        // Option 2: Generate fresh copy variation
        const newCopy = generatePinCopy({
          quote_text: quote.quote_text,
          collection: quote.collection,
          mood: quote.mood,
          product_version: 'minimal',
        });

        // Create new scheduled pin with fresh copy
        await supabase.from('scheduled_pins').insert({
          board_id: pin.board_id,
          image_url: pin.image_url, // Same image, new copy
          title: newCopy.title,
          description: newCopy.description,
          link: pin.link,
          scheduled_at: getNextOptimalSlot(),
          status: 'scheduled',
          source_id: pin.source_id,
          quote_id: quote.id,
          metadata: {
            refresh_of: pin.id,
            original_engagement: engagementRate,
          },
        });

        results.refreshed++;

      } catch (err) {
        results.errors.push(`Failed to refresh pin ${pin.id}: ${err}`);
      }
    }

    // Notify via email
    if (results.refreshed > 0) {
      await sendNotificationEmail({
        to: 'hello@havenandhold.com',
        subject: `🔄 Winner Refresh: ${results.refreshed} pins refreshed`,
        html: `
          <h2>Top Performer Refresh Complete</h2>
          <p>Created ${results.refreshed} new variations of your top-performing pins.</p>
          <p><a href="https://hub.havenandhold.com/pinterest/scheduled">View scheduled pins →</a></p>
        `,
      });
    }

    return NextResponse.json({ success: true, ...results });

  } catch (error) {
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

function getNextOptimalSlot(): Date {
  // Return next optimal posting time (e.g., tomorrow at 8pm)
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(20, 0, 0, 0);
  return date;
}
```

### Update: `vercel.json`

```json
{
  "path": "/api/cron/pinterest-winner-refresh",
  "schedule": "0 9 * * 1"
}
```

---

# PROMPT 11: Master File Upload to Design Engine

## Context

Currently, the Design Engine generates assets from quote text input. This prompt adds the ability to upload an existing master design file (from Figma, Canva, Photoshop, etc.) and have the system generate all derivative assets: print sizes, social formats, and mockups.

This is useful when:
- You've manually designed a quote in Figma/Canva
- You're importing designs from freelancers
- You have existing designs from before Haven Hub
- The AI-generated designs need manual refinement

## Database Updates

```sql
-- Add source tracking to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'generated';
-- Values: 'generated' (from Design Engine), 'uploaded' (master file upload)

-- Add master file tracking
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS master_file_url TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS master_file_metadata JSONB DEFAULT '{}';
-- Metadata: { original_filename, file_size, dimensions, uploaded_at, uploaded_by }
```

## Implementation

### File: `app/api/design-engine/upload-master/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { uploadToCloudinary } from '@/lib/integrations/cloudinary';
import { generateDerivativeAssets } from '@/lib/design-engine/derivative-generator';
import { generateMockupsForQuote } from '@/lib/design-engine/mockup-generator';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const quoteText = formData.get('quote_text') as string;
  const mantraText = formData.get('mantra_text') as string | null;
  const collection = formData.get('collection') as string;
  const mood = formData.get('mood') as string;
  const productVersion = formData.get('product_version') as 'minimal' | 'full_mantra';

  if (!file || !quoteText || !collection) {
    return NextResponse.json(
      { error: 'file, quote_text, and collection are required' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    // 1. Validate file
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Could not read image dimensions' },
        { status: 400 }
      );
    }

    // Validate minimum size (should be at least 3000px on shortest side for print)
    const minDimension = Math.min(metadata.width, metadata.height);
    if (minDimension < 3000) {
      return NextResponse.json({
        error: `Image too small. Minimum 3000px required, got ${minDimension}px`,
        suggestion: 'Upload a higher resolution file or upscale before uploading',
      }, { status: 400 });
    }

    // 2. Upload master to Cloudinary
    const masterUrl = await uploadToCloudinary(buffer, {
      folder: 'haven-hold/masters',
      resource_type: 'image',
      format: 'png',
      quality: 100,
    });

    // 3. Create quote record
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_text: quoteText,
        mantra_text: mantraText,
        collection,
        mood: mood || 'calm',
        source_type: 'uploaded',
        master_file_url: masterUrl,
        master_file_metadata: {
          original_filename: file.name,
          file_size: file.size,
          dimensions: { width: metadata.width, height: metadata.height },
          format: metadata.format,
          uploaded_at: new Date().toISOString(),
        },
        status: 'generating',
        generate_minimal: productVersion === 'minimal',
        generate_full_mantra: productVersion === 'full_mantra',
      })
      .select()
      .single();

    if (quoteError) throw quoteError;

    // 4. Generate derivative assets in background
    // This runs async - user doesn't wait
    generateDerivativesAsync(quote.id, masterUrl, metadata);

    return NextResponse.json({
      success: true,
      quote_id: quote.id,
      message: 'Master uploaded. Generating derivatives...',
      master_url: masterUrl,
      dimensions: { width: metadata.width, height: metadata.height },
    });

  } catch (error) {
    console.error('Master upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

async function generateDerivativesAsync(
  quoteId: string,
  masterUrl: string,
  metadata: sharp.Metadata
) {
  const supabase = getSupabaseAdmin();

  try {
    // Generate all print sizes
    const printAssets = await generateDerivativeAssets(quoteId, masterUrl, {
      sourceWidth: metadata.width!,
      sourceHeight: metadata.height!,
    });

    // Generate social assets
    const socialAssets = await generateSocialFromMaster(quoteId, masterUrl, metadata);

    // Generate mockups
    const mockups = await generateMockupsForQuote(quoteId, masterUrl);

    // Update quote status
    await supabase
      .from('quotes')
      .update({ status: 'review' })
      .eq('id', quoteId);

    // Send notification
    await sendNotificationEmail({
      to: 'hello@havenandhold.com',
      subject: `✅ Master Upload Complete: ${printAssets.length + socialAssets.length} assets generated`,
      html: `
        <h2>Master File Processing Complete</h2>
        <p><strong>Quote ID:</strong> ${quoteId}</p>
        <p><strong>Assets Generated:</strong></p>
        <ul>
          <li>Print sizes: ${printAssets.length}</li>
          <li>Social formats: ${socialAssets.length}</li>
          <li>Room mockups: ${mockups.mockups.length}</li>
        </ul>
        <p><a href="https://hub.havenandhold.com/design-engine/review/${quoteId}">Review assets →</a></p>
      `,
    });

  } catch (error) {
    console.error('Derivative generation failed:', error);
    
    await supabase
      .from('quotes')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Generation failed',
      })
      .eq('id', quoteId);

    await sendNotificationEmail({
      to: 'hello@havenandhold.com',
      subject: `❌ Master Upload Failed: ${quoteId}`,
      html: `
        <h2>Asset Generation Failed</h2>
        <p><strong>Quote ID:</strong> ${quoteId}</p>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p><a href="https://hub.havenandhold.com/design-engine/quotes/${quoteId}">View quote →</a></p>
      `,
    });
  }
}
```

### File: `lib/design-engine/derivative-generator.ts`

```typescript
/**
 * Generate derivative print sizes from a master file
 * Handles cropping, resizing, and format conversion
 */

import sharp from 'sharp';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { uploadToCloudinary } from '@/lib/integrations/cloudinary';
import JSZip from 'jszip';

interface DerivativeConfig {
  sourceWidth: number;
  sourceHeight: number;
}

// All print sizes to generate
const PRINT_SIZES = {
  '2x3': [
    { name: '4x6', width: 1200, height: 1800 },
    { name: '8x12', width: 2400, height: 3600 },
    { name: '12x18', width: 3600, height: 5400 },
    { name: '16x24', width: 4800, height: 7200 },
    { name: '20x30', width: 6000, height: 9000 },
    { name: '24x36', width: 7200, height: 10800 },
  ],
  '3x4': [
    { name: '6x8', width: 1800, height: 2400 },
    { name: '9x12', width: 2700, height: 3600 },
    { name: '12x16', width: 3600, height: 4800 },
    { name: '18x24', width: 5400, height: 7200 },
  ],
  '4x5': [
    { name: '4x5', width: 1200, height: 1500 },
    { name: '8x10', width: 2400, height: 3000 },
    { name: '11x14', width: 3300, height: 4200 },
    { name: '16x20', width: 4800, height: 6000 },
  ],
  'iso': [
    { name: 'A4', width: 2480, height: 3508 },
    { name: 'A3', width: 3508, height: 4960 },
    { name: 'A2', width: 4960, height: 7016 },
  ],
};

const SOCIAL_SIZES = [
  { name: 'pinterest_portrait', width: 1000, height: 1500, format: 'pinterest_portrait' },
  { name: 'pinterest_square', width: 1000, height: 1000, format: 'pinterest_square' },
  { name: 'instagram_post', width: 1080, height: 1080, format: 'instagram_post' },
  { name: 'instagram_story', width: 1080, height: 1920, format: 'instagram_story' },
];

export async function generateDerivativeAssets(
  quoteId: string,
  masterUrl: string,
  config: DerivativeConfig
): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const generatedAssets: any[] = [];

  // Download master image
  const masterResponse = await fetch(masterUrl);
  const masterBuffer = Buffer.from(await masterResponse.arrayBuffer());

  // Determine source aspect ratio
  const sourceRatio = config.sourceWidth / config.sourceHeight;

  // Generate each ratio's sizes
  for (const [ratioName, sizes] of Object.entries(PRINT_SIZES)) {
    const zip = new JSZip();

    for (const size of sizes) {
      const targetRatio = size.width / size.height;

      // Calculate crop dimensions to match target ratio
      let cropWidth = config.sourceWidth;
      let cropHeight = config.sourceHeight;

      if (sourceRatio > targetRatio) {
        // Source is wider - crop sides
        cropWidth = Math.round(config.sourceHeight * targetRatio);
      } else {
        // Source is taller - crop top/bottom
        cropHeight = Math.round(config.sourceWidth / targetRatio);
      }

      // Generate resized image
      const resized = await sharp(masterBuffer)
        .extract({
          left: Math.round((config.sourceWidth - cropWidth) / 2),
          top: Math.round((config.sourceHeight - cropHeight) / 2),
          width: cropWidth,
          height: cropHeight,
        })
        .resize(size.width, size.height, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
        .jpeg({ quality: 95 })
        .toBuffer();

      // Add to ZIP
      zip.file(`${size.name}.jpg`, resized);
    }

    // Generate ZIP and upload
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipUrl = await uploadToCloudinary(zipBuffer, {
      folder: `haven-hold/print-packages/${quoteId}`,
      resource_type: 'raw',
      public_id: `${ratioName}_package`,
      format: 'zip',
    });

    // Record in database
    const { data: asset } = await supabase
      .from('generated_assets')
      .insert({
        quote_id: quoteId,
        format: `print_${ratioName.replace('x', '')}`,
        cloudinary_url: zipUrl,
        approval_status: 'pending',
        metadata: {
          type: 'print_package',
          ratio: ratioName,
          sizes: sizes.map(s => s.name),
          file_count: sizes.length,
        },
      })
      .select()
      .single();

    if (asset) generatedAssets.push(asset);
  }

  return generatedAssets;
}

export async function generateSocialFromMaster(
  quoteId: string,
  masterUrl: string,
  metadata: sharp.Metadata
): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  const generatedAssets: any[] = [];

  const masterResponse = await fetch(masterUrl);
  const masterBuffer = Buffer.from(await masterResponse.arrayBuffer());

  for (const social of SOCIAL_SIZES) {
    const targetRatio = social.width / social.height;
    const sourceRatio = metadata.width! / metadata.height!;

    let cropWidth = metadata.width!;
    let cropHeight = metadata.height!;

    if (sourceRatio > targetRatio) {
      cropWidth = Math.round(metadata.height! * targetRatio);
    } else {
      cropHeight = Math.round(metadata.width! / targetRatio);
    }

    const resized = await sharp(masterBuffer)
      .extract({
        left: Math.round((metadata.width! - cropWidth) / 2),
        top: Math.round((metadata.height! - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
      })
      .resize(social.width, social.height, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();

    const url = await uploadToCloudinary(resized, {
      folder: `haven-hold/social/${quoteId}`,
      public_id: social.name,
    });

    const { data: asset } = await supabase
      .from('generated_assets')
      .insert({
        quote_id: quoteId,
        format: social.format as any,
        cloudinary_url: url,
        approval_status: 'pending',
        metadata: {
          type: 'social',
          dimensions: { width: social.width, height: social.height },
        },
      })
      .select()
      .single();

    if (asset) generatedAssets.push(asset);
  }

  return generatedAssets;
}
```

### UI Component: `app/(admin)/design-engine/upload/page.tsx`

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Image, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadMasterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    quote_text: '',
    mantra_text: '',
    collection: 'grounding',
    mood: 'calm',
    product_version: 'minimal',
  });
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/tiff': ['.tiff', '.tif'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleSubmit = async () => {
    if (!file || !formData.quote_text) return;

    setUploading(true);
    setResult(null);

    const data = new FormData();
    data.append('file', file);
    data.append('quote_text', formData.quote_text);
    data.append('mantra_text', formData.mantra_text);
    data.append('collection', formData.collection);
    data.append('mood', formData.mood);
    data.append('product_version', formData.product_version);

    try {
      const res = await fetch('/api/design-engine/upload-master', {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ error: 'Upload failed' });
    }

    setUploading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Upload Master Design</h1>
      <p className="text-gray-600 mb-8">
        Upload an existing design file to generate all print sizes, social formats, and room mockups.
      </p>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-gray-400'}
          ${preview ? 'border-solid' : ''}`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="space-y-4">
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded" />
            <p className="text-sm text-gray-600">{file?.name}</p>
            <Button variant="outline" size="sm">Replace file</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <p className="text-gray-600">
              {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-sm text-gray-400">
              PNG, JPG, or TIFF • Min 3000px • Max 100MB
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Quote Text *</label>
          <Textarea
            value={formData.quote_text}
            onChange={(e) => setFormData({ ...formData, quote_text: e.target.value })}
            placeholder="Enter the quote text..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mantra Text (optional)</label>
          <Input
            value={formData.mantra_text}
            onChange={(e) => setFormData({ ...formData, mantra_text: e.target.value })}
            placeholder="Companion mantra..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Collection *</label>
            <Select
              value={formData.collection}
              onValueChange={(v) => setFormData({ ...formData, collection: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grounding">Grounding</SelectItem>
                <SelectItem value="wholeness">Wholeness</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mood</label>
            <Select
              value={formData.mood}
              onValueChange={(v) => setFormData({ ...formData, mood: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calm">Calm</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hopeful">Hopeful</SelectItem>
                <SelectItem value="reflective">Reflective</SelectItem>
                <SelectItem value="empowering">Empowering</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product Version</label>
          <Select
            value={formData.product_version}
            onValueChange={(v) => setFormData({ ...formData, product_version: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal (quote only)</SelectItem>
              <SelectItem value="full_mantra">Full Mantra (quote + mantra)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!file || !formData.quote_text || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading & Processing...' : 'Upload & Generate Assets'}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          {result.success ? (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Upload successful!</p>
                <p className="text-sm text-green-700 mt-1">{result.message}</p>
                <a
                  href={`/design-engine/review/${result.quote_id}`}
                  className="text-sm text-teal-600 hover:underline mt-2 inline-block"
                >
                  View in review queue →
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Upload failed</p>
                <p className="text-sm text-red-700 mt-1">{result.error}</p>
                {result.suggestion && (
                  <p className="text-sm text-red-600 mt-1">{result.suggestion}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Package Installation

```bash
npm install react-dropzone
```

---

# PROMPT 12: Pinterest Conversion API (Event Forwarding)

## Context

Pinterest's Conversion API allows server-side event tracking, improving attribution accuracy (especially with iOS privacy changes) and enabling better ad optimization.

Haven Hub already tracks events in `tracking_events`. This prompt forwards relevant events to Pinterest.

## Implementation

### File: `lib/integrations/pinterest-conversions.ts`

```typescript
/**
 * Pinterest Conversions API
 * Server-side event forwarding for improved attribution
 * Docs: https://developers.pinterest.com/docs/conversions/conversions/
 */

import crypto from 'crypto';

const PINTEREST_API_URL = 'https://api.pinterest.com/v5/ad_accounts';

interface PinterestEvent {
  event_name: 'page_visit' | 'search' | 'view_category' | 'add_to_cart' | 'checkout' | 'lead' | 'signup' | 'custom';
  action_source: 'web' | 'app_android' | 'app_ios' | 'offline';
  event_time: number; // Unix timestamp
  event_id: string; // Unique event ID for deduplication
  event_source_url?: string;
  user_data: {
    em?: string[]; // Hashed emails
    ph?: string[]; // Hashed phone numbers
    client_ip_address?: string;
    client_user_agent?: string;
    click_id?: string; // Pinterest click ID from URL params
    external_id?: string[]; // Your user ID, hashed
  };
  custom_data?: {
    currency?: string;
    value?: string;
    content_ids?: string[];
    content_name?: string;
    content_category?: string;
    num_items?: number;
    order_id?: string;
  };
}

class PinterestConversionsClient {
  private accessToken: string;
  private adAccountId: string;

  constructor() {
    this.accessToken = process.env.PINTEREST_ACCESS_TOKEN!;
    this.adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID!;
  }

  private hashValue(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value.toLowerCase().trim())
      .digest('hex');
  }

  async sendEvent(event: PinterestEvent): Promise<boolean> {
    if (!this.accessToken || !this.adAccountId) {
      console.warn('Pinterest Conversions API not configured');
      return false;
    }

    try {
      const response = await fetch(
        `${PINTEREST_API_URL}/${this.adAccountId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [event],
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Pinterest Conversions API error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Pinterest Conversions API error:', error);
      return false;
    }
  }

  // Helper methods for common events
  async trackLead(params: {
    email: string;
    eventId: string;
    sourceUrl: string;
    clickId?: string;
    ipAddress?: string;
    userAgent?: string;
    leadType?: string;
  }): Promise<boolean> {
    return this.sendEvent({
      event_name: 'lead',
      action_source: 'web',
      event_time: Math.floor(Date.now() / 1000),
      event_id: params.eventId,
      event_source_url: params.sourceUrl,
      user_data: {
        em: [this.hashValue(params.email)],
        click_id: params.clickId,
        client_ip_address: params.ipAddress,
        client_user_agent: params.userAgent,
      },
      custom_data: {
        content_category: params.leadType || 'quiz_completion',
      },
    });
  }

  async trackPurchase(params: {
    email: string;
    eventId: string;
    orderId: string;
    value: number;
    currency: string;
    productIds: string[];
    clickId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<boolean> {
    return this.sendEvent({
      event_name: 'checkout',
      action_source: 'web',
      event_time: Math.floor(Date.now() / 1000),
      event_id: params.eventId,
      user_data: {
        em: [this.hashValue(params.email)],
        click_id: params.clickId,
        client_ip_address: params.ipAddress,
        client_user_agent: params.userAgent,
      },
      custom_data: {
        currency: params.currency,
        value: params.value.toString(),
        content_ids: params.productIds,
        order_id: params.orderId,
        num_items: params.productIds.length,
      },
    });
  }

  async trackAddToCart(params: {
    email?: string;
    eventId: string;
    productId: string;
    productName: string;
    value: number;
    currency: string;
    clickId?: string;
  }): Promise<boolean> {
    return this.sendEvent({
      event_name: 'add_to_cart',
      action_source: 'web',
      event_time: Math.floor(Date.now() / 1000),
      event_id: params.eventId,
      user_data: {
        em: params.email ? [this.hashValue(params.email)] : undefined,
        click_id: params.clickId,
      },
      custom_data: {
        currency: params.currency,
        value: params.value.toString(),
        content_ids: [params.productId],
        content_name: params.productName,
        num_items: 1,
      },
    });
  }
}

export const pinterestConversions = new PinterestConversionsClient();
```

### Integration: Add to existing event handlers

```typescript
// In lib/tracking/events.ts or wherever events are processed

import { pinterestConversions } from '@/lib/integrations/pinterest-conversions';

// After quiz completion
export async function onQuizCompleted(lead: Lead, attribution: Attribution) {
  // Existing Klaviyo event...
  
  // Forward to Pinterest if came from Pinterest
  if (attribution.utm_source === 'pinterest' || attribution.click_id?.startsWith('epik_')) {
    await pinterestConversions.trackLead({
      email: lead.email,
      eventId: `quiz_${lead.id}`,
      sourceUrl: attribution.landing_page || '',
      clickId: attribution.click_id,
      leadType: 'quiz_completion',
    });
  }
}

// After purchase (in Shopify webhook handler)
export async function onOrderCreated(order: ShopifyOrder, lead?: Lead) {
  // Existing processing...
  
  // Forward to Pinterest
  if (lead) {
    const attribution = await getLeadAttribution(lead.id);
    
    if (attribution?.utm_source === 'pinterest') {
      await pinterestConversions.trackPurchase({
        email: order.email,
        eventId: `order_${order.id}`,
        orderId: order.order_number.toString(),
        value: parseFloat(order.total_price),
        currency: order.currency,
        productIds: order.line_items.map(li => li.product_id.toString()),
        clickId: attribution.click_id,
      });
    }
  }
}
```

### Environment Variables

```bash
PINTEREST_AD_ACCOUNT_ID=your-ad-account-id
```

---

# PROMPT 13: Smart Budget Recommendations

## Context

Based on campaign performance data, automatically generate budget adjustment recommendations.

## Implementation

### File: `lib/pinterest/budget-recommendations.ts`

```typescript
/**
 * Analyze campaign performance and generate budget recommendations
 */

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { sendNotificationEmail } from '@/lib/integrations/email';

interface BudgetRecommendation {
  campaign_id: string;
  campaign_name: string;
  current_daily_budget: number;
  recommended_daily_budget: number;
  change_percent: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  action: 'increase' | 'decrease' | 'pause' | 'maintain';
}

interface PerformanceThresholds {
  // ROAS thresholds
  roas_scale: number;      // Above this = scale (e.g., 3.0)
  roas_maintain: number;   // Above this = maintain (e.g., 2.0)
  roas_reduce: number;     // Above this = reduce (e.g., 1.5)
  // Below roas_reduce = pause
  
  // CPA thresholds (in dollars)
  cpa_excellent: number;   // Below this = scale aggressively
  cpa_good: number;        // Below this = scale moderately
  cpa_acceptable: number;  // Below this = maintain
  // Above cpa_acceptable = reduce or pause
  
  // Minimum data requirements
  min_spend: number;       // Minimum spend before making recommendations
  min_conversions: number; // Minimum conversions for statistical significance
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  roas_scale: 3.0,
  roas_maintain: 2.0,
  roas_reduce: 1.5,
  cpa_excellent: 8,
  cpa_good: 12,
  cpa_acceptable: 15,
  min_spend: 50,
  min_conversions: 5,
};

export async function generateBudgetRecommendations(
  thresholds = DEFAULT_THRESHOLDS
): Promise<BudgetRecommendation[]> {
  const supabase = getSupabaseAdmin();
  const recommendations: BudgetRecommendation[] = [];

  // Get active campaigns with performance data
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .not('metrics', 'is', null);

  if (!campaigns?.length) return recommendations;

  for (const campaign of campaigns) {
    const metrics = campaign.metrics;
    
    // Skip if insufficient data
    if (!metrics.spend || metrics.spend < thresholds.min_spend) {
      continue;
    }

    const spend = metrics.spend;
    const revenue = metrics.revenue || 0;
    const conversions = metrics.conversions || 0;
    const currentBudget = campaign.daily_budget || 10;

    // Calculate metrics
    const roas = spend > 0 ? revenue / spend : 0;
    const cpa = conversions > 0 ? spend / conversions : Infinity;

    let recommendation: BudgetRecommendation = {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      current_daily_budget: currentBudget,
      recommended_daily_budget: currentBudget,
      change_percent: 0,
      reason: '',
      confidence: 'low',
      action: 'maintain',
    };

    // Determine confidence based on data volume
    if (conversions >= 20 && spend >= 200) {
      recommendation.confidence = 'high';
    } else if (conversions >= thresholds.min_conversions && spend >= thresholds.min_spend) {
      recommendation.confidence = 'medium';
    }

    // Generate recommendation based on ROAS
    if (roas >= thresholds.roas_scale) {
      // Scale up
      const increase = roas >= 4 ? 0.5 : 0.3; // 50% or 30% increase
      recommendation.recommended_daily_budget = Math.round(currentBudget * (1 + increase));
      recommendation.change_percent = increase * 100;
      recommendation.action = 'increase';
      recommendation.reason = `ROAS of ${roas.toFixed(2)}x exceeds target. Scale to capture more conversions.`;
    } else if (roas >= thresholds.roas_maintain) {
      // Maintain
      recommendation.action = 'maintain';
      recommendation.reason = `ROAS of ${roas.toFixed(2)}x is profitable. Maintain current budget.`;
    } else if (roas >= thresholds.roas_reduce) {
      // Reduce
      recommendation.recommended_daily_budget = Math.round(currentBudget * 0.7);
      recommendation.change_percent = -30;
      recommendation.action = 'decrease';
      recommendation.reason = `ROAS of ${roas.toFixed(2)}x is below target. Reduce budget and optimize creative.`;
    } else if (spend >= thresholds.min_spend * 2) {
      // Pause
      recommendation.recommended_daily_budget = 0;
      recommendation.change_percent = -100;
      recommendation.action = 'pause';
      recommendation.reason = `ROAS of ${roas.toFixed(2)}x is unprofitable after $${spend.toFixed(0)} spend. Consider pausing.`;
    }

    // Adjust based on CPA if we have conversions
    if (conversions >= thresholds.min_conversions) {
      if (cpa <= thresholds.cpa_excellent && recommendation.action !== 'increase') {
        recommendation.recommended_daily_budget = Math.round(currentBudget * 1.3);
        recommendation.change_percent = 30;
        recommendation.action = 'increase';
        recommendation.reason = `CPA of $${cpa.toFixed(2)} is excellent. Scale to acquire more customers.`;
      } else if (cpa > thresholds.cpa_acceptable && recommendation.action === 'maintain') {
        recommendation.recommended_daily_budget = Math.round(currentBudget * 0.8);
        recommendation.change_percent = -20;
        recommendation.action = 'decrease';
        recommendation.reason = `CPA of $${cpa.toFixed(2)} exceeds target of $${thresholds.cpa_acceptable}. Reduce and optimize.`;
      }
    }

    recommendations.push(recommendation);
  }

  return recommendations;
}

// Weekly cron job to generate and send recommendations
export async function sendWeeklyBudgetRecommendations() {
  const recommendations = await generateBudgetRecommendations();
  
  if (recommendations.length === 0) {
    return { sent: false, reason: 'No recommendations to send' };
  }

  const actionable = recommendations.filter(r => r.action !== 'maintain');
  
  if (actionable.length === 0) {
    return { sent: false, reason: 'All campaigns performing as expected' };
  }

  const html = `
    <h2>Weekly Budget Recommendations</h2>
    <p>Based on the last 7 days of performance data:</p>
    
    ${recommendations.map(r => `
      <div style="margin-bottom: 20px; padding: 15px; background: ${
        r.action === 'increase' ? '#f0fdf4' :
        r.action === 'decrease' ? '#fef3c7' :
        r.action === 'pause' ? '#fef2f2' : '#f9fafb'
      }; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0;">${r.campaign_name}</h3>
        <p style="margin: 0 0 5px 0;">
          <strong>Action:</strong> 
          ${r.action === 'increase' ? '📈 Increase' :
            r.action === 'decrease' ? '📉 Decrease' :
            r.action === 'pause' ? '⏸️ Pause' : '➡️ Maintain'}
        </p>
        <p style="margin: 0 0 5px 0;">
          <strong>Budget:</strong> 
          $${r.current_daily_budget}/day → $${r.recommended_daily_budget}/day
          (${r.change_percent > 0 ? '+' : ''}${r.change_percent}%)
        </p>
        <p style="margin: 0; color: #666;">${r.reason}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">
          Confidence: ${r.confidence}
        </p>
      </div>
    `).join('')}
    
    <p style="margin-top: 20px;">
      <a href="https://hub.havenandhold.com/campaigns">Review in Haven Hub →</a>
    </p>
  `;

  await sendNotificationEmail({
    subject: `📊 Weekly Budget Recommendations (${actionable.length} actions suggested)`,
    html,
  });

  return { sent: true, recommendations: recommendations.length, actionable: actionable.length };
}
```

### Cron Job: `app/api/cron/budget-recommendations/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { sendWeeklyBudgetRecommendations } from '@/lib/pinterest/budget-recommendations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Run every Monday at 9 AM
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sendWeeklyBudgetRecommendations();
  return NextResponse.json(result);
}
```

---

# PROMPT 14: Seasonal Content Rotation

## Context

Automatically activate/deactivate pins and campaigns based on temporal rules. For example, "New Year" collection pins only show Dec 26 - Jan 15.

## Implementation

### Database Updates

```sql
-- Add seasonal fields to scheduled_pins
ALTER TABLE scheduled_pins ADD COLUMN IF NOT EXISTS seasonal_start DATE;
ALTER TABLE scheduled_pins ADD COLUMN IF NOT EXISTS seasonal_end DATE;
ALTER TABLE scheduled_pins ADD COLUMN IF NOT EXISTS is_evergreen BOOLEAN DEFAULT true;

-- Add to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS seasonal_start DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS seasonal_end DATE;
```

### File: `lib/pinterest/seasonal-rotation.ts`

```typescript
/**
 * Seasonal content rotation
 * Automatically pauses/resumes pins and campaigns based on date ranges
 */

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { sendNotificationEmail } from '@/lib/integrations/email';

interface SeasonalChange {
  type: 'pin' | 'campaign';
  id: string;
  name: string;
  action: 'activated' | 'deactivated';
  reason: string;
}

export async function processSeasonalRotation(): Promise<SeasonalChange[]> {
  const supabase = getSupabaseAdmin();
  const changes: SeasonalChange[] = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Activate pins that should start today
  const { data: pinsToActivate } = await supabase
    .from('scheduled_pins')
    .select('id, title, seasonal_start, seasonal_end')
    .eq('status', 'seasonal_paused')
    .lte('seasonal_start', today)
    .or(`seasonal_end.is.null,seasonal_end.gte.${today}`);

  for (const pin of pinsToActivate || []) {
    await supabase
      .from('scheduled_pins')
      .update({ status: 'scheduled' })
      .eq('id', pin.id);

    changes.push({
      type: 'pin',
      id: pin.id,
      name: pin.title || 'Untitled pin',
      action: 'activated',
      reason: `Seasonal start date: ${pin.seasonal_start}`,
    });
  }

  // 2. Deactivate pins that should end today
  const { data: pinsToDeactivate } = await supabase
    .from('scheduled_pins')
    .select('id, title, seasonal_end')
    .eq('is_evergreen', false)
    .in('status', ['scheduled', 'published'])
    .lt('seasonal_end', today);

  for (const pin of pinsToDeactivate || []) {
    await supabase
      .from('scheduled_pins')
      .update({ status: 'seasonal_paused' })
      .eq('id', pin.id);

    changes.push({
      type: 'pin',
      id: pin.id,
      name: pin.title || 'Untitled pin',
      action: 'deactivated',
      reason: `Seasonal end date: ${pin.seasonal_end}`,
    });
  }

  // 3. Same for campaigns
  const { data: campaignsToActivate } = await supabase
    .from('campaigns')
    .select('id, name, seasonal_start, seasonal_end')
    .eq('status', 'seasonal_paused')
    .lte('seasonal_start', today)
    .or(`seasonal_end.is.null,seasonal_end.gte.${today}`);

  for (const campaign of campaignsToActivate || []) {
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaign.id);

    changes.push({
      type: 'campaign',
      id: campaign.id,
      name: campaign.name,
      action: 'activated',
      reason: `Seasonal start date: ${campaign.seasonal_start}`,
    });
  }

  const { data: campaignsToDeactivate } = await supabase
    .from('campaigns')
    .select('id, name, seasonal_end')
    .eq('status', 'active')
    .not('seasonal_end', 'is', null)
    .lt('seasonal_end', today);

  for (const campaign of campaignsToDeactivate || []) {
    await supabase
      .from('campaigns')
      .update({ status: 'seasonal_paused' })
      .eq('id', campaign.id);

    changes.push({
      type: 'campaign',
      id: campaign.id,
      name: campaign.name,
      action: 'deactivated',
      reason: `Seasonal end date: ${campaign.seasonal_end}`,
    });
  }

  // 4. Send notification if any changes
  if (changes.length > 0) {
    const activated = changes.filter(c => c.action === 'activated');
    const deactivated = changes.filter(c => c.action === 'deactivated');

    await sendNotificationEmail({
      subject: `🗓️ Seasonal Rotation: ${changes.length} content changes`,
      html: `
        <h2>Seasonal Content Rotation</h2>
        
        ${activated.length > 0 ? `
          <h3>✅ Activated (${activated.length})</h3>
          <ul>
            ${activated.map(c => `<li><strong>${c.name}</strong> (${c.type}) - ${c.reason}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${deactivated.length > 0 ? `
          <h3>⏸️ Deactivated (${deactivated.length})</h3>
          <ul>
            ${deactivated.map(c => `<li><strong>${c.name}</strong> (${c.type}) - ${c.reason}</li>`).join('')}
          </ul>
        ` : ''}
        
        <p><a href="https://hub.havenandhold.com/calendar">View content calendar →</a></p>
      `,
    });
  }

  return changes;
}

// Predefined seasonal periods for easy assignment
export const SEASONAL_PERIODS = {
  new_year: { start: '12-26', end: '01-15', name: 'New Year' },
  valentines: { start: '01-25', end: '02-14', name: "Valentine's Day" },
  spring: { start: '03-01', end: '05-31', name: 'Spring' },
  mothers_day: { start: '04-15', end: '05-12', name: "Mother's Day" },
  summer: { start: '06-01', end: '08-31', name: 'Summer' },
  back_to_school: { start: '08-01', end: '09-15', name: 'Back to School' },
  fall: { start: '09-01', end: '11-30', name: 'Fall' },
  holiday: { start: '11-15', end: '12-25', name: 'Holiday Season' },
};
```

---

# PROMPT 15: Cross-Platform Winner Detection

## Context

When a quote performs exceptionally well on Instagram, automatically schedule it for Pinterest (and vice versa).

## Implementation

### File: `lib/analytics/cross-platform-winners.ts`

```typescript
/**
 * Detect high performers on one platform and cross-post to others
 */

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { generatePinCopy } from '@/lib/pinterest/copy-generator';
import { sendNotificationEmail } from '@/lib/integrations/email';

interface CrossPostCandidate {
  quote_id: string;
  quote_text: string;
  source_platform: 'instagram' | 'pinterest';
  target_platform: 'instagram' | 'pinterest';
  source_engagement_rate: number;
  source_impressions: number;
  image_url: string;
}

export async function detectCrossPlatformWinners(): Promise<CrossPostCandidate[]> {
  const supabase = getSupabaseAdmin();
  const candidates: CrossPostCandidate[] = [];

  // Thresholds for "winner" status
  const INSTAGRAM_WINNER_THRESHOLD = 0.05; // 5% engagement rate
  const PINTEREST_WINNER_THRESHOLD = 0.04; // 4% engagement rate
  const MIN_IMPRESSIONS = 1000;

  // 1. Find Instagram winners not yet on Pinterest
  const { data: instagramPosts } = await supabase
    .from('instagram_posts')
    .select(`
      id,
      quote_id,
      image_url,
      performance_metrics,
      quotes (quote_text, collection, mood)
    `)
    .eq('status', 'published')
    .not('performance_metrics', 'is', null);

  for (const post of instagramPosts || []) {
    const metrics = post.performance_metrics;
    if (!metrics?.impressions || metrics.impressions < MIN_IMPRESSIONS) continue;

    const engagementRate = (metrics.likes + metrics.comments + metrics.saves) / metrics.impressions;
    
    if (engagementRate >= INSTAGRAM_WINNER_THRESHOLD) {
      // Check if already scheduled for Pinterest
      const { data: existingPin } = await supabase
        .from('scheduled_pins')
        .select('id')
        .eq('quote_id', post.quote_id)
        .limit(1)
        .single();

      if (!existingPin) {
        candidates.push({
          quote_id: post.quote_id,
          quote_text: post.quotes?.quote_text || '',
          source_platform: 'instagram',
          target_platform: 'pinterest',
          source_engagement_rate: engagementRate,
          source_impressions: metrics.impressions,
          image_url: post.image_url,
        });
      }
    }
  }

  // 2. Find Pinterest winners not yet on Instagram
  const { data: pinterestPins } = await supabase
    .from('scheduled_pins')
    .select(`
      id,
      quote_id,
      image_url,
      performance_metrics,
      quotes (quote_text, collection, mood)
    `)
    .eq('status', 'published')
    .not('performance_metrics', 'is', null);

  for (const pin of pinterestPins || []) {
    const metrics = pin.performance_metrics;
    if (!metrics?.impressions || metrics.impressions < MIN_IMPRESSIONS) continue;

    const engagementRate = metrics.engagement_rate / 100;
    
    if (engagementRate >= PINTEREST_WINNER_THRESHOLD) {
      // Check if already posted on Instagram
      const { data: existingPost } = await supabase
        .from('instagram_posts')
        .select('id')
        .eq('quote_id', pin.quote_id)
        .limit(1)
        .single();

      if (!existingPost) {
        candidates.push({
          quote_id: pin.quote_id,
          quote_text: pin.quotes?.quote_text || '',
          source_platform: 'pinterest',
          target_platform: 'instagram',
          source_engagement_rate: engagementRate,
          source_impressions: metrics.impressions,
          image_url: pin.image_url,
        });
      }
    }
  }

  return candidates;
}

export async function autoCrossPost(candidates: CrossPostCandidate[]): Promise<number> {
  const supabase = getSupabaseAdmin();
  let crossPosted = 0;

  for (const candidate of candidates) {
    try {
      if (candidate.target_platform === 'pinterest') {
        // Get default board
        const { data: board } = await supabase
          .from('pinterest_boards')
          .select('id')
          .limit(1)
          .single();

        if (board) {
          const { data: quote } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', candidate.quote_id)
            .single();

          const copy = generatePinCopy({
            quote_text: quote.quote_text,
            collection: quote.collection,
            mood: quote.mood,
            product_version: 'minimal',
          });

          await supabase.from('scheduled_pins').insert({
            board_id: board.id,
            quote_id: candidate.quote_id,
            image_url: candidate.image_url,
            title: copy.title,
            description: copy.description,
            scheduled_at: getNextOptimalTime('pinterest'),
            status: 'scheduled',
            metadata: {
              cross_posted_from: 'instagram',
              source_engagement: candidate.source_engagement_rate,
            },
          });

          crossPosted++;
        }
      } else if (candidate.target_platform === 'instagram') {
        // Schedule for Instagram
        await supabase.from('instagram_posts').insert({
          quote_id: candidate.quote_id,
          image_url: candidate.image_url,
          caption: '', // Will be generated by Instagram caption system
          scheduled_at: getNextOptimalTime('instagram'),
          status: 'scheduled',
          metadata: {
            cross_posted_from: 'pinterest',
            source_engagement: candidate.source_engagement_rate,
          },
        });

        crossPosted++;
      }
    } catch (err) {
      console.error(`Failed to cross-post ${candidate.quote_id}:`, err);
    }
  }

  return crossPosted;
}

function getNextOptimalTime(platform: 'instagram' | 'pinterest'): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  
  // Optimal times by platform
  if (platform === 'pinterest') {
    date.setHours(20, 0, 0, 0); // 8 PM
  } else {
    date.setHours(12, 0, 0, 0); // 12 PM
  }
  
  return date;
}
```

---

# PROMPT 16: Audience Segment Export

## Context

Export high-value customer segments from Haven Hub to Pinterest for lookalike audience targeting.

## Implementation

### File: `app/api/pinterest/export-audience/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import crypto from 'crypto';

/**
 * Export customer segments for Pinterest Custom Audiences
 * Returns SHA256 hashed emails for privacy-safe upload
 */

export async function POST(request: Request) {
  const { segment_type, min_order_value, min_orders } = await request.json();

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('leads')
    .select(`
      email,
      quiz_segment,
      orders (
        id,
        total_price
      )
    `)
    .not('email', 'is', null);

  // Filter by segment
  if (segment_type && segment_type !== 'all') {
    query = query.eq('quiz_segment', segment_type);
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter by purchase behavior
  const filteredLeads = leads?.filter(lead => {
    const orders = lead.orders || [];
    const totalValue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price || 0), 0);
    const orderCount = orders.length;

    if (min_order_value && totalValue < min_order_value) return false;
    if (min_orders && orderCount < min_orders) return false;

    return true;
  }) || [];

  // Hash emails for Pinterest
  const hashedEmails = filteredLeads.map(lead => ({
    email_sha256: crypto
      .createHash('sha256')
      .update(lead.email.toLowerCase().trim())
      .digest('hex'),
    segment: lead.quiz_segment,
  }));

  // Generate CSV for Pinterest upload
  const csv = [
    'EMAIL_SHA256',
    ...hashedEmails.map(h => h.email_sha256),
  ].join('\n');

  // Return both formats
  return NextResponse.json({
    success: true,
    total_records: hashedEmails.length,
    segment_breakdown: {
      grounding: hashedEmails.filter(h => h.segment === 'grounding').length,
      wholeness: hashedEmails.filter(h => h.segment === 'wholeness').length,
      growth: hashedEmails.filter(h => h.segment === 'growth').length,
    },
    csv_data: csv,
    instructions: `
      1. Download the CSV
      2. Go to Pinterest Ads Manager → Audiences → Create Audience → Customer List
      3. Upload the CSV file
      4. Create a Lookalike Audience from this list (1-10% size)
      5. Use in your campaigns for targeting
    `,
  });
}
```

### UI Component

```tsx
// Add to campaigns or settings page
export function AudienceExporter() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [filters, setFilters] = useState({
    segment_type: 'all',
    min_order_value: 0,
    min_orders: 1,
  });

  const handleExport = async () => {
    setLoading(true);
    const res = await fetch('/api/pinterest/export-audience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const downloadCsv = () => {
    if (!result?.csv_data) return;
    const blob = new Blob([result.csv_data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinterest-audience-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Export Audience for Pinterest</h3>
      
      {/* Filters */}
      <div className="grid grid-cols-3 gap-4">
        <Select value={filters.segment_type} onValueChange={v => setFilters({...filters, segment_type: v})}>
          <SelectTrigger><SelectValue placeholder="Segment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            <SelectItem value="grounding">Grounding</SelectItem>
            <SelectItem value="wholeness">Wholeness</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Min order value ($)"
          value={filters.min_order_value || ''}
          onChange={e => setFilters({...filters, min_order_value: parseInt(e.target.value) || 0})}
        />

        <Input
          type="number"
          placeholder="Min # of orders"
          value={filters.min_orders || ''}
          onChange={e => setFilters({...filters, min_orders: parseInt(e.target.value) || 0})}
        />
      </div>

      <Button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting...' : 'Export Audience'}
      </Button>

      {result?.success && (
        <div className="p-4 bg-green-50 rounded-lg">
          <p><strong>{result.total_records}</strong> customers exported</p>
          <p className="text-sm text-gray-600 mt-1">
            Grounding: {result.segment_breakdown.grounding} | 
            Wholeness: {result.segment_breakdown.wholeness} | 
            Growth: {result.segment_breakdown.growth}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={downloadCsv}>
            Download CSV for Pinterest
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

# PROMPT 17: 16-Week KPI Dashboard

## Context

The Pinterest Scaling Playbook defines a 16-week journey from $0 to $22K/month with specific phase targets. This dashboard tracks progress against those targets and provides phase-aware guidance.

## Database Schema

```sql
-- Scaling phases configuration
CREATE TABLE IF NOT EXISTS scaling_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number INT NOT NULL, -- 1-4
  phase_name TEXT NOT NULL, -- Foundation, Testing, Optimization, Scale
  start_week INT NOT NULL,
  end_week INT NOT NULL,
  budget_min DECIMAL NOT NULL,
  budget_max DECIMAL NOT NULL,
  revenue_target_min DECIMAL NOT NULL,
  revenue_target_max DECIMAL NOT NULL,
  cpc_target_min DECIMAL,
  cpc_target_max DECIMAL,
  cpa_target_min DECIMAL,
  cpa_target_max DECIMAL,
  roas_target_min DECIMAL,
  roas_target_max DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert playbook phases
INSERT INTO scaling_phases (phase_number, phase_name, start_week, end_week, budget_min, budget_max, revenue_target_min, revenue_target_max, cpc_target_min, cpc_target_max, cpa_target_min, cpa_target_max, roas_target_min, roas_target_max) VALUES
(1, 'Foundation', 1, 4, 300, 400, 200, 600, 0.15, 0.25, 12, 20, 1.0, 2.0),
(2, 'Testing', 5, 8, 600, 800, 800, 2000, 0.10, 0.18, 10, 15, 2.0, 3.0),
(3, 'Optimization', 9, 12, 1000, 1500, 3000, 6000, 0.08, 0.15, 8, 12, 3.0, 4.0),
(4, 'Scale', 13, 16, 2000, 3000, 8000, 15000, 0.06, 0.12, 6, 10, 4.0, 6.0);

-- Weekly snapshots for historical tracking
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  phase_number INT NOT NULL,
  snapshot_date DATE NOT NULL,
  
  -- Actuals
  total_spend DECIMAL DEFAULT 0,
  total_revenue DECIMAL DEFAULT 0,
  total_orders INT DEFAULT 0,
  website_visits INT DEFAULT 0,
  email_subscribers INT DEFAULT 0,
  
  -- Calculated metrics
  avg_cpc DECIMAL,
  avg_cpa DECIMAL,
  roas DECIMAL,
  conversion_rate DECIMAL,
  
  -- Campaign breakdown
  campaign_metrics JSONB DEFAULT '{}',
  
  -- Notes
  wins TEXT,
  losses TEXT,
  next_week_actions TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_number)
);

CREATE INDEX idx_weekly_snapshots_week ON weekly_snapshots(week_number);
```

## Implementation

### File: `lib/analytics/scaling-dashboard.ts`

```typescript
/**
 * 16-Week Scaling Dashboard
 * Tracks progress against playbook targets
 */

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

interface PhaseTargets {
  phase_number: number;
  phase_name: string;
  start_week: number;
  end_week: number;
  budget: { min: number; max: number };
  revenue: { min: number; max: number };
  cpc: { min: number; max: number };
  cpa: { min: number; max: number };
  roas: { min: number; max: number };
}

interface WeeklyPerformance {
  week_number: number;
  phase: PhaseTargets;
  actuals: {
    spend: number;
    revenue: number;
    orders: number;
    visits: number;
    subscribers: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  status: {
    revenue: 'below' | 'on_track' | 'above';
    cpc: 'below' | 'on_track' | 'above';
    cpa: 'below' | 'on_track' | 'above';
    roas: 'below' | 'on_track' | 'above';
    overall: 'needs_attention' | 'on_track' | 'exceeding';
  };
  recommendations: string[];
}

export async function getCurrentPhase(): Promise<PhaseTargets | null> {
  const supabase = getSupabaseAdmin();
  
  // Get launch date from config or default to when first campaign was created
  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'scaling_start_date')
    .single();

  const startDate = config?.value 
    ? new Date(config.value) 
    : new Date(); // Default to now if not set

  const weeksSinceStart = Math.floor(
    (Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  ) + 1;

  const { data: phase } = await supabase
    .from('scaling_phases')
    .select('*')
    .lte('start_week', weeksSinceStart)
    .gte('end_week', weeksSinceStart)
    .single();

  if (!phase) return null;

  return {
    phase_number: phase.phase_number,
    phase_name: phase.phase_name,
    start_week: phase.start_week,
    end_week: phase.end_week,
    budget: { min: phase.budget_min, max: phase.budget_max },
    revenue: { min: phase.revenue_target_min, max: phase.revenue_target_max },
    cpc: { min: phase.cpc_target_min, max: phase.cpc_target_max },
    cpa: { min: phase.cpa_target_min, max: phase.cpa_target_max },
    roas: { min: phase.roas_target_min, max: phase.roas_target_max },
  };
}

export async function getWeeklyPerformance(weekNumber?: number): Promise<WeeklyPerformance | null> {
  const supabase = getSupabaseAdmin();
  
  // Get current week if not specified
  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'scaling_start_date')
    .single();

  const startDate = config?.value ? new Date(config.value) : new Date();
  const currentWeek = weekNumber || Math.floor(
    (Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  ) + 1;

  // Get phase for this week
  const { data: phase } = await supabase
    .from('scaling_phases')
    .select('*')
    .lte('start_week', currentWeek)
    .gte('end_week', currentWeek)
    .single();

  if (!phase) return null;

  // Get or calculate this week's metrics
  const weekStart = new Date(startDate);
  weekStart.setDate(weekStart.getDate() + (currentWeek - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Aggregate from campaigns and orders
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('metrics')
    .gte('updated_at', weekStart.toISOString())
    .lt('updated_at', weekEnd.toISOString());

  const { data: orders } = await supabase
    .from('orders')
    .select('total_price')
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  // Calculate actuals
  let totalSpend = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  for (const campaign of campaigns || []) {
    if (campaign.metrics) {
      totalSpend += campaign.metrics.spend || 0;
      totalClicks += campaign.metrics.clicks || 0;
      totalConversions += campaign.metrics.conversions || 0;
    }
  }

  const totalRevenue = (orders || []).reduce(
    (sum, o) => sum + parseFloat(o.total_price || 0), 0
  );

  const actuals = {
    spend: totalSpend,
    revenue: totalRevenue,
    orders: orders?.length || 0,
    visits: totalClicks, // Approximation
    subscribers: 0, // Would need to query email provider
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
  };

  // Determine status for each metric
  const getStatus = (actual: number, target: { min: number; max: number }, inverse = false) => {
    if (inverse) {
      // For CPC/CPA, lower is better
      if (actual < target.min) return 'above'; // Exceeding (good)
      if (actual > target.max) return 'below'; // Needs attention
      return 'on_track';
    } else {
      // For ROAS/Revenue, higher is better
      if (actual > target.max) return 'above';
      if (actual < target.min) return 'below';
      return 'on_track';
    }
  };

  const status = {
    revenue: getStatus(actuals.revenue, { min: phase.revenue_target_min, max: phase.revenue_target_max }),
    cpc: getStatus(actuals.cpc, { min: phase.cpc_target_min, max: phase.cpc_target_max }, true),
    cpa: getStatus(actuals.cpa, { min: phase.cpa_target_min, max: phase.cpa_target_max }, true),
    roas: getStatus(actuals.roas, { min: phase.roas_target_min, max: phase.roas_target_max }),
    overall: 'on_track' as const,
  };

  // Calculate overall status
  const statuses = [status.revenue, status.cpc, status.cpa, status.roas];
  const belowCount = statuses.filter(s => s === 'below').length;
  const aboveCount = statuses.filter(s => s === 'above').length;

  if (belowCount >= 2) {
    status.overall = 'needs_attention';
  } else if (aboveCount >= 2) {
    status.overall = 'exceeding';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (status.cpa === 'below') {
    recommendations.push('CPA is high. Review targeting and pause underperforming ad groups.');
  }
  if (status.roas === 'below') {
    recommendations.push('ROAS is below target. Focus on high-intent keywords and retargeting.');
  }
  if (status.revenue === 'above') {
    recommendations.push('Revenue exceeding targets! Consider increasing budget by 20-30%.');
  }
  if (actuals.spend < phase.budget_min * 0.8) {
    recommendations.push(`Underspending this phase. Target $${phase.budget_min}-${phase.budget_max}/month.`);
  }

  return {
    week_number: currentWeek,
    phase: {
      phase_number: phase.phase_number,
      phase_name: phase.phase_name,
      start_week: phase.start_week,
      end_week: phase.end_week,
      budget: { min: phase.budget_min, max: phase.budget_max },
      revenue: { min: phase.revenue_target_min, max: phase.revenue_target_max },
      cpc: { min: phase.cpc_target_min, max: phase.cpc_target_max },
      cpa: { min: phase.cpa_target_min, max: phase.cpa_target_max },
      roas: { min: phase.roas_target_min, max: phase.roas_target_max },
    },
    actuals,
    status,
    recommendations,
  };
}

export async function saveWeeklySnapshot(weekNumber: number, notes?: {
  wins?: string;
  losses?: string;
  next_week_actions?: string;
}) {
  const supabase = getSupabaseAdmin();
  const performance = await getWeeklyPerformance(weekNumber);

  if (!performance) return null;

  const { data, error } = await supabase
    .from('weekly_snapshots')
    .upsert({
      week_number: weekNumber,
      phase_number: performance.phase.phase_number,
      snapshot_date: new Date().toISOString().split('T')[0],
      total_spend: performance.actuals.spend,
      total_revenue: performance.actuals.revenue,
      total_orders: performance.actuals.orders,
      website_visits: performance.actuals.visits,
      avg_cpc: performance.actuals.cpc,
      avg_cpa: performance.actuals.cpa,
      roas: performance.actuals.roas,
      wins: notes?.wins,
      losses: notes?.losses,
      next_week_actions: notes?.next_week_actions,
    }, {
      onConflict: 'week_number',
    })
    .select()
    .single();

  return data;
}

export async function getDashboardData() {
  const supabase = getSupabaseAdmin();

  // Get all phases
  const { data: phases } = await supabase
    .from('scaling_phases')
    .select('*')
    .order('phase_number');

  // Get all weekly snapshots
  const { data: snapshots } = await supabase
    .from('weekly_snapshots')
    .select('*')
    .order('week_number');

  // Get current performance
  const currentPerformance = await getWeeklyPerformance();

  return {
    phases,
    snapshots,
    currentPerformance,
    currentWeek: currentPerformance?.week_number || 1,
    currentPhase: currentPerformance?.phase.phase_number || 1,
  };
}
```

### API Endpoint: `app/api/analytics/scaling-dashboard/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getDashboardData, saveWeeklySnapshot } from '@/lib/analytics/scaling-dashboard';

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { week_number, wins, losses, next_week_actions } = await request.json();
  
  const snapshot = await saveWeeklySnapshot(week_number, {
    wins,
    losses,
    next_week_actions,
  });

  return NextResponse.json({ snapshot });
}
```

### UI Component: `app/(admin)/analytics/scaling/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Target, DollarSign, MousePointer, ShoppingCart } from 'lucide-react';

export default function ScalingDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/scaling-dashboard')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  const { phases, currentPerformance, currentWeek, currentPhase } = data;
  const phase = phases?.find((p: any) => p.phase_number === currentPhase);

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'above') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (status === 'below') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      exceeding: 'bg-green-100 text-green-800',
      on_track: 'bg-blue-100 text-blue-800',
      needs_attention: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || colors.on_track}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>16-Week Scaling Journey</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Week {currentWeek} of 16 • Phase {currentPhase}: {phase?.phase_name}
              </p>
            </div>
            <StatusBadge status={currentPerformance?.status.overall || 'on_track'} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Phase timeline */}
            <div className="flex gap-2">
              {phases?.map((p: any) => (
                <div
                  key={p.phase_number}
                  className={`flex-1 h-2 rounded ${
                    p.phase_number < currentPhase
                      ? 'bg-green-500'
                      : p.phase_number === currentPhase
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Foundation</span>
              <span>Testing</span>
              <span>Optimization</span>
              <span>Scale</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Week Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold">
                  ${currentPerformance?.actuals.revenue.toFixed(0) || 0}
                </p>
                <p className="text-xs text-gray-400">
                  Target: ${phase?.revenue_target_min}-${phase?.revenue_target_max}
                </p>
              </div>
              <StatusIcon status={currentPerformance?.status.revenue || 'on_track'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">CPC</p>
                <p className="text-2xl font-bold">
                  ${currentPerformance?.actuals.cpc.toFixed(2) || 0}
                </p>
                <p className="text-xs text-gray-400">
                  Target: ${phase?.cpc_target_min}-${phase?.cpc_target_max}
                </p>
              </div>
              <StatusIcon status={currentPerformance?.status.cpc || 'on_track'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">CPA</p>
                <p className="text-2xl font-bold">
                  ${currentPerformance?.actuals.cpa.toFixed(2) || 0}
                </p>
                <p className="text-xs text-gray-400">
                  Target: ${phase?.cpa_target_min}-${phase?.cpa_target_max}
                </p>
              </div>
              <StatusIcon status={currentPerformance?.status.cpa || 'on_track'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">ROAS</p>
                <p className="text-2xl font-bold">
                  {currentPerformance?.actuals.roas.toFixed(1) || 0}x
                </p>
                <p className="text-xs text-gray-400">
                  Target: {phase?.roas_target_min}-{phase?.roas_target_max}x
                </p>
              </div>
              <StatusIcon status={currentPerformance?.status.roas || 'on_track'} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {currentPerformance?.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentPerformance.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-teal-600 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Phase Targets Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Phase Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Phase</th>
                  <th className="text-left py-2">Weeks</th>
                  <th className="text-right py-2">Budget</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">CPC</th>
                  <th className="text-right py-2">CPA</th>
                  <th className="text-right py-2">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {phases?.map((p: any) => (
                  <tr
                    key={p.phase_number}
                    className={`border-b ${p.phase_number === currentPhase ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-2 font-medium">{p.phase_name}</td>
                    <td className="py-2">{p.start_week}-{p.end_week}</td>
                    <td className="py-2 text-right">${p.budget_min}-${p.budget_max}</td>
                    <td className="py-2 text-right">${p.revenue_target_min.toLocaleString()}-${p.revenue_target_max.toLocaleString()}</td>
                    <td className="py-2 text-right">${p.cpc_target_min}-${p.cpc_target_max}</td>
                    <td className="py-2 text-right">${p.cpa_target_min}-${p.cpa_target_max}</td>
                    <td className="py-2 text-right">{p.roas_target_min}-{p.roas_target_max}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

# PROMPT 18: Campaign Setup Wizard

## Context

The playbook defines a 3-tier campaign structure (MH-Core-Traffic, HD-Core-Traffic, RT-SiteVisitors). This wizard guides users through creating this structure with pre-configured settings.

## Implementation

### File: `lib/pinterest/campaign-templates.ts`

```typescript
/**
 * Pre-configured campaign templates based on the scaling playbook
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  objective: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSIONS';
  daily_budget: number;
  targeting: {
    interests: string[];
    keywords: string[];
    demographics: {
      genders: string[];
      age_ranges: string[];
    };
    exclusions?: string[];
  };
  recommended_pins: {
    count: number;
    collections: string[];
    formats: string[];
  };
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'mh-core-traffic',
    name: 'MH-Core-Traffic',
    description: 'Mental health audience - therapy, counseling, psychology interests',
    objective: 'CONSIDERATION',
    daily_budget: 5,
    targeting: {
      interests: [
        'Therapy',
        'Counseling',
        'Psychology',
        'Mental health',
        'Anxiety',
        'Depression',
        'Mental wellness',
        'Self-care',
        'Mindfulness',
        'Meditation',
      ],
      keywords: [
        'therapy office decor',
        'counselor office prints',
        'anxiety wall art',
        'grounding quotes',
        'mental health prints',
        'safe space art',
        'mindfulness wall art',
      ],
      demographics: {
        genders: ['female'],
        age_ranges: ['25-34', '35-44', '45-54'],
      },
    },
    recommended_pins: {
      count: 5,
      collections: ['grounding', 'wholeness'],
      formats: ['pinterest_portrait'],
    },
  },
  {
    id: 'hd-core-traffic',
    name: 'HD-Core-Traffic',
    description: 'Home decor audience - interior design, minimalism, wall art interests',
    objective: 'CONSIDERATION',
    daily_budget: 4,
    targeting: {
      interests: [
        'Interior design',
        'Home decor',
        'Minimalism',
        'Scandinavian design',
        'Wall art',
        'Bedroom decor',
        'Living room ideas',
        'Quote prints',
        'Typography',
      ],
      keywords: [
        'minimalist quote prints',
        'bedroom wall art',
        'living room decor',
        'neutral wall art',
        'typography prints',
        'inspirational wall decor',
      ],
      demographics: {
        genders: ['female'],
        age_ranges: ['25-34', '35-44', '45-54'],
      },
    },
    recommended_pins: {
      count: 5,
      collections: ['grounding', 'wholeness', 'growth'],
      formats: ['pinterest_portrait'],
    },
  },
  {
    id: 'rt-site-visitors',
    name: 'RT-SiteVisitors',
    description: 'Retargeting - website visitors who haven\'t purchased',
    objective: 'CONVERSIONS',
    daily_budget: 2,
    targeting: {
      interests: [], // Retargeting doesn't need interests
      keywords: [],
      demographics: {
        genders: ['female'],
        age_ranges: ['25-34', '35-44', '45-54'],
      },
      exclusions: ['purchasers_30d'],
    },
    recommended_pins: {
      count: 5,
      collections: ['grounding', 'wholeness', 'growth'],
      formats: ['pinterest_portrait'],
    },
  },
  {
    id: 'b2b-therapists',
    name: 'B2B-Therapists',
    description: 'Professional therapists and counselors for office decor',
    objective: 'CONSIDERATION',
    daily_budget: 3,
    targeting: {
      interests: [
        'Professional development',
        'Office design',
        'Counseling career',
        'Social work',
        'Psychology career',
        'Therapy practice',
      ],
      keywords: [
        'therapy office decor',
        'counselor office ideas',
        'therapist office wall art',
        'professional office prints',
        'waiting room decor',
      ],
      demographics: {
        genders: ['female', 'male'],
        age_ranges: ['25-34', '35-44', '45-54', '55-64'],
      },
    },
    recommended_pins: {
      count: 5,
      collections: ['grounding'],
      formats: ['pinterest_portrait'],
    },
  },
];

export function getTemplateById(id: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find(t => t.id === id);
}

export function getRecommendedTemplates(phase: number): CampaignTemplate[] {
  // Phase 1-2: Start with core campaigns
  if (phase <= 2) {
    return CAMPAIGN_TEMPLATES.filter(t => 
      ['mh-core-traffic', 'hd-core-traffic', 'rt-site-visitors'].includes(t.id)
    );
  }
  // Phase 3-4: Add B2B
  return CAMPAIGN_TEMPLATES;
}
```

### API Endpoint: `app/api/pinterest/campaign-wizard/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { CAMPAIGN_TEMPLATES, getTemplateById } from '@/lib/pinterest/campaign-templates';
import { getCurrentPhase } from '@/lib/analytics/scaling-dashboard';

// GET: Get available templates
export async function GET() {
  const phase = await getCurrentPhase();
  const templates = CAMPAIGN_TEMPLATES;
  const recommended = phase 
    ? templates.filter(t => 
        ['mh-core-traffic', 'hd-core-traffic', 'rt-site-visitors'].includes(t.id)
      )
    : templates;

  return NextResponse.json({
    templates,
    recommended: recommended.map(t => t.id),
    currentPhase: phase?.phase_number || 1,
  });
}

// POST: Create campaign from template
export async function POST(request: Request) {
  const { template_id, customizations } = await request.json();
  const supabase = getSupabaseAdmin();

  const template = getTemplateById(template_id);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Merge customizations
  const campaignData = {
    name: customizations?.name || template.name,
    type: 'pinterest',
    status: 'draft',
    daily_budget: customizations?.daily_budget || template.daily_budget,
    objective: template.objective,
    targeting: {
      ...template.targeting,
      ...customizations?.targeting,
    },
    template_id: template.id,
    metadata: {
      template_name: template.name,
      recommended_pins: template.recommended_pins,
    },
  };

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert(campaignData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return with Pinterest Ads Manager instructions
  return NextResponse.json({
    campaign,
    pinterest_setup_instructions: generatePinterestInstructions(template, campaign),
  });
}

function generatePinterestInstructions(template: any, campaign: any): string[] {
  return [
    '1. Go to ads.pinterest.com and click "Create campaign"',
    `2. Select objective: "${template.objective === 'CONSIDERATION' ? 'Consideration → Traffic' : 'Conversions → Conversions'}"`,
    `3. Set campaign name: "${campaign.name}"`,
    `4. Set daily budget: $${campaign.daily_budget}`,
    '5. Create ad group with these settings:',
    `   - Interests: ${template.targeting.interests.slice(0, 5).join(', ')}`,
    `   - Keywords: ${template.targeting.keywords.slice(0, 5).join(', ')}`,
    `   - Demographics: ${template.targeting.demographics.genders.join('/')} ${template.targeting.demographics.age_ranges.join(', ')}`,
    template.targeting.exclusions?.length 
      ? `   - Exclusions: ${template.targeting.exclusions.join(', ')}`
      : '',
    `6. Upload ${template.recommended_pins.count} pins from your approved assets`,
    '7. Set bid strategy to "Automatic" for Phase 1-2',
    '8. Review and launch',
  ].filter(Boolean);
}
```

### UI Component: `app/(admin)/pinterest/wizard/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, ExternalLink, Users, Target, DollarSign } from 'lucide-react';

export default function CampaignWizardPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customBudget, setCustomBudget] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/pinterest/campaign-wizard')
      .then(res => res.json())
      .then(data => {
        setTemplates(data.templates);
        setRecommended(data.recommended);
      });
  }, []);

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    const res = await fetch('/api/pinterest/campaign-wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: selectedTemplate.id,
        customizations: customBudget ? { daily_budget: customBudget } : undefined,
      }),
    });

    const data = await res.json();
    setResult(data);
  };

  const copyInstructions = () => {
    if (!result?.pinterest_setup_instructions) return;
    navigator.clipboard.writeText(result.pinterest_setup_instructions.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campaign Setup Wizard</h1>
        <p className="text-gray-500 mt-1">
          Create campaigns using the proven 3-tier structure from the scaling playbook
        </p>
      </div>

      {/* Template Selection */}
      <div className="grid grid-cols-2 gap-4">
        {templates.map(template => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all ${
              selectedTemplate?.id === template.id
                ? 'ring-2 ring-teal-500'
                : 'hover:border-gray-300'
            }`}
            onClick={() => {
              setSelectedTemplate(template);
              setCustomBudget(template.daily_budget);
              setResult(null);
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {recommended.includes(template.id) && (
                  <Badge variant="secondary">Recommended</Badge>
                )}
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  ${template.daily_budget}/day
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {template.targeting.interests.length} interests
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  {template.objective.toLowerCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration */}
      {selectedTemplate && !result && (
        <Card>
          <CardHeader>
            <CardTitle>Configure {selectedTemplate.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Daily Budget ($)</label>
              <Input
                type="number"
                value={customBudget || ''}
                onChange={e => setCustomBudget(parseFloat(e.target.value))}
                min={1}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                Playbook recommendation: ${selectedTemplate.daily_budget}/day for this campaign type
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Targeting Preview</label>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                <div>
                  <span className="font-medium">Interests:</span>{' '}
                  {selectedTemplate.targeting.interests.slice(0, 5).join(', ')}
                  {selectedTemplate.targeting.interests.length > 5 && '...'}
                </div>
                <div>
                  <span className="font-medium">Keywords:</span>{' '}
                  {selectedTemplate.targeting.keywords.slice(0, 3).join(', ')}
                  {selectedTemplate.targeting.keywords.length > 3 && '...'}
                </div>
                <div>
                  <span className="font-medium">Demographics:</span>{' '}
                  {selectedTemplate.targeting.demographics.genders.join('/')},{' '}
                  ages {selectedTemplate.targeting.demographics.age_ranges.join(', ')}
                </div>
              </div>
            </div>

            <Button onClick={handleCreate} className="w-full">
              Create Campaign & Get Instructions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Campaign Created
              </CardTitle>
              <Button variant="outline" size="sm" onClick={copyInstructions}>
                {copied ? 'Copied!' : <><Copy className="w-4 h-4 mr-1" /> Copy Instructions</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-medium mb-2">Pinterest Ads Manager Setup</h4>
              <ol className="space-y-1 text-sm">
                {result.pinterest_setup_instructions?.map((instruction: string, i: number) => (
                  <li key={i} className={instruction.startsWith('   ') ? 'ml-4 text-gray-600' : ''}>
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-3">
              <Button asChild>
                <a href="https://ads.pinterest.com" target="_blank" rel="noopener">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Pinterest Ads Manager
                </a>
              </Button>
              <Button variant="outline" onClick={() => {
                setSelectedTemplate(null);
                setResult(null);
              }}>
                Create Another Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3-Tier Campaign Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded">
              <div className="font-medium text-blue-900">MH-Core-Traffic</div>
              <div className="text-blue-700">$5/day</div>
              <div className="text-blue-600 mt-1">Mental health audience. High intent, therapy-engaged.</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="font-medium text-green-900">HD-Core-Traffic</div>
              <div className="text-green-700">$4/day</div>
              <div className="text-green-600 mt-1">Home decor audience. Broader reach, style-focused.</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="font-medium text-purple-900">RT-SiteVisitors</div>
              <div className="text-purple-700">$2/day</div>
              <div className="text-purple-600 mt-1">Retargeting. Warmest audience, highest conversion.</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Total Phase 1 budget: ~$11/day ($330/month). Scale winners after 2 weeks of data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

# PROMPT 19: Weekly Rhythm System

## Context

The playbook defines specific tasks for each day of the week. This system automates reminders and creates a guided workflow.

## Database Schema

```sql
-- Task definitions
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL, -- 0=Sunday, 1=Monday, etc.
  task_name TEXT NOT NULL,
  task_description TEXT,
  estimated_minutes INT DEFAULT 30,
  task_type TEXT NOT NULL, -- analytics, optimization, creative, testing, organic, batch
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task completion tracking
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES weekly_tasks(id),
  week_number INT NOT NULL,
  completed_at TIMESTAMP,
  notes TEXT,
  metrics_snapshot JSONB, -- Captured metrics at completion
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, week_number)
);

-- Insert playbook tasks
INSERT INTO weekly_tasks (day_of_week, task_name, task_description, estimated_minutes, task_type, sort_order) VALUES
-- Monday
(1, 'Performance Review', 'Export data, analyze CPC/CPA/ROAS by campaign', 30, 'analytics', 1),
(1, 'Check Delivery Issues', 'Review Pinterest Ads Manager for any blocked or underdelivering campaigns', 10, 'analytics', 2),

-- Tuesday  
(2, 'Kill/Scale Decisions', 'Pause losers (CPA >$15), increase budget on winners (ROAS >3x)', 20, 'optimization', 1),
(2, 'Budget Reallocation', 'Move budget from underperformers to top campaigns', 15, 'optimization', 2),

-- Wednesday
(3, 'Creative Refresh', 'Create 5-10 new pin variations of winning designs', 45, 'creative', 1),
(3, 'Copy Optimization', 'Update titles/descriptions based on performance data', 20, 'creative', 2),

-- Thursday
(4, 'A/B Test Launch', 'Launch new tests: creative variants, audience segments, or copy', 30, 'testing', 1),
(4, 'Document Test Results', 'Log completed test results and learnings', 15, 'testing', 2),

-- Friday
(5, 'Organic Review', 'Check organic pin performance, engagement', 20, 'organic', 1),
(5, 'Community Engagement', 'Respond to comments, engage with followers', 15, 'organic', 2),

-- Sunday
(0, 'Batch Content Creation', 'Design 15-20 new pins using templates', 90, 'batch', 1),
(0, 'Schedule Content', 'Upload and schedule pins for the week', 45, 'batch', 2),
(0, 'Week Planning', 'Review upcoming week, set priorities', 15, 'batch', 3);

CREATE INDEX idx_weekly_tasks_day ON weekly_tasks(day_of_week);
CREATE INDEX idx_task_completions_week ON task_completions(week_number);
```

## Implementation

### File: `lib/tasks/weekly-rhythm.ts`

```typescript
/**
 * Weekly rhythm task management
 */

import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { sendNotificationEmail } from '@/lib/integrations/email';

interface WeeklyTask {
  id: string;
  day_of_week: number;
  task_name: string;
  task_description: string;
  estimated_minutes: number;
  task_type: string;
  is_completed?: boolean;
  completed_at?: string;
  notes?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function getTodaysTasks(): Promise<WeeklyTask[]> {
  const supabase = getSupabaseAdmin();
  const today = new Date().getDay();
  const currentWeek = getCurrentWeekNumber();

  // Get tasks for today
  const { data: tasks } = await supabase
    .from('weekly_tasks')
    .select('*')
    .eq('day_of_week', today)
    .eq('is_active', true)
    .order('sort_order');

  // Get completions for this week
  const { data: completions } = await supabase
    .from('task_completions')
    .select('task_id, completed_at, notes')
    .eq('week_number', currentWeek);

  const completionMap = new Map(
    completions?.map(c => [c.task_id, c]) || []
  );

  return (tasks || []).map(task => ({
    ...task,
    is_completed: completionMap.has(task.id),
    completed_at: completionMap.get(task.id)?.completed_at,
    notes: completionMap.get(task.id)?.notes,
  }));
}

export async function getWeekTasks(): Promise<Record<number, WeeklyTask[]>> {
  const supabase = getSupabaseAdmin();
  const currentWeek = getCurrentWeekNumber();

  const { data: tasks } = await supabase
    .from('weekly_tasks')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week')
    .order('sort_order');

  const { data: completions } = await supabase
    .from('task_completions')
    .select('task_id, completed_at, notes')
    .eq('week_number', currentWeek);

  const completionMap = new Map(
    completions?.map(c => [c.task_id, c]) || []
  );

  // Group by day
  const byDay: Record<number, WeeklyTask[]> = {};
  for (const task of tasks || []) {
    if (!byDay[task.day_of_week]) {
      byDay[task.day_of_week] = [];
    }
    byDay[task.day_of_week].push({
      ...task,
      is_completed: completionMap.has(task.id),
      completed_at: completionMap.get(task.id)?.completed_at,
      notes: completionMap.get(task.id)?.notes,
    });
  }

  return byDay;
}

export async function completeTask(taskId: string, notes?: string, metrics?: any) {
  const supabase = getSupabaseAdmin();
  const currentWeek = getCurrentWeekNumber();

  const { data, error } = await supabase
    .from('task_completions')
    .upsert({
      task_id: taskId,
      week_number: currentWeek,
      completed_at: new Date().toISOString(),
      notes,
      metrics_snapshot: metrics,
    }, {
      onConflict: 'task_id,week_number',
    })
    .select()
    .single();

  return { data, error };
}

export async function uncompleteTask(taskId: string) {
  const supabase = getSupabaseAdmin();
  const currentWeek = getCurrentWeekNumber();

  const { error } = await supabase
    .from('task_completions')
    .delete()
    .eq('task_id', taskId)
    .eq('week_number', currentWeek);

  return { error };
}

export async function sendDailyTaskReminder() {
  const tasks = await getTodaysTasks();
  const incompleteTasks = tasks.filter(t => !t.is_completed);

  if (incompleteTasks.length === 0) return { sent: false, reason: 'All tasks complete' };

  const today = DAY_NAMES[new Date().getDay()];
  const totalMinutes = incompleteTasks.reduce((sum, t) => sum + t.estimated_minutes, 0);

  await sendNotificationEmail({
    subject: `📋 ${today}'s Pinterest Tasks (${incompleteTasks.length} remaining)`,
    html: `
      <h2>${today}'s Tasks</h2>
      <p>Estimated time: ${totalMinutes} minutes</p>
      
      <ul>
        ${incompleteTasks.map(t => `
          <li>
            <strong>${t.task_name}</strong> (${t.estimated_minutes} min)<br>
            <span style="color: #666;">${t.task_description}</span>
          </li>
        `).join('')}
      </ul>
      
      <p><a href="https://hub.havenandhold.com/tasks">Open Task Dashboard →</a></p>
    `,
  });

  return { sent: true, tasks: incompleteTasks.length };
}

export async function getWeekProgress(): Promise<{
  total: number;
  completed: number;
  percentage: number;
  byType: Record<string, { total: number; completed: number }>;
}> {
  const weekTasks = await getWeekTasks();
  
  let total = 0;
  let completed = 0;
  const byType: Record<string, { total: number; completed: number }> = {};

  for (const tasks of Object.values(weekTasks)) {
    for (const task of tasks) {
      total++;
      if (task.is_completed) completed++;

      if (!byType[task.task_type]) {
        byType[task.task_type] = { total: 0, completed: 0 };
      }
      byType[task.task_type].total++;
      if (task.is_completed) byType[task.task_type].completed++;
    }
  }

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    byType,
  };
}

function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil(diff / oneWeek);
}
```

### Cron Job: `app/api/cron/daily-task-reminder/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { sendDailyTaskReminder } from '@/lib/tasks/weekly-rhythm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Run every day at 8 AM
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sendDailyTaskReminder();
  return NextResponse.json(result);
}
```

### API Endpoint: `app/api/tasks/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getTodaysTasks, getWeekTasks, completeTask, uncompleteTask, getWeekProgress } from '@/lib/tasks/weekly-rhythm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'today';

  if (view === 'today') {
    const tasks = await getTodaysTasks();
    return NextResponse.json({ tasks });
  }

  if (view === 'week') {
    const tasks = await getWeekTasks();
    const progress = await getWeekProgress();
    return NextResponse.json({ tasks, progress });
  }

  if (view === 'progress') {
    const progress = await getWeekProgress();
    return NextResponse.json({ progress });
  }

  return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
}

export async function POST(request: Request) {
  const { task_id, action, notes, metrics } = await request.json();

  if (action === 'complete') {
    const result = await completeTask(task_id, notes, metrics);
    return NextResponse.json(result);
  }

  if (action === 'uncomplete') {
    const result = await uncompleteTask(task_id);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
```

### UI Component: `app/(admin)/tasks/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, Circle, ChevronRight } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TYPE_COLORS: Record<string, string> = {
  analytics: 'bg-blue-100 text-blue-800',
  optimization: 'bg-purple-100 text-purple-800',
  creative: 'bg-pink-100 text-pink-800',
  testing: 'bg-orange-100 text-orange-800',
  organic: 'bg-green-100 text-green-800',
  batch: 'bg-gray-100 text-gray-800',
};

export default function TasksPage() {
  const [view, setView] = useState<'today' | 'week'>('today');
  const [tasks, setTasks] = useState<any>({});
  const [progress, setProgress] = useState<any>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const today = new Date().getDay();

  useEffect(() => {
    loadTasks();
  }, [view]);

  const loadTasks = async () => {
    const res = await fetch(`/api/tasks?view=${view}`);
    const data = await res.json();
    
    if (view === 'today') {
      setTasks({ [today]: data.tasks });
    } else {
      setTasks(data.tasks);
      setProgress(data.progress);
    }
  };

  const toggleTask = async (taskId: string, isCompleted: boolean) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: taskId,
        action: isCompleted ? 'uncomplete' : 'complete',
        notes: notes[taskId],
      }),
    });
    loadTasks();
  };

  const renderTask = (task: any) => (
    <div
      key={task.id}
      className={`border rounded-lg p-4 transition-all ${
        task.is_completed ? 'bg-gray-50 opacity-75' : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => toggleTask(task.id, task.is_completed)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${task.is_completed ? 'line-through text-gray-500' : ''}`}>
              {task.task_name}
            </span>
            <Badge className={TYPE_COLORS[task.task_type] || TYPE_COLORS.batch}>
              {task.task_type}
            </Badge>
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.estimated_minutes}m
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{task.task_description}</p>
          
          {expandedTask === task.id && (
            <div className="mt-3">
              <Textarea
                placeholder="Add notes about this task..."
                value={notes[task.id] || ''}
                onChange={e => setNotes({ ...notes, [task.id]: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
          
          <button
            onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
            className="text-xs text-teal-600 mt-2 flex items-center gap-1"
          >
            {expandedTask === task.id ? 'Hide notes' : 'Add notes'}
            <ChevronRight className={`w-3 h-3 transition-transform ${expandedTask === task.id ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Weekly Tasks</h1>
          <p className="text-gray-500">Your Pinterest optimization rhythm</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'today' ? 'default' : 'outline'}
            onClick={() => setView('today')}
          >
            Today
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            onClick={() => setView('week')}
          >
            Full Week
          </Button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Week Progress</span>
              <span className="text-sm text-gray-500">
                {progress.completed}/{progress.total} tasks ({progress.percentage}%)
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
            <div className="flex gap-4 mt-4">
              {Object.entries(progress.byType).map(([type, data]: [string, any]) => (
                <div key={type} className="text-xs">
                  <Badge className={TYPE_COLORS[type]}>{type}</Badge>
                  <span className="ml-1 text-gray-500">{data.completed}/{data.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      {view === 'today' ? (
        <Card>
          <CardHeader>
            <CardTitle>{DAY_NAMES[today]}'s Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks[today]?.length > 0 ? (
              tasks[today].map(renderTask)
            ) : (
              <p className="text-gray-500 text-center py-4">No tasks scheduled for today</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 0].map(day => ( // Mon-Fri, then Sunday
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {DAY_NAMES[day]}
                  {day === today && <Badge>Today</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks[day]?.length > 0 ? (
                  tasks[day].map(renderTask)
                ) : (
                  <p className="text-gray-400 text-sm">No tasks</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

# Summary: Implementation Priority Order

## Phase 1: Core Automation (Week 1)
1. **Pinterest Publish Cron** — Enables scheduled pins to work
2. **Pinterest Insights Cron** — Enables performance tracking
3. **Performance Alerts** — Get notified of wins/issues

## Phase 2: Content Generation (Week 2)
4. **Auto-Generate Pin Copy** — Eliminates manual copywriting
5. **Dynamic Mockups Integration** — Automated room mockups
6. **Bulk Pin Creator** — Batch operations
7. **Master File Upload** — Import existing designs

## Phase 3: Optimization (Week 3)
8. **Copy-to-Ads Workflow** — Streamlines paid campaigns
9. **A/B Test Tracker** — Learn from experiments
10. **Temporal Auto-Scheduler** — AI-powered scheduling

## Phase 4: Intelligence (Week 4)
11. **Winner Refresh System** — Extend success of top performers
12. **Pinterest Conversion API** — Better attribution
13. **Smart Budget Recommendations** — Automated budget advice
14. **Seasonal Content Rotation** — Time-based activation
15. **Cross-Platform Winners** — Auto cross-post winners
16. **Audience Segment Export** — Lookalike targeting

## Phase 5: Operations (Week 5)
17. **16-Week KPI Dashboard** — Phase-aware tracking with targets vs actuals
18. **Campaign Setup Wizard** — Guided 3-tier campaign structure setup
19. **Weekly Rhythm System** — Automated task scheduling with day-specific reminders

## Phase 5: Operations (Week 5)
17. **16-Week KPI Dashboard** — Phase-aware tracking with targets vs actuals
18. **Campaign Setup Wizard** — Guided 3-tier campaign structure setup
19. **Weekly Rhythm System** — Automated task scheduling with day-specific reminders

---

## Environment Variables to Add

```bash
# Dynamic Mockups
DYNAMIC_MOCKUPS_API_KEY=your-key
DYNAMIC_MOCKUPS_COLLECTION_UUID=your-collection-uuid

# Pinterest (verify existing)
PINTEREST_ACCESS_TOKEN=your-token
PINTEREST_REFRESH_TOKEN=your-refresh-token
PINTEREST_AD_ACCOUNT_ID=your-ad-account-id

# Email Notifications (Resend)
RESEND_API_KEY=your-resend-key

# Cron authentication
CRON_SECRET=your-secret
```

---

## Database Migrations Summary

```sql
-- Run all migrations in order

-- 1. Add performance_metrics to scheduled_pins
ALTER TABLE scheduled_pins 
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_scheduled_pins_performance 
ON scheduled_pins ((performance_metrics->>'impressions')::int DESC);

-- 2. Create dynamic_mockup_templates table
CREATE TABLE IF NOT EXISTS dynamic_mockup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scene_type TEXT NOT NULL,
  mockup_uuid TEXT NOT NULL,
  smart_object_uuid TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create dynamic_mockup_config table  
CREATE TABLE IF NOT EXISTS dynamic_mockup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_uuid TEXT,
  api_key_encrypted TEXT,
  default_format TEXT DEFAULT 'webp',
  default_size INT DEFAULT 1000,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create pinterest_ab_tests table
CREATE TABLE IF NOT EXISTS pinterest_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  hypothesis TEXT,
  variants JSONB NOT NULL,
  pinterest_campaign_id TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  min_sample_size INT DEFAULT 1000,
  results JSONB,
  winner_variant TEXT,
  confidence_level DECIMAL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_status ON pinterest_ab_tests(status);
CREATE INDEX idx_ab_tests_campaign ON pinterest_ab_tests(campaign_id);

-- 5. Master file upload support
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'generated';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS master_file_url TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS master_file_metadata JSONB DEFAULT '{}';

-- 6. Seasonal content rotation
ALTER TABLE scheduled_pins ADD COLUMN IF NOT EXISTS seasonal_start DATE;
ALTER TABLE scheduled_pins ADD COLUMN IF NOT EXISTS seasonal_end DATE;
ALTER TABLE scheduled_pins ADD COLUMN IF NOT EXISTS is_evergreen BOOLEAN DEFAULT true;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS seasonal_start DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS seasonal_end DATE;

-- 7. 16-Week KPI Dashboard tables
CREATE TABLE IF NOT EXISTS scaling_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number INT NOT NULL,
  phase_name TEXT NOT NULL,
  start_week INT NOT NULL,
  end_week INT NOT NULL,
  budget_min DECIMAL NOT NULL,
  budget_max DECIMAL NOT NULL,
  revenue_target_min DECIMAL NOT NULL,
  revenue_target_max DECIMAL NOT NULL,
  cpc_target_min DECIMAL,
  cpc_target_max DECIMAL,
  cpa_target_min DECIMAL,
  cpa_target_max DECIMAL,
  roas_target_min DECIMAL,
  roas_target_max DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert playbook phase targets
INSERT INTO scaling_phases (phase_number, phase_name, start_week, end_week, budget_min, budget_max, revenue_target_min, revenue_target_max, cpc_target_min, cpc_target_max, cpa_target_min, cpa_target_max, roas_target_min, roas_target_max) VALUES
(1, 'Foundation', 1, 4, 300, 400, 200, 600, 0.15, 0.25, 12, 20, 1.0, 2.0),
(2, 'Testing', 5, 8, 600, 800, 800, 2000, 0.10, 0.18, 10, 15, 2.0, 3.0),
(3, 'Optimization', 9, 12, 1000, 1500, 3000, 6000, 0.08, 0.15, 8, 12, 3.0, 4.0),
(4, 'Scale', 13, 16, 2000, 3000, 8000, 15000, 0.06, 0.12, 6, 10, 4.0, 6.0);

CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  phase_number INT NOT NULL,
  snapshot_date DATE NOT NULL,
  total_spend DECIMAL DEFAULT 0,
  total_revenue DECIMAL DEFAULT 0,
  total_orders INT DEFAULT 0,
  website_visits INT DEFAULT 0,
  email_subscribers INT DEFAULT 0,
  avg_cpc DECIMAL,
  avg_cpa DECIMAL,
  roas DECIMAL,
  conversion_rate DECIMAL,
  campaign_metrics JSONB DEFAULT '{}',
  wins TEXT,
  losses TEXT,
  next_week_actions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(week_number)
);

CREATE INDEX idx_weekly_snapshots_week ON weekly_snapshots(week_number);

-- 8. Weekly rhythm task system
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL,
  task_name TEXT NOT NULL,
  task_description TEXT,
  estimated_minutes INT DEFAULT 30,
  task_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES weekly_tasks(id),
  week_number INT NOT NULL,
  completed_at TIMESTAMP,
  notes TEXT,
  metrics_snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, week_number)
);

-- Insert playbook tasks
INSERT INTO weekly_tasks (day_of_week, task_name, task_description, estimated_minutes, task_type, sort_order) VALUES
(1, 'Performance Review', 'Export data, analyze CPC/CPA/ROAS by campaign', 30, 'analytics', 1),
(1, 'Check Delivery Issues', 'Review Pinterest Ads Manager for blocked/underdelivering campaigns', 10, 'analytics', 2),
(2, 'Kill/Scale Decisions', 'Pause losers (CPA >$15), increase budget on winners (ROAS >3x)', 20, 'optimization', 1),
(2, 'Budget Reallocation', 'Move budget from underperformers to top campaigns', 15, 'optimization', 2),
(3, 'Creative Refresh', 'Create 5-10 new pin variations of winning designs', 45, 'creative', 1),
(3, 'Copy Optimization', 'Update titles/descriptions based on performance data', 20, 'creative', 2),
(4, 'A/B Test Launch', 'Launch new tests: creative variants, audience segments, or copy', 30, 'testing', 1),
(4, 'Document Test Results', 'Log completed test results and learnings', 15, 'testing', 2),
(5, 'Organic Review', 'Check organic pin performance, engagement', 20, 'organic', 1),
(5, 'Community Engagement', 'Respond to comments, engage with followers', 15, 'organic', 2),
(0, 'Batch Content Creation', 'Design 15-20 new pins using templates', 90, 'batch', 1),
(0, 'Schedule Content', 'Upload and schedule pins for the week', 45, 'batch', 2),
(0, 'Week Planning', 'Review upcoming week, set priorities', 15, 'batch', 3);

CREATE INDEX idx_weekly_tasks_day ON weekly_tasks(day_of_week);
CREATE INDEX idx_task_completions_week ON task_completions(week_number);

-- 9. Add indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_scheduled_pins_seasonal 
ON scheduled_pins (seasonal_start, seasonal_end) 
WHERE seasonal_start IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_pins_quote 
ON scheduled_pins (quote_id);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_quote 
ON instagram_posts (quote_id);

-- 10. App config for scaling start date
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Vercel Cron Configuration

Add all crons to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/pinterest-publish",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/pinterest-insights",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/pinterest-winner-refresh",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/budget-recommendations",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/seasonal-rotation",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/cross-platform-winners",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/daily-task-reminder",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

## Package Dependencies

```bash
npm install resend react-dropzone jszip
```

---

**End of Cursor Prompts**

*Document created for Haven Hub Pinterest automation suite*
*December 2025*
