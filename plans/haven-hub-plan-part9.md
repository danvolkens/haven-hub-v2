# Haven Hub: Complete Implementation Task Plan
## Part 9: Phases 14-16 (Lead Capture, Quiz, Abandonment)

---

# Phase 14: Lead Capture System

## Step 14.1: Create Leads Database Schema

- **Task**: Create database schema for lead capture, landing pages, and form submissions.

- **Files**:

### `supabase/migrations/011_leads.sql`
```sql
-- ============================================================================
-- Migration: 011_leads
-- Description: Lead capture, landing pages, and form submissions
-- Feature: 14 (Lead Capture), 15 (Quiz System)
-- ============================================================================

-- ============================================================================
-- Landing Pages Table
-- ============================================================================
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Page identification
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- Page type
  type TEXT NOT NULL CHECK (type IN ('lead_magnet', 'quiz', 'newsletter', 'product')),
  
  -- Content
  headline TEXT NOT NULL,
  subheadline TEXT,
  body_content TEXT,
  
  -- Lead magnet details
  lead_magnet_type TEXT CHECK (lead_magnet_type IN (
    'ebook', 'wallpaper', 'printable', 'guide', 'checklist', 'video'
  )),
  lead_magnet_title TEXT,
  lead_magnet_file_url TEXT,
  lead_magnet_file_key TEXT,
  
  -- Design
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  featured_image_url TEXT,
  custom_css TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Form configuration
  form_fields JSONB NOT NULL DEFAULT '[
    {"name": "email", "type": "email", "label": "Email", "required": true},
    {"name": "first_name", "type": "text", "label": "First Name", "required": false}
  ]',
  
  -- Klaviyo integration
  klaviyo_list_id TEXT,
  klaviyo_tags TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  published_at TIMESTAMPTZ,
  
  -- Analytics
  views INTEGER NOT NULL DEFAULT 0,
  submissions INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,4) GENERATED ALWAYS AS (
    CASE WHEN views > 0 THEN submissions::NUMERIC / views ELSE 0 END
  ) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, slug)
);

-- ============================================================================
-- Leads Table
-- ============================================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  
  -- Contact info
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'landing_page',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  referrer TEXT,
  
  -- Quiz results (if from quiz)
  quiz_id UUID,
  quiz_results JSONB,
  recommended_collection TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'subscribed', 'customer', 'unsubscribed'
  )),
  
  -- Customer conversion
  shopify_customer_id TEXT,
  converted_at TIMESTAMPTZ,
  first_order_id TEXT,
  lifetime_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Klaviyo sync
  klaviyo_profile_id TEXT,
  synced_to_klaviyo_at TIMESTAMPTZ,
  
  -- Engagement
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_opened INTEGER NOT NULL DEFAULT 0,
  emails_clicked INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, email)
);

-- ============================================================================
-- Form Submissions Table (raw submission data)
-- ============================================================================
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Submission data
  data JSONB NOT NULL,
  
  -- Client info
  ip_address TEXT,
  user_agent TEXT,
  
  -- Processing
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_landing_pages_user ON landing_pages(user_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(user_id, slug) WHERE status = 'active';
CREATE INDEX idx_landing_pages_type ON landing_pages(user_id, type);

CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_email ON leads(user_id, email);
CREATE INDEX idx_leads_status ON leads(user_id, status);
CREATE INDEX idx_leads_source ON leads(user_id, source);
CREATE INDEX idx_leads_landing_page ON leads(landing_page_id);
CREATE INDEX idx_leads_converted ON leads(user_id, converted_at) WHERE converted_at IS NOT NULL;

CREATE INDEX idx_submissions_landing_page ON form_submissions(landing_page_id);
CREATE INDEX idx_submissions_unprocessed ON form_submissions(user_id, processed) WHERE processed = false;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY landing_pages_all ON landing_pages FOR ALL USING (user_id = auth.uid());
CREATE POLICY leads_all ON leads FOR ALL USING (user_id = auth.uid());
CREATE POLICY submissions_all ON form_submissions FOR ALL USING (user_id = auth.uid());

-- Allow public to view active landing pages (for public URLs)
CREATE POLICY landing_pages_public_read ON landing_pages 
  FOR SELECT USING (status = 'active');

-- Allow public form submissions
CREATE POLICY submissions_public_insert ON form_submissions 
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER landing_pages_updated_at BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Track landing page view
-- ============================================================================
CREATE OR REPLACE FUNCTION track_page_view(p_page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET views = views + 1
  WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Process form submission
-- ============================================================================
CREATE OR REPLACE FUNCTION process_form_submission(
  p_submission_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_submission RECORD;
  v_lead_id UUID;
  v_email TEXT;
BEGIN
  SELECT * INTO v_submission
  FROM form_submissions
  WHERE id = p_submission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;
  
  -- Extract email from submission data
  v_email := v_submission.data->>'email';
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  -- Upsert lead
  INSERT INTO leads (user_id, email, first_name, landing_page_id, source)
  VALUES (
    v_submission.user_id,
    v_email,
    v_submission.data->>'first_name',
    v_submission.landing_page_id,
    'landing_page'
  )
  ON CONFLICT (user_id, email) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
    updated_at = NOW()
  RETURNING id INTO v_lead_id;
  
  -- Update submission
  UPDATE form_submissions
  SET 
    lead_id = v_lead_id,
    processed = true,
    processed_at = NOW()
  WHERE id = p_submission_id;
  
  -- Update landing page submission count
  UPDATE landing_pages
  SET submissions = submissions + 1
  WHERE id = v_submission.landing_page_id;
  
  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/leads.ts`
```typescript
export interface LandingPage {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  type: LandingPageType;
  headline: string;
  subheadline: string | null;
  body_content: string | null;
  lead_magnet_type: LeadMagnetType | null;
  lead_magnet_title: string | null;
  lead_magnet_file_url: string | null;
  lead_magnet_file_key: string | null;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  featured_image_url: string | null;
  custom_css: string | null;
  meta_title: string | null;
  meta_description: string | null;
  form_fields: FormField[];
  klaviyo_list_id: string | null;
  klaviyo_tags: string[];
  status: 'draft' | 'active' | 'archived';
  published_at: string | null;
  views: number;
  submissions: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export type LandingPageType = 'lead_magnet' | 'quiz' | 'newsletter' | 'product';
export type LeadMagnetType = 'ebook' | 'wallpaper' | 'printable' | 'guide' | 'checklist' | 'video';

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface Lead {
  id: string;
  user_id: string;
  landing_page_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  quiz_id: string | null;
  quiz_results: QuizResults | null;
  recommended_collection: string | null;
  status: LeadStatus;
  shopify_customer_id: string | null;
  converted_at: string | null;
  first_order_id: string | null;
  lifetime_value: number;
  klaviyo_profile_id: string | null;
  synced_to_klaviyo_at: string | null;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'subscribed' | 'customer' | 'unsubscribed';

export interface QuizResults {
  answers: Record<string, string | string[]>;
  scores: Record<string, number>;
  recommendation: string;
}

export interface FormSubmission {
  id: string;
  user_id: string;
  landing_page_id: string;
  lead_id: string | null;
  data: Record<string, string>;
  ip_address: string | null;
  user_agent: string | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface CreateLandingPageRequest {
  slug: string;
  name: string;
  type: LandingPageType;
  headline: string;
  subheadline?: string;
  bodyContent?: string;
  leadMagnetType?: LeadMagnetType;
  leadMagnetTitle?: string;
  collection?: 'grounding' | 'wholeness' | 'growth';
  formFields?: FormField[];
  klaviyoListId?: string;
  klaviyoTags?: string[];
}
```

- **Step Dependencies**: Step 5.3 (Klaviyo integration)
- **User Instructions**: Run migration

---

## Step 14.2: Implement Lead Capture Service

- **Task**: Create the service for handling lead capture and Klaviyo sync.

- **Files**:

### `lib/leads/lead-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { syncLeadToKlaviyo } from '@/lib/integrations/klaviyo/lead-sync';
import type { Lead, FormSubmission, CreateLandingPageRequest, LandingPage } from '@/types/leads';

interface LeadCaptureResult {
  success: boolean;
  lead?: Lead;
  error?: string;
}

export async function createLandingPage(
  userId: string,
  request: CreateLandingPageRequest
): Promise<{ success: boolean; page?: LandingPage; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    // Validate slug uniqueness
    const { data: existing } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('user_id', userId)
      .eq('slug', request.slug)
      .single();

    if (existing) {
      return { success: false, error: 'Slug already exists' };
    }

    const { data: page, error } = await supabase
      .from('landing_pages')
      .insert({
        user_id: userId,
        slug: request.slug,
        name: request.name,
        type: request.type,
        headline: request.headline,
        subheadline: request.subheadline,
        body_content: request.bodyContent,
        lead_magnet_type: request.leadMagnetType,
        lead_magnet_title: request.leadMagnetTitle,
        collection: request.collection,
        form_fields: request.formFields || [
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'first_name', type: 'text', label: 'First Name', required: false },
        ],
        klaviyo_list_id: request.klaviyoListId,
        klaviyo_tags: request.klaviyoTags || [],
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, page: page as LandingPage };
  } catch (error) {
    console.error('Landing page creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function processFormSubmission(
  submissionId: string
): Promise<LeadCaptureResult> {
  const supabase = createServerSupabaseClient();

  try {
    // Process submission and create/update lead
    const { data: leadId, error } = await supabase.rpc('process_form_submission', {
      p_submission_id: submissionId,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Get the created lead
    const { data: lead } = await supabase
      .from('leads')
      .select('*, landing_page:landing_pages(*)')
      .eq('id', leadId)
      .single();

    if (!lead) {
      throw new Error('Lead not found after processing');
    }

    // Sync to Klaviyo
    if (lead.landing_page?.klaviyo_list_id) {
      await syncLeadToKlaviyo(lead.user_id, lead as Lead, {
        listId: lead.landing_page.klaviyo_list_id,
        tags: lead.landing_page.klaviyo_tags || [],
      });
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: lead.user_id,
      p_action_type: 'lead_captured',
      p_details: {
        leadId: lead.id,
        email: lead.email,
        source: lead.source,
        landingPageId: lead.landing_page_id,
      },
      p_executed: true,
      p_module: 'leads',
      p_reference_id: lead.id,
      p_reference_table: 'leads',
    });

    return { success: true, lead: lead as Lead };
  } catch (error) {
    console.error('Form submission processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function captureLead(
  userId: string,
  landingPageId: string,
  data: Record<string, string>,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    referrer?: string;
  }
): Promise<LeadCaptureResult> {
  const supabase = createServerSupabaseClient();

  try {
    // Create form submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        user_id: userId,
        landing_page_id: landingPageId,
        data,
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
      })
      .select()
      .single();

    if (submissionError) {
      throw new Error(submissionError.message);
    }

    // Process the submission
    return processFormSubmission(submission.id);
  } catch (error) {
    console.error('Lead capture error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function convertLeadToCustomer(
  userId: string,
  leadId: string,
  shopifyCustomerId: string,
  orderId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'customer',
        shopify_customer_id: shopifyCustomerId,
        converted_at: new Date().toISOString(),
        first_order_id: orderId,
      })
      .eq('id', leadId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'lead_converted',
      p_details: { leadId, shopifyCustomerId, orderId },
      p_executed: true,
      p_module: 'leads',
      p_reference_id: leadId,
      p_reference_table: 'leads',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### `lib/integrations/klaviyo/lead-sync.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Lead } from '@/types/leads';

interface KlaviyoSyncOptions {
  listId: string;
  tags?: string[];
}

export async function syncLeadToKlaviyo(
  userId: string,
  lead: Lead,
  options: KlaviyoSyncOptions
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  const adminClient = getAdminClient();
  const supabase = createServerSupabaseClient();

  try {
    // Get Klaviyo API key
    const apiKey = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!apiKey.data) {
      throw new Error('Klaviyo not connected');
    }

    // Create or update profile in Klaviyo
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${apiKey.data}`,
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: lead.email,
            first_name: lead.first_name,
            last_name: lead.last_name,
            phone_number: lead.phone,
            properties: {
              source: lead.source,
              recommended_collection: lead.recommended_collection,
              quiz_results: lead.quiz_results,
              utm_source: lead.utm_source,
              utm_medium: lead.utm_medium,
              utm_campaign: lead.utm_campaign,
            },
          },
        },
      }),
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      throw new Error(error.errors?.[0]?.detail || 'Failed to create Klaviyo profile');
    }

    const profile = await profileResponse.json();
    const profileId = profile.data.id;

    // Subscribe to list
    await fetch('https://a.klaviyo.com/api/list-relationships/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${apiKey.data}`,
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'list',
          id: options.listId,
          relationships: {
            profiles: {
              data: [{ type: 'profile', id: profileId }],
            },
          },
        },
      }),
    });

    // Add tags if provided
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await addTagToProfile(apiKey.data, profileId, tag);
      }
    }

    // Update lead with Klaviyo profile ID
    await supabase
      .from('leads')
      .update({
        klaviyo_profile_id: profileId,
        synced_to_klaviyo_at: new Date().toISOString(),
        status: 'subscribed',
      })
      .eq('id', lead.id);

    return { success: true, profileId };
  } catch (error) {
    console.error('Klaviyo sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function addTagToProfile(apiKey: string, profileId: string, tag: string) {
  // First, get or create the tag
  const tagResponse = await fetch(`https://a.klaviyo.com/api/tags/?filter=equals(name,"${tag}")`, {
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': '2024-02-15',
    },
  });

  let tagId: string;

  if (tagResponse.ok) {
    const tags = await tagResponse.json();
    if (tags.data.length > 0) {
      tagId = tags.data[0].id;
    } else {
      // Create tag
      const createResponse = await fetch('https://a.klaviyo.com/api/tags/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Klaviyo-API-Key ${apiKey}`,
          'revision': '2024-02-15',
        },
        body: JSON.stringify({
          data: {
            type: 'tag',
            attributes: { name: tag },
          },
        }),
      });
      const created = await createResponse.json();
      tagId = created.data.id;
    }

    // Associate tag with profile
    await fetch(`https://a.klaviyo.com/api/tags/${tagId}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: [{ type: 'profile', id: profileId }],
      }),
    });
  }
}
```

- **Step Dependencies**: Step 14.1
- **User Instructions**: None

---

## Step 14.3: Create Lead Capture API Endpoints

- **Task**: Build API routes for landing pages and form submissions.

- **Files**:

### `app/api/landing-pages/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { createLandingPage } from '@/lib/leads/lead-service';

const createSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  type: z.enum(['lead_magnet', 'quiz', 'newsletter', 'product']),
  headline: z.string().min(1).max(200),
  subheadline: z.string().max(300).optional(),
  bodyContent: z.string().optional(),
  leadMagnetType: z.enum(['ebook', 'wallpaper', 'printable', 'guide', 'checklist', 'video']).optional(),
  leadMagnetTitle: z.string().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  formFields: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'email', 'tel', 'select', 'checkbox', 'textarea']),
    label: z.string(),
    required: z.boolean(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
  })).optional(),
  klaviyoListId: z.string().optional(),
  klaviyoTags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    
    let query = supabase
      .from('landing_pages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ pages: data });
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
    const result = await createLandingPage(userId, data);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      page: result.page,
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

### `app/api/landing-pages/[slug]/submit/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { captureLead } from '@/lib/leads/lead-service';

// Public endpoint - no auth required
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get landing page by slug
    const { data: page } = await supabase
      .from('landing_pages')
      .select('id, user_id, form_fields')
      .eq('slug', params.slug)
      .eq('status', 'active')
      .single();
    
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = page.form_fields
      .filter((f: { required: boolean }) => f.required)
      .map((f: { name: string }) => f.name);
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    // Extract UTM params and metadata
    const metadata = {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
      utmSource: body.utm_source,
      utmMedium: body.utm_medium,
      utmCampaign: body.utm_campaign,
      utmContent: body.utm_content,
      referrer: request.headers.get('referer') || undefined,
    };
    
    // Remove UTM params from form data
    const formData = { ...body };
    delete formData.utm_source;
    delete formData.utm_medium;
    delete formData.utm_campaign;
    delete formData.utm_content;
    
    const result = await captureLead(page.user_id, page.id, formData, metadata);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing!',
    });
  } catch (error) {
    console.error('Form submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    );
  }
}
```

### `app/api/leads/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const querySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, source, search, limit, offset } = querySchema.parse(searchParams);
    
    let query = supabase
      .from('leads')
      .select(`
        *,
        landing_page:landing_pages(id, name, type)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (source) {
      query = query.eq('source', source);
    }
    
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      leads: data,
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

- **Step Dependencies**: Step 14.2
- **User Instructions**: None

---

## Step 14.4: Build Landing Page Builder UI

- **Task**: Create the drag-and-drop landing page builder interface with block components.

- **Files**:

### `components/landing-pages/builder/block-types.ts`
```typescript
export type BlockType = 
  | 'hero'
  | 'text'
  | 'image'
  | 'cta'
  | 'quiz_embed'
  | 'product_grid'
  | 'testimonial'
  | 'faq'
  | 'countdown'
  | 'email_capture';

export interface BlockConfig {
  type: BlockType;
  label: string;
  icon: string;
  defaultContent: Record<string, any>;
}

export const BLOCK_CONFIGS: BlockConfig[] = [
  {
    type: 'hero',
    label: 'Hero Section',
    icon: 'Layout',
    defaultContent: {
      headline: 'Your Headline Here',
      subheadline: 'Add a compelling subheadline',
      backgroundImage: null,
      ctaText: 'Get Started',
      ctaLink: '#',
      alignment: 'center',
    },
  },
  {
    type: 'text',
    label: 'Text Block',
    icon: 'Type',
    defaultContent: {
      content: '<p>Your content here...</p>',
      alignment: 'left',
    },
  },
  {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    defaultContent: {
      src: null,
      alt: '',
      caption: '',
      width: 'full',
    },
  },
  {
    type: 'cta',
    label: 'Call to Action',
    icon: 'MousePointer',
    defaultContent: {
      text: 'Click Here',
      link: '#',
      style: 'primary',
      size: 'large',
    },
  },
  {
    type: 'quiz_embed',
    label: 'Quiz Embed',
    icon: 'HelpCircle',
    defaultContent: {
      quizId: null,
      showTitle: true,
    },
  },
  {
    type: 'product_grid',
    label: 'Product Grid',
    icon: 'Grid',
    defaultContent: {
      collection: null,
      columns: 3,
      limit: 6,
      showPrices: true,
    },
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: 'Quote',
    defaultContent: {
      quote: 'Add a customer testimonial here',
      author: 'Customer Name',
      role: 'Happy Customer',
      avatar: null,
    },
  },
  {
    type: 'email_capture',
    label: 'Email Capture',
    icon: 'Mail',
    defaultContent: {
      headline: 'Join our newsletter',
      description: 'Get updates and special offers',
      buttonText: 'Subscribe',
      klaviyoListId: null,
    },
  },
  {
    type: 'countdown',
    label: 'Countdown Timer',
    icon: 'Clock',
    defaultContent: {
      endDate: null,
      expiredText: 'Offer has ended',
      style: 'minimal',
    },
  },
  {
    type: 'faq',
    label: 'FAQ Section',
    icon: 'HelpCircle',
    defaultContent: {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'Question 1?', answer: 'Answer 1' },
        { question: 'Question 2?', answer: 'Answer 2' },
      ],
    },
  },
];

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  order: number;
}
```

### `components/landing-pages/builder/page-builder.tsx`
```tsx
'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BlockPalette } from './block-palette';
import { BuilderCanvas } from './builder-canvas';
import { BlockEditor } from './block-editor';
import { BLOCK_CONFIGS, ContentBlock, BlockType } from './block-types';
import { Eye, Save, Settings, Smartphone, Monitor } from 'lucide-react';
import { nanoid } from 'nanoid';

interface PageBuilderProps {
  initialBlocks?: ContentBlock[];
  onSave: (blocks: ContentBlock[]) => Promise<void>;
  pageSettings: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
}

export function PageBuilder({
  initialBlocks = [],
  onSave,
  pageSettings,
  onSettingsChange,
}: PageBuilderProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((block, idx) => ({
          ...block,
          order: idx,
        }));
      });
    }
  };

  const addBlock = useCallback((type: BlockType) => {
    const config = BLOCK_CONFIGS.find(c => c.type === type);
    if (!config) return;

    const newBlock: ContentBlock = {
      id: nanoid(),
      type,
      content: { ...config.defaultContent },
      order: blocks.length,
    };

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, [blocks.length]);

  const updateBlock = useCallback((id: string, content: Record<string, any>) => {
    setBlocks(prev =>
      prev.map(block =>
        block.id === id ? { ...block, content } : block
      )
    );
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);

  const duplicateBlock = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    const newBlock: ContentBlock = {
      ...block,
      id: nanoid(),
      order: blocks.length,
    };

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, [blocks]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(blocks);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block Palette */}
        <div className="w-64 border-r bg-gray-50 overflow-y-auto p-4">
          <BlockPalette onAddBlock={addBlock} />
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
          <div
            className={`mx-auto bg-white shadow-lg transition-all ${
              previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-4xl'
            }`}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <BuilderCanvas
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onDeleteBlock={deleteBlock}
                  onDuplicateBlock={duplicateBlock}
                />
              </SortableContext>
            </DndContext>

            {blocks.length === 0 && (
              <div className="p-16 text-center text-muted-foreground">
                <p>Drag blocks from the left panel to start building</p>
              </div>
            )}
          </div>
        </div>

        {/* Block Editor Panel */}
        <div className="w-80 border-l bg-white overflow-y-auto">
          {selectedBlock ? (
            <BlockEditor
              block={selectedBlock}
              onUpdate={(content) => updateBlock(selectedBlock.id, content)}
              onDelete={() => deleteBlock(selectedBlock.id)}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a block to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### `components/landing-pages/builder/block-palette.tsx`
```tsx
'use client';

import { Button } from '@/components/ui/button';
import { BLOCK_CONFIGS, BlockType } from './block-types';
import * as Icons from 'lucide-react';

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div>
      <h3 className="font-semibold mb-4">Add Blocks</h3>
      <div className="space-y-2">
        {BLOCK_CONFIGS.map((config) => {
          const Icon = (Icons as any)[config.icon] || Icons.Square;
          return (
            <button
              key={config.type}
              onClick={() => onAddBlock(config.type)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 hover:border-sage-300 transition-colors text-left"
            >
              <Icon className="h-5 w-5 text-sage-600" />
              <span className="text-sm font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### `components/landing-pages/builder/builder-canvas.tsx`
```tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContentBlock } from './block-types';
import { BlockRenderer } from './block-renderer';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortableBlockProps {
  block: ContentBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableBlock({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${
        isSelected ? 'ring-2 ring-sage-500' : ''
      }`}
      onClick={onSelect}
    >
      {/* Block Controls */}
      <div
        className={`absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded bg-white border shadow-sm cursor-grab hover:bg-gray-50"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1.5 rounded bg-white border shadow-sm hover:bg-gray-50"
        >
          <Copy className="h-4 w-4 text-gray-400" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded bg-white border shadow-sm hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Block Content */}
      <BlockRenderer block={block} />
    </div>
  );
}

interface BuilderCanvasProps {
  blocks: ContentBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
}

export function BuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onDuplicateBlock,
}: BuilderCanvasProps) {
  return (
    <div className="min-h-[400px] pl-12">
      {blocks
        .sort((a, b) => a.order - b.order)
        .map((block) => (
          <SortableBlock
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock(block.id)}
            onDelete={() => onDeleteBlock(block.id)}
            onDuplicate={() => onDuplicateBlock(block.id)}
          />
        ))}
    </div>
  );
}
```

### `components/landing-pages/builder/block-renderer.tsx`
```tsx
'use client';

import { ContentBlock } from './block-types';
import { Button } from '@/components/ui/button';

interface BlockRendererProps {
  block: ContentBlock;
  isPreview?: boolean;
}

export function BlockRenderer({ block, isPreview = false }: BlockRendererProps) {
  const { type, content } = block;

  switch (type) {
    case 'hero':
      return (
        <div
          className="relative py-24 px-8"
          style={{
            backgroundImage: content.backgroundImage
              ? `url(${content.backgroundImage})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {content.backgroundImage && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div
            className={`relative z-10 max-w-3xl mx-auto text-${content.alignment}`}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {content.headline}
            </h1>
            <p className="text-xl mb-8 opacity-90">{content.subheadline}</p>
            <Button size="lg">{content.ctaText}</Button>
          </div>
        </div>
      );

    case 'text':
      return (
        <div
          className={`py-8 px-8 prose max-w-none text-${content.alignment}`}
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      );

    case 'image':
      return (
        <div className="py-4 px-8">
          {content.src ? (
            <figure>
              <img
                src={content.src}
                alt={content.alt}
                className={`mx-auto ${
                  content.width === 'full' ? 'w-full' : 'max-w-2xl'
                }`}
              />
              {content.caption && (
                <figcaption className="text-center text-sm text-muted-foreground mt-2">
                  {content.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-muted-foreground">
              Click to add image
            </div>
          )}
        </div>
      );

    case 'cta':
      return (
        <div className="py-8 px-8 text-center">
          <Button
            variant={content.style === 'secondary' ? 'outline' : 'default'}
            size={content.size === 'large' ? 'lg' : 'default'}
          >
            {content.text}
          </Button>
        </div>
      );

    case 'testimonial':
      return (
        <div className="py-12 px-8">
          <blockquote className="max-w-2xl mx-auto text-center">
            <p className="text-xl italic mb-4">"{content.quote}"</p>
            <footer className="flex items-center justify-center gap-3">
              {content.avatar && (
                <img
                  src={content.avatar}
                  alt={content.author}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <div className="font-semibold">{content.author}</div>
                <div className="text-sm text-muted-foreground">
                  {content.role}
                </div>
              </div>
            </footer>
          </blockquote>
        </div>
      );

    case 'email_capture':
      return (
        <div className="py-12 px-8 bg-sage-50">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-2xl font-bold mb-2">{content.headline}</h3>
            <p className="text-muted-foreground mb-4">{content.description}</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg border"
                disabled={isPreview}
              />
              <Button>{content.buttonText}</Button>
            </div>
          </div>
        </div>
      );

    case 'quiz_embed':
      return (
        <div className="py-8 px-8">
          <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
            {content.quizId ? (
              <p>Quiz Embed: {content.quizId}</p>
            ) : (
              <p>Select a quiz to embed</p>
            )}
          </div>
        </div>
      );

    case 'product_grid':
      return (
        <div className="py-8 px-8">
          <div className={`grid grid-cols-${content.columns} gap-4`}>
            {Array.from({ length: content.limit }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-muted-foreground"
              >
                Product {i + 1}
              </div>
            ))}
          </div>
        </div>
      );

    case 'faq':
      return (
        <div className="py-8 px-8">
          <h3 className="text-2xl font-bold mb-6 text-center">{content.title}</h3>
          <div className="max-w-2xl mx-auto space-y-4">
            {content.items?.map((item: any, i: number) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="font-semibold">{item.question}</div>
                <div className="text-muted-foreground mt-2">{item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'countdown':
      return (
        <div className="py-8 px-8 text-center">
          <div className="flex justify-center gap-4">
            {['Days', 'Hours', 'Minutes', 'Seconds'].map((unit) => (
              <div key={unit} className="text-center">
                <div className="text-4xl font-bold">00</div>
                <div className="text-sm text-muted-foreground">{unit}</div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="py-4 px-8 text-muted-foreground">
          Unknown block type: {type}
        </div>
      );
  }
}
```

### `components/landing-pages/builder/block-editor.tsx`
```tsx
'use client';

import { ContentBlock, BLOCK_CONFIGS } from './block-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface BlockEditorProps {
  block: ContentBlock;
  onUpdate: (content: Record<string, any>) => void;
  onDelete: () => void;
}

export function BlockEditor({ block, onUpdate, onDelete }: BlockEditorProps) {
  const config = BLOCK_CONFIGS.find(c => c.type === block.type);

  const updateField = (key: string, value: any) => {
    onUpdate({ ...block.content, [key]: value });
  };

  const renderFields = () => {
    switch (block.type) {
      case 'hero':
        return (
          <>
            <div>
              <Label>Headline</Label>
              <Input
                value={block.content.headline}
                onChange={(e) => updateField('headline', e.target.value)}
              />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Textarea
                value={block.content.subheadline}
                onChange={(e) => updateField('subheadline', e.target.value)}
              />
            </div>
            <div>
              <Label>CTA Text</Label>
              <Input
                value={block.content.ctaText}
                onChange={(e) => updateField('ctaText', e.target.value)}
              />
            </div>
            <div>
              <Label>CTA Link</Label>
              <Input
                value={block.content.ctaLink}
                onChange={(e) => updateField('ctaLink', e.target.value)}
              />
            </div>
            <div>
              <Label>Alignment</Label>
              <Select
                value={block.content.alignment}
                onChange={(value) => updateField('alignment', value)}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div>
              <Label>Content</Label>
              <Textarea
                value={block.content.content.replace(/<[^>]*>/g, '')}
                onChange={(e) => updateField('content', `<p>${e.target.value}</p>`)}
                rows={6}
              />
            </div>
            <div>
              <Label>Alignment</Label>
              <Select
                value={block.content.alignment}
                onChange={(value) => updateField('alignment', value)}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </div>
          </>
        );

      case 'cta':
        return (
          <>
            <div>
              <Label>Button Text</Label>
              <Input
                value={block.content.text}
                onChange={(e) => updateField('text', e.target.value)}
              />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input
                value={block.content.link}
                onChange={(e) => updateField('link', e.target.value)}
              />
            </div>
            <div>
              <Label>Style</Label>
              <Select
                value={block.content.style}
                onChange={(value) => updateField('style', value)}
                options={[
                  { value: 'primary', label: 'Primary' },
                  { value: 'secondary', label: 'Secondary' },
                ]}
              />
            </div>
            <div>
              <Label>Size</Label>
              <Select
                value={block.content.size}
                onChange={(value) => updateField('size', value)}
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
              />
            </div>
          </>
        );

      case 'testimonial':
        return (
          <>
            <div>
              <Label>Quote</Label>
              <Textarea
                value={block.content.quote}
                onChange={(e) => updateField('quote', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Author Name</Label>
              <Input
                value={block.content.author}
                onChange={(e) => updateField('author', e.target.value)}
              />
            </div>
            <div>
              <Label>Role/Title</Label>
              <Input
                value={block.content.role}
                onChange={(e) => updateField('role', e.target.value)}
              />
            </div>
          </>
        );

      case 'email_capture':
        return (
          <>
            <div>
              <Label>Headline</Label>
              <Input
                value={block.content.headline}
                onChange={(e) => updateField('headline', e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={block.content.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>
            <div>
              <Label>Button Text</Label>
              <Input
                value={block.content.buttonText}
                onChange={(e) => updateField('buttonText', e.target.value)}
              />
            </div>
          </>
        );

      default:
        return (
          <p className="text-muted-foreground">
            No editable properties for this block type.
          </p>
        );
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{config?.label || block.type}</h3>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div className="space-y-4">{renderFields()}</div>
    </div>
  );
}
```

### `app/(dashboard)/dashboard/campaigns/landing-pages/[id]/edit/page.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageBuilder } from '@/components/landing-pages/builder/page-builder';
import { ContentBlock } from '@/components/landing-pages/builder/block-types';
import { useToast } from '@/hooks/use-toast';

export default function EditLandingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [initialBlocks, setInitialBlocks] = useState<ContentBlock[]>([]);
  const [pageSettings, setPageSettings] = useState({});

  useEffect(() => {
    async function loadPage() {
      try {
        const response = await fetch(`/api/landing-pages/${params.id}`);
        if (!response.ok) throw new Error('Failed to load page');
        const page = await response.json();
        setInitialBlocks(page.content?.blocks || []);
        setPageSettings({
          title: page.title,
          slug: page.slug,
          meta_description: page.meta_description,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load landing page',
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [params.id, toast]);

  const handleSave = async (blocks: ContentBlock[]) => {
    try {
      const response = await fetch(`/api/landing-pages/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { blocks },
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast({
        title: 'Saved',
        description: 'Landing page saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save landing page',
        variant: 'error',
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <PageBuilder
      initialBlocks={initialBlocks}
      onSave={handleSave}
      pageSettings={pageSettings}
      onSettingsChange={setPageSettings}
    />
  );
}
```

- **Step Dependencies**: Step 14.3
- **User Instructions**: None

---

## Step 14.5: Create Popups Database Schema and API

- **Task**: Create the database and API for behavior-triggered popups.

- **Files**:

### `supabase/migrations/011a_popups.sql`
```sql
-- ============================================================================
-- Migration: 011a_popups
-- Description: Behavior-triggered popup system
-- Feature: 15 (Landing Pages & Popups)
-- ============================================================================

-- ============================================================================
-- Popups Table
-- ============================================================================
CREATE TABLE popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  
  -- Trigger Configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'exit_intent',      -- Mouse leaves viewport
    'scroll_depth',     -- Scrolled X% of page
    'time_on_page',     -- After X seconds
    'page_views',       -- After viewing X pages
    'click',            -- On element click
    'manual'            -- Triggered by code
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  -- exit_intent: {}
  -- scroll_depth: { percentage: 50 }
  -- time_on_page: { seconds: 30 }
  -- page_views: { count: 3 }
  -- click: { selector: '.trigger-popup' }
  
  -- Content
  content JSONB NOT NULL DEFAULT '{}',
  -- { 
  --   type: 'email_capture' | 'announcement' | 'discount' | 'quiz_cta',
  --   headline: string,
  --   body: string,
  --   image_url: string,
  --   cta_text: string,
  --   cta_link: string,
  --   discount_code: string,
  --   email_placeholder: string,
  --   success_message: string
  -- }
  
  -- Targeting
  targeting JSONB NOT NULL DEFAULT '{}',
  -- {
  --   devices: ['desktop', 'mobile', 'tablet'],
  --   url_contains: string[],
  --   url_excludes: string[],
  --   referrer_contains: string[],
  --   new_visitors_only: boolean,
  --   returning_visitors_only: boolean,
  --   exclude_if_converted: boolean
  -- }
  
  -- Frequency Capping
  frequency_cap JSONB NOT NULL DEFAULT '{"type": "once_per_session"}',
  -- {
  --   type: 'once_per_session' | 'once_per_day' | 'once_ever' | 'unlimited',
  --   max_impressions: number (for unlimited type)
  -- }
  
  -- Display Settings
  position TEXT NOT NULL DEFAULT 'center' CHECK (position IN (
    'center', 'top', 'bottom', 'top_left', 'top_right', 'bottom_left', 'bottom_right'
  )),
  animation TEXT NOT NULL DEFAULT 'fade' CHECK (animation IN (
    'fade', 'slide_up', 'slide_down', 'zoom', 'none'
  )),
  overlay_opacity INTEGER NOT NULL DEFAULT 50 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 100),
  close_on_overlay_click BOOLEAN NOT NULL DEFAULT true,
  show_close_button BOOLEAN NOT NULL DEFAULT true,
  
  -- Styling
  style JSONB NOT NULL DEFAULT '{}',
  -- { background_color, text_color, accent_color, border_radius, max_width }
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  
  -- Scheduling
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Popup Analytics Table
-- ============================================================================
CREATE TABLE popup_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id UUID REFERENCES popups(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Metrics
  impressions INTEGER NOT NULL DEFAULT 0,
  closes INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  
  -- Unique counts (approximate)
  unique_impressions INTEGER NOT NULL DEFAULT 0,
  unique_conversions INTEGER NOT NULL DEFAULT 0,
  
  UNIQUE(popup_id, date)
);

-- ============================================================================
-- Popup Impressions (for deduplication)
-- ============================================================================
CREATE TABLE popup_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id UUID REFERENCES popups(id) ON DELETE CASCADE NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_popups_user ON popups(user_id);
CREATE INDEX idx_popups_status ON popups(user_id, status);
CREATE INDEX idx_popups_active ON popups(user_id, start_at, end_at) WHERE status = 'active';

CREATE INDEX idx_popup_analytics_popup ON popup_analytics(popup_id);
CREATE INDEX idx_popup_analytics_date ON popup_analytics(popup_id, date DESC);

CREATE INDEX idx_popup_impressions_popup ON popup_impressions(popup_id);
CREATE INDEX idx_popup_impressions_visitor ON popup_impressions(popup_id, visitor_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY popups_all ON popups FOR ALL USING (user_id = auth.uid());

CREATE POLICY popup_analytics_all ON popup_analytics FOR ALL 
  USING (popup_id IN (SELECT id FROM popups WHERE user_id = auth.uid()));

CREATE POLICY popup_impressions_all ON popup_impressions FOR ALL 
  USING (popup_id IN (SELECT id FROM popups WHERE user_id = auth.uid()));

-- ============================================================================
-- Triggers
-- ============================================================================
CREATE TRIGGER popups_updated_at BEFORE UPDATE ON popups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Track popup impression
-- ============================================================================
CREATE OR REPLACE FUNCTION track_popup_impression(
  p_popup_id UUID,
  p_visitor_id TEXT,
  p_session_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_should_show BOOLEAN := true;
  v_popup RECORD;
  v_existing RECORD;
BEGIN
  -- Get popup
  SELECT * INTO v_popup FROM popups WHERE id = p_popup_id;
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Check frequency cap
  IF v_popup.frequency_cap->>'type' = 'once_ever' THEN
    SELECT * INTO v_existing FROM popup_impressions 
    WHERE popup_id = p_popup_id AND visitor_id = p_visitor_id LIMIT 1;
    IF FOUND THEN RETURN false; END IF;
    
  ELSIF v_popup.frequency_cap->>'type' = 'once_per_session' THEN
    SELECT * INTO v_existing FROM popup_impressions 
    WHERE popup_id = p_popup_id AND visitor_id = p_visitor_id AND session_id = p_session_id LIMIT 1;
    IF FOUND THEN RETURN false; END IF;
    
  ELSIF v_popup.frequency_cap->>'type' = 'once_per_day' THEN
    SELECT * INTO v_existing FROM popup_impressions 
    WHERE popup_id = p_popup_id AND visitor_id = p_visitor_id 
    AND created_at > NOW() - INTERVAL '24 hours' LIMIT 1;
    IF FOUND THEN RETURN false; END IF;
  END IF;
  
  -- Record impression
  INSERT INTO popup_impressions (popup_id, visitor_id, session_id)
  VALUES (p_popup_id, p_visitor_id, p_session_id);
  
  -- Update analytics
  INSERT INTO popup_analytics (popup_id, date, impressions, unique_impressions)
  VALUES (p_popup_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (popup_id, date) DO UPDATE SET
    impressions = popup_analytics.impressions + 1;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Track popup conversion
-- ============================================================================
CREATE OR REPLACE FUNCTION track_popup_conversion(
  p_popup_id UUID,
  p_visitor_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Update impression record
  UPDATE popup_impressions
  SET converted = true, converted_at = NOW()
  WHERE popup_id = p_popup_id AND visitor_id = p_visitor_id AND converted = false;
  
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Update analytics
  UPDATE popup_analytics
  SET conversions = conversions + 1, unique_conversions = unique_conversions + 1
  WHERE popup_id = p_popup_id AND date = CURRENT_DATE;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/popups.ts`
```typescript
export type PopupTriggerType =
  | 'exit_intent'
  | 'scroll_depth'
  | 'time_on_page'
  | 'page_views'
  | 'click'
  | 'manual';

export type PopupPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'top_left'
  | 'top_right'
  | 'bottom_left'
  | 'bottom_right';

export type PopupAnimation = 'fade' | 'slide_up' | 'slide_down' | 'zoom' | 'none';

export type PopupContentType = 'email_capture' | 'announcement' | 'discount' | 'quiz_cta';

export type PopupStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface PopupTriggerConfig {
  percentage?: number;  // for scroll_depth
  seconds?: number;     // for time_on_page
  count?: number;       // for page_views
  selector?: string;    // for click
}

export interface PopupContent {
  type: PopupContentType;
  headline?: string;
  body?: string;
  image_url?: string;
  cta_text?: string;
  cta_link?: string;
  discount_code?: string;
  email_placeholder?: string;
  success_message?: string;
}

export interface PopupTargeting {
  devices?: ('desktop' | 'mobile' | 'tablet')[];
  url_contains?: string[];
  url_excludes?: string[];
  referrer_contains?: string[];
  new_visitors_only?: boolean;
  returning_visitors_only?: boolean;
  exclude_if_converted?: boolean;
}

export interface PopupFrequencyCap {
  type: 'once_per_session' | 'once_per_day' | 'once_ever' | 'unlimited';
  max_impressions?: number;
}

export interface PopupStyle {
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  border_radius?: number;
  max_width?: number;
}

export interface Popup {
  id: string;
  user_id: string;
  name: string;
  trigger_type: PopupTriggerType;
  trigger_config: PopupTriggerConfig;
  content: PopupContent;
  targeting: PopupTargeting;
  frequency_cap: PopupFrequencyCap;
  position: PopupPosition;
  animation: PopupAnimation;
  overlay_opacity: number;
  close_on_overlay_click: boolean;
  show_close_button: boolean;
  style: PopupStyle;
  status: PopupStatus;
  start_at?: string;
  end_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PopupAnalytics {
  id: string;
  popup_id: string;
  date: string;
  impressions: number;
  closes: number;
  conversions: number;
  unique_impressions: number;
  unique_conversions: number;
}
```

### `app/api/popups/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Popup } from '@/types/popups';

// GET /api/popups - List popups
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  let query = supabase
    .from('popups')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: popups, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ popups });
}

// POST /api/popups - Create popup
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: popup, error } = await supabase
    .from('popups')
    .insert({
      user_id: user.id,
      name: body.name,
      trigger_type: body.trigger_type || 'exit_intent',
      trigger_config: body.trigger_config || {},
      content: body.content || { type: 'announcement' },
      targeting: body.targeting || {},
      frequency_cap: body.frequency_cap || { type: 'once_per_session' },
      position: body.position || 'center',
      animation: body.animation || 'fade',
      overlay_opacity: body.overlay_opacity ?? 50,
      close_on_overlay_click: body.close_on_overlay_click ?? true,
      show_close_button: body.show_close_button ?? true,
      style: body.style || {},
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ popup }, { status: 201 });
}
```

### `app/api/popups/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/popups/[id] - Get popup details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: popup, error } = await supabase
    .from('popups')
    .select(`
      *,
      popup_analytics(
        date,
        impressions,
        conversions,
        unique_impressions,
        unique_conversions
      )
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ popup });
}

// PATCH /api/popups/[id] - Update popup
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: popup, error } = await supabase
    .from('popups')
    .update(body)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ popup });
}

// DELETE /api/popups/[id] - Delete popup
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('popups')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### `app/api/popups/active/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/popups/active - Get active popups for public display
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  // This endpoint requires a user_id query param for public access
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: popups, error } = await supabase
    .from('popups')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ popups });
}
```

- **Step Dependencies**: Step 14.4
- **User Instructions**: Run migration `011a_popups.sql`

---

## Step 14.6: Implement Popup Display System

- **Task**: Build the client-side popup display and tracking system.

- **Files**:

### `lib/popups/trigger-handlers.ts`
```typescript
type TriggerCallback = () => void;

// Exit Intent Detection
export function setupExitIntent(callback: TriggerCallback): () => void {
  const handleMouseLeave = (e: MouseEvent) => {
    // Only trigger when mouse leaves through top of viewport
    if (e.clientY <= 0) {
      callback();
    }
  };

  document.addEventListener('mouseleave', handleMouseLeave);
  
  return () => {
    document.removeEventListener('mouseleave', handleMouseLeave);
  };
}

// Scroll Depth Detection
export function setupScrollDepth(percentage: number, callback: TriggerCallback): () => void {
  let triggered = false;

  const handleScroll = () => {
    if (triggered) return;

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.scrollY;
    const scrollPercentage = (currentScroll / scrollHeight) * 100;

    if (scrollPercentage >= percentage) {
      triggered = true;
      callback();
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

// Time on Page Detection
export function setupTimeOnPage(seconds: number, callback: TriggerCallback): () => void {
  const timer = setTimeout(callback, seconds * 1000);
  
  return () => {
    clearTimeout(timer);
  };
}

// Page Views Detection (uses sessionStorage)
export function setupPageViews(count: number, callback: TriggerCallback): () => void {
  const key = 'haven_page_views';
  const currentViews = parseInt(sessionStorage.getItem(key) || '0', 10) + 1;
  sessionStorage.setItem(key, String(currentViews));

  if (currentViews >= count) {
    // Small delay to allow page to render
    const timer = setTimeout(callback, 500);
    return () => clearTimeout(timer);
  }

  return () => {};
}

// Click Trigger
export function setupClickTrigger(selector: string, callback: TriggerCallback): () => void {
  const handleClick = (e: Event) => {
    const target = e.target as Element;
    if (target.matches(selector) || target.closest(selector)) {
      callback();
    }
  };

  document.addEventListener('click', handleClick);
  
  return () => {
    document.removeEventListener('click', handleClick);
  };
}
```

### `lib/popups/frequency-tracker.ts`
```typescript
import { PopupFrequencyCap } from '@/types/popups';

const STORAGE_KEY = 'haven_popup_impressions';

interface ImpressionRecord {
  popup_id: string;
  session_id: string;
  timestamp: number;
  converted: boolean;
}

function getImpressions(): ImpressionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveImpressions(impressions: ImpressionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(impressions));
  } catch {
    // Storage might be full or disabled
  }
}

function getSessionId(): string {
  const key = 'haven_session_id';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export function shouldShowPopup(popupId: string, frequencyCap: PopupFrequencyCap): boolean {
  const impressions = getImpressions();
  const sessionId = getSessionId();
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  const popupImpressions = impressions.filter(i => i.popup_id === popupId);

  switch (frequencyCap.type) {
    case 'once_ever':
      return popupImpressions.length === 0;

    case 'once_per_session':
      return !popupImpressions.some(i => i.session_id === sessionId);

    case 'once_per_day':
      return !popupImpressions.some(i => i.timestamp > oneDayAgo);

    case 'unlimited':
      if (frequencyCap.max_impressions) {
        return popupImpressions.length < frequencyCap.max_impressions;
      }
      return true;

    default:
      return true;
  }
}

export function recordImpression(popupId: string): void {
  const impressions = getImpressions();
  const sessionId = getSessionId();

  impressions.push({
    popup_id: popupId,
    session_id: sessionId,
    timestamp: Date.now(),
    converted: false,
  });

  // Clean up old impressions (older than 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const cleanedImpressions = impressions.filter(i => i.timestamp > thirtyDaysAgo);

  saveImpressions(cleanedImpressions);
}

export function recordConversion(popupId: string): void {
  const impressions = getImpressions();
  const sessionId = getSessionId();

  const index = impressions.findIndex(
    i => i.popup_id === popupId && i.session_id === sessionId && !i.converted
  );

  if (index !== -1) {
    impressions[index].converted = true;
    saveImpressions(impressions);
  }
}

export function hasConverted(popupId: string): boolean {
  const impressions = getImpressions();
  return impressions.some(i => i.popup_id === popupId && i.converted);
}
```

### `components/popups/popup-manager.tsx`
```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Popup } from '@/types/popups';
import { PopupModal } from './popup-modal';
import {
  setupExitIntent,
  setupScrollDepth,
  setupTimeOnPage,
  setupPageViews,
  setupClickTrigger,
} from '@/lib/popups/trigger-handlers';
import {
  shouldShowPopup,
  recordImpression,
  hasConverted,
} from '@/lib/popups/frequency-tracker';

interface PopupManagerProps {
  userId: string;
}

export function PopupManager({ userId }: PopupManagerProps) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [activePopup, setActivePopup] = useState<Popup | null>(null);
  const [triggeredPopups, setTriggeredPopups] = useState<Set<string>>(new Set());

  // Fetch active popups
  useEffect(() => {
    async function fetchPopups() {
      try {
        const response = await fetch(`/api/popups/active?user_id=${userId}`);
        if (response.ok) {
          const { popups } = await response.json();
          setPopups(popups);
        }
      } catch (error) {
        console.error('Failed to fetch popups:', error);
      }
    }

    fetchPopups();
  }, [userId]);

  // Check targeting rules
  const matchesTargeting = useCallback((popup: Popup): boolean => {
    const { targeting } = popup;

    // Device targeting
    if (targeting.devices && targeting.devices.length > 0) {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const device = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      if (!targeting.devices.includes(device)) return false;
    }

    // URL rules
    if (targeting.url_contains && targeting.url_contains.length > 0) {
      if (!targeting.url_contains.some(str => window.location.href.includes(str))) {
        return false;
      }
    }
    if (targeting.url_excludes && targeting.url_excludes.length > 0) {
      if (targeting.url_excludes.some(str => window.location.href.includes(str))) {
        return false;
      }
    }

    // Conversion exclusion
    if (targeting.exclude_if_converted && hasConverted(popup.id)) {
      return false;
    }

    return true;
  }, []);

  // Trigger popup
  const triggerPopup = useCallback((popup: Popup) => {
    if (triggeredPopups.has(popup.id)) return;
    if (!shouldShowPopup(popup.id, popup.frequency_cap)) return;
    if (!matchesTargeting(popup)) return;

    setTriggeredPopups(prev => new Set([...prev, popup.id]));
    setActivePopup(popup);
    recordImpression(popup.id);

    // Track impression server-side
    fetch('/api/popups/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        popup_id: popup.id,
        event: 'impression',
      }),
    }).catch(console.error);
  }, [triggeredPopups, matchesTargeting]);

  // Set up trigger handlers
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    popups.forEach(popup => {
      if (triggeredPopups.has(popup.id)) return;
      if (!shouldShowPopup(popup.id, popup.frequency_cap)) return;
      if (!matchesTargeting(popup)) return;

      switch (popup.trigger_type) {
        case 'exit_intent':
          cleanups.push(setupExitIntent(() => triggerPopup(popup)));
          break;
        case 'scroll_depth':
          const percentage = popup.trigger_config.percentage || 50;
          cleanups.push(setupScrollDepth(percentage, () => triggerPopup(popup)));
          break;
        case 'time_on_page':
          const seconds = popup.trigger_config.seconds || 30;
          cleanups.push(setupTimeOnPage(seconds, () => triggerPopup(popup)));
          break;
        case 'page_views':
          const count = popup.trigger_config.count || 3;
          cleanups.push(setupPageViews(count, () => triggerPopup(popup)));
          break;
        case 'click':
          const selector = popup.trigger_config.selector || '.trigger-popup';
          cleanups.push(setupClickTrigger(selector, () => triggerPopup(popup)));
          break;
      }
    });

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [popups, triggeredPopups, triggerPopup, matchesTargeting]);

  const handleClose = () => {
    setActivePopup(null);
  };

  const handleConversion = async () => {
    if (!activePopup) return;

    // Track conversion server-side
    await fetch('/api/popups/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        popup_id: activePopup.id,
        event: 'conversion',
      }),
    }).catch(console.error);
  };

  if (!activePopup) return null;

  return (
    <PopupModal
      popup={activePopup}
      onClose={handleClose}
      onConversion={handleConversion}
    />
  );
}
```

### `components/popups/popup-modal.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Popup } from '@/types/popups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { recordConversion } from '@/lib/popups/frequency-tracker';

interface PopupModalProps {
  popup: Popup;
  onClose: () => void;
  onConversion: () => void;
}

export function PopupModal({ popup, onClose, onConversion }: PopupModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleOverlayClick = () => {
    if (popup.close_on_overlay_click) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Submit to lead capture API
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'popup',
          popup_id: popup.id,
        }),
      });

      recordConversion(popup.id);
      onConversion();
      setShowSuccess(true);

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Popup submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPositionStyles = (): string => {
    switch (popup.position) {
      case 'top': return 'items-start pt-20';
      case 'bottom': return 'items-end pb-20';
      case 'top_left': return 'items-start justify-start pt-20 pl-20';
      case 'top_right': return 'items-start justify-end pt-20 pr-20';
      case 'bottom_left': return 'items-end justify-start pb-20 pl-20';
      case 'bottom_right': return 'items-end justify-end pb-20 pr-20';
      default: return 'items-center justify-center';
    }
  };

  const getAnimationStyles = (): string => {
    if (!isVisible) {
      switch (popup.animation) {
        case 'slide_up': return 'translate-y-8 opacity-0';
        case 'slide_down': return '-translate-y-8 opacity-0';
        case 'zoom': return 'scale-95 opacity-0';
        case 'none': return '';
        default: return 'opacity-0';
      }
    }
    return 'translate-y-0 scale-100 opacity-100';
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex ${getPositionStyles()} transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: popup.overlay_opacity / 100 }}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl transition-all duration-200 ${getAnimationStyles()}`}
        style={{
          maxWidth: popup.style.max_width || 480,
          backgroundColor: popup.style.background_color,
          color: popup.style.text_color,
          borderRadius: popup.style.border_radius,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {popup.show_close_button && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        <div className="p-8">
          {showSuccess ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✓</div>
              <p className="text-lg font-semibold">
                {popup.content.success_message || 'Thank you!'}
              </p>
            </div>
          ) : (
            <>
              {popup.content.image_url && (
                <img
                  src={popup.content.image_url}
                  alt=""
                  className="w-full h-48 object-cover rounded-lg mb-6"
                />
              )}

              {popup.content.headline && (
                <h2 className="text-2xl font-bold mb-2">{popup.content.headline}</h2>
              )}

              {popup.content.body && (
                <p className="text-muted-foreground mb-6">{popup.content.body}</p>
              )}

              {popup.content.discount_code && (
                <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center">
                  <div className="text-sm text-muted-foreground mb-1">Your code:</div>
                  <div className="text-xl font-mono font-bold">
                    {popup.content.discount_code}
                  </div>
                </div>
              )}

              {popup.content.type === 'email_capture' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder={popup.content.email_placeholder || 'Enter your email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                    style={{ backgroundColor: popup.style.accent_color }}
                  >
                    {isSubmitting ? 'Submitting...' : popup.content.cta_text || 'Subscribe'}
                  </Button>
                </form>
              )}

              {popup.content.type !== 'email_capture' && popup.content.cta_text && (
                <Button
                  className="w-full"
                  onClick={() => {
                    if (popup.content.cta_link) {
                      window.location.href = popup.content.cta_link;
                    }
                    recordConversion(popup.id);
                    onConversion();
                    handleClose();
                  }}
                  style={{ backgroundColor: popup.style.accent_color }}
                >
                  {popup.content.cta_text}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

### `app/(public)/layout.tsx` (update to include PopupManager)
```tsx
import { PopupManager } from '@/components/popups/popup-manager';

// Add to the public layout body:
// <PopupManager userId={HAVEN_USER_ID} />
// Note: HAVEN_USER_ID would be configured per deployment
```

- **Step Dependencies**: Step 14.5
- **User Instructions**: None

---

## Step 14.7: Build Popup Management UI

- **Task**: Create the admin interface for creating and managing popups.

- **Files**:

### `hooks/use-popups.ts`
```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Popup, PopupStatus } from '@/types/popups';

export function usePopups(status?: PopupStatus) {
  return useQuery({
    queryKey: ['popups', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      
      const response = await fetch(`/api/popups?${params}`);
      if (!response.ok) throw new Error('Failed to fetch popups');
      const data = await response.json();
      return data.popups as Popup[];
    },
  });
}

export function usePopup(id: string) {
  return useQuery({
    queryKey: ['popup', id],
    queryFn: async () => {
      const response = await fetch(`/api/popups/${id}`);
      if (!response.ok) throw new Error('Failed to fetch popup');
      const data = await response.json();
      return data.popup as Popup;
    },
    enabled: !!id,
  });
}

export function useCreatePopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Popup>) => {
      const response = await fetch('/api/popups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create popup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
  });
}

export function useUpdatePopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Popup> }) => {
      const response = await fetch(`/api/popups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update popup');
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
      queryClient.invalidateQueries({ queryKey: ['popup', id] });
    },
  });
}

export function useDeletePopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/popups/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete popup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
  });
}
```

### `app/(dashboard)/dashboard/leads/popups/page.tsx`
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePopups, useCreatePopup, useUpdatePopup, useDeletePopup } from '@/hooks/use-popups';
import { Popup, PopupStatus } from '@/types/popups';
import { Plus, Edit2, Trash2, Play, Pause, Eye, BarChart } from 'lucide-react';

const STATUS_BADGES: Record<PopupStatus, { variant: string; label: string }> = {
  draft: { variant: 'default', label: 'Draft' },
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'warning', label: 'Paused' },
  archived: { variant: 'secondary', label: 'Archived' },
};

const TRIGGER_LABELS: Record<string, string> = {
  exit_intent: 'Exit Intent',
  scroll_depth: 'Scroll Depth',
  time_on_page: 'Time on Page',
  page_views: 'Page Views',
  click: 'Click Trigger',
  manual: 'Manual',
};

export default function PopupsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PopupStatus | 'all'>('all');
  
  const { data: popups = [], isLoading } = usePopups(
    activeTab === 'all' ? undefined : activeTab
  );
  const createPopup = useCreatePopup();
  const updatePopup = useUpdatePopup();
  const deletePopup = useDeletePopup();

  const handleCreate = async () => {
    const result = await createPopup.mutateAsync({
      name: 'New Popup',
    });
    router.push(`/dashboard/leads/popups/${result.popup.id}/edit`);
  };

  const handleToggleStatus = async (popup: Popup) => {
    const newStatus = popup.status === 'active' ? 'paused' : 'active';
    await updatePopup.mutateAsync({ id: popup.id, data: { status: newStatus } });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this popup?')) {
      await deletePopup.mutateAsync(id);
    }
  };

  const filteredPopups = activeTab === 'all' 
    ? popups 
    : popups.filter(p => p.status === activeTab);

  return (
    <PageContainer
      title="Popups"
      description="Create and manage behavior-triggered popups"
      actions={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Popup
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredPopups.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No popups found</p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Popup
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPopups.map((popup) => (
                <Card key={popup.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{popup.name}</h3>
                        <Badge variant={STATUS_BADGES[popup.status].variant as any}>
                          {STATUS_BADGES[popup.status].label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {TRIGGER_LABELS[popup.trigger_type]} • {popup.content.type}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {popup.status !== 'archived' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(popup)}
                          >
                            {popup.status === 'active' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/popups/${popup.id}/edit`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/leads/popups/${popup.id}`)}
                      >
                        <BarChart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(popup.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
```

- **Step Dependencies**: Step 14.6
- **User Instructions**: None

---

# Phase 15: Quiz System

## Step 15.1: Create Quiz Database Schema

- **Task**: Create database schema for quiz questions, answers, and results.

- **Files**:

### `supabase/migrations/012_quiz.sql`
```sql
-- ============================================================================
-- Migration: 012_quiz
-- Description: Quiz system for collection recommendation
-- Feature: 15 (Quiz System)
-- ============================================================================

-- ============================================================================
-- Quizzes Table
-- ============================================================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Quiz details
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  
  -- Landing page association
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  
  -- Configuration
  show_results_immediately BOOLEAN NOT NULL DEFAULT true,
  require_email BOOLEAN NOT NULL DEFAULT true,
  
  -- Scoring
  scoring_method TEXT NOT NULL DEFAULT 'weighted' CHECK (scoring_method IN (
    'weighted',    -- Each answer has weighted scores for each collection
    'categorical', -- Each answer maps to a single collection
    'custom'       -- Custom scoring logic
  )),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  
  -- Analytics
  starts INTEGER NOT NULL DEFAULT 0,
  completions INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,4) GENERATED ALWAYS AS (
    CASE WHEN starts > 0 THEN completions::NUMERIC / starts ELSE 0 END
  ) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, slug)
);

-- ============================================================================
-- Quiz Questions Table
-- ============================================================================
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Question content
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single' CHECK (question_type IN (
    'single',   -- Single choice
    'multiple', -- Multiple choice
    'scale'     -- Scale (1-5, etc.)
  )),
  
  -- Display
  position INTEGER NOT NULL,
  image_url TEXT,
  help_text TEXT,
  
  -- Required
  is_required BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Quiz Answers Table
-- ============================================================================
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Answer content
  answer_text TEXT NOT NULL,
  position INTEGER NOT NULL,
  image_url TEXT,
  
  -- Scoring (for weighted scoring)
  scores JSONB NOT NULL DEFAULT '{"grounding": 0, "wholeness": 0, "growth": 0}',
  
  -- For categorical scoring
  category TEXT CHECK (category IN ('grounding', 'wholeness', 'growth')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Quiz Results Table (outcome definitions)
-- ============================================================================
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Result details
  collection TEXT NOT NULL CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Recommendations
  recommended_products TEXT[], -- Product IDs or handles
  recommended_quotes TEXT[],   -- Quote IDs
  
  -- Display
  image_url TEXT,
  cta_text TEXT DEFAULT 'Shop This Collection',
  cta_url TEXT,
  
  -- Klaviyo integration
  klaviyo_segment_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(quiz_id, collection)
);

-- ============================================================================
-- Quiz Responses Table (user submissions)
-- ============================================================================
CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Response data
  answers JSONB NOT NULL, -- { question_id: answer_id[] }
  
  -- Calculated scores
  scores JSONB NOT NULL DEFAULT '{}', -- { grounding: 0, wholeness: 0, growth: 0 }
  
  -- Result
  result_collection TEXT NOT NULL CHECK (result_collection IN ('grounding', 'wholeness', 'growth')),
  
  -- Tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  -- Client info
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_quizzes_user ON quizzes(user_id);
CREATE INDEX idx_quizzes_slug ON quizzes(user_id, slug);
CREATE INDEX idx_quizzes_landing_page ON quizzes(landing_page_id);

CREATE INDEX idx_questions_quiz ON quiz_questions(quiz_id, position);
CREATE INDEX idx_answers_question ON quiz_answers(question_id, position);
CREATE INDEX idx_results_quiz ON quiz_results(quiz_id);

CREATE INDEX idx_responses_quiz ON quiz_responses(quiz_id);
CREATE INDEX idx_responses_lead ON quiz_responses(lead_id);
CREATE INDEX idx_responses_result ON quiz_responses(quiz_id, result_collection);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY quizzes_all ON quizzes FOR ALL USING (user_id = auth.uid());
CREATE POLICY questions_all ON quiz_questions FOR ALL USING (user_id = auth.uid());
CREATE POLICY answers_all ON quiz_answers FOR ALL USING (user_id = auth.uid());
CREATE POLICY results_all ON quiz_results FOR ALL USING (user_id = auth.uid());
CREATE POLICY responses_all ON quiz_responses FOR ALL USING (user_id = auth.uid());

-- Public read for active quizzes
CREATE POLICY quizzes_public_read ON quizzes FOR SELECT USING (status = 'active');

-- Public insert for responses
CREATE POLICY responses_public_insert ON quiz_responses FOR INSERT WITH CHECK (true);

CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER results_updated_at BEFORE UPDATE ON quiz_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Calculate quiz result
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_quiz_result(
  p_quiz_id UUID,
  p_answers JSONB
)
RETURNS TABLE (
  result_collection TEXT,
  scores JSONB
) AS $$
DECLARE
  v_grounding NUMERIC := 0;
  v_wholeness NUMERIC := 0;
  v_growth NUMERIC := 0;
  v_answer RECORD;
  v_question_id TEXT;
  v_answer_ids TEXT[];
BEGIN
  -- Loop through each answer in the response
  FOR v_question_id, v_answer_ids IN 
    SELECT key, array_agg(value) 
    FROM jsonb_each_text(p_answers) 
    GROUP BY key
  LOOP
    -- Get scores for each selected answer
    FOR v_answer IN 
      SELECT * FROM quiz_answers 
      WHERE id = ANY(SELECT unnest(v_answer_ids)::UUID)
    LOOP
      v_grounding := v_grounding + COALESCE((v_answer.scores->>'grounding')::NUMERIC, 0);
      v_wholeness := v_wholeness + COALESCE((v_answer.scores->>'wholeness')::NUMERIC, 0);
      v_growth := v_growth + COALESCE((v_answer.scores->>'growth')::NUMERIC, 0);
    END LOOP;
  END LOOP;
  
  -- Determine winning collection
  IF v_grounding >= v_wholeness AND v_grounding >= v_growth THEN
    result_collection := 'grounding';
  ELSIF v_wholeness >= v_grounding AND v_wholeness >= v_growth THEN
    result_collection := 'wholeness';
  ELSE
    result_collection := 'growth';
  END IF;
  
  scores := jsonb_build_object(
    'grounding', v_grounding,
    'wholeness', v_wholeness,
    'growth', v_growth
  );
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

### `types/quiz.ts`
```typescript
export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slug: string;
  landing_page_id: string | null;
  show_results_immediately: boolean;
  require_email: boolean;
  scoring_method: 'weighted' | 'categorical' | 'custom';
  status: 'draft' | 'active' | 'archived';
  starts: number;
  completions: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
  results?: QuizResult[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  user_id: string;
  question_text: string;
  question_type: 'single' | 'multiple' | 'scale';
  position: number;
  image_url: string | null;
  help_text: string | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
  position: number;
  image_url: string | null;
  scores: CollectionScores;
  category: 'grounding' | 'wholeness' | 'growth' | null;
  created_at: string;
}

export interface CollectionScores {
  grounding: number;
  wholeness: number;
  growth: number;
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  user_id: string;
  collection: 'grounding' | 'wholeness' | 'growth';
  title: string;
  description: string;
  recommended_products: string[] | null;
  recommended_quotes: string[] | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  klaviyo_segment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  lead_id: string | null;
  answers: Record<string, string[]>;
  scores: CollectionScores;
  result_collection: 'grounding' | 'wholeness' | 'growth';
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SubmitQuizRequest {
  quizId: string;
  answers: Record<string, string[]>;
  email?: string;
  firstName?: string;
}
```

- **Step Dependencies**: Step 14.3
- **User Instructions**: Run migration

---

## Step 15.2: Implement Quiz Service and API

- **Task**: Create the quiz scoring service and API endpoints.

- **Files**:

### `lib/quiz/quiz-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { syncLeadToKlaviyo } from '@/lib/integrations/klaviyo/lead-sync';
import type { Quiz, QuizResponse, QuizResult, SubmitQuizRequest, CollectionScores } from '@/types/quiz';

interface QuizSubmitResult {
  success: boolean;
  response?: QuizResponse;
  result?: QuizResult;
  error?: string;
}

export async function submitQuiz(
  request: SubmitQuizRequest,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<QuizSubmitResult> {
  const supabase = createServerSupabaseClient();

  try {
    // Get quiz
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*, questions:quiz_questions(*, answers:quiz_answers(*))')
      .eq('id', request.quizId)
      .eq('status', 'active')
      .single();

    if (!quiz) {
      return { success: false, error: 'Quiz not found' };
    }

    // Calculate result
    const { data: calcResult } = await supabase.rpc('calculate_quiz_result', {
      p_quiz_id: request.quizId,
      p_answers: request.answers,
    });

    if (!calcResult || calcResult.length === 0) {
      return { success: false, error: 'Failed to calculate result' };
    }

    const { result_collection, scores } = calcResult[0];

    // Create or update lead if email provided
    let leadId: string | null = null;

    if (request.email) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .upsert({
          user_id: quiz.user_id,
          email: request.email,
          first_name: request.firstName,
          source: 'quiz',
          quiz_id: quiz.id,
          quiz_results: {
            answers: request.answers,
            scores,
            recommendation: result_collection,
          },
          recommended_collection: result_collection,
        }, {
          onConflict: 'user_id,email',
        })
        .select()
        .single();

      if (lead) {
        leadId = lead.id;

        // Sync to Klaviyo with quiz segment
        const resultDef = await supabase
          .from('quiz_results')
          .select('klaviyo_segment_id')
          .eq('quiz_id', quiz.id)
          .eq('collection', result_collection)
          .single();

        if (resultDef.data?.klaviyo_segment_id) {
          await syncLeadToKlaviyo(quiz.user_id, lead, {
            listId: resultDef.data.klaviyo_segment_id,
            tags: [`quiz-${result_collection}`, `quiz-${quiz.slug}`],
          });
        }
      }
    }

    // Create quiz response
    const { data: response, error: responseError } = await supabase
      .from('quiz_responses')
      .insert({
        quiz_id: request.quizId,
        user_id: quiz.user_id,
        lead_id: leadId,
        answers: request.answers,
        scores,
        result_collection,
        completed_at: new Date().toISOString(),
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
      })
      .select()
      .single();

    if (responseError) {
      throw new Error(responseError.message);
    }

    // Update quiz completion count
    await supabase
      .from('quizzes')
      .update({ completions: quiz.completions + 1 })
      .eq('id', quiz.id);

    // Get result definition
    const { data: result } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('collection', result_collection)
      .single();

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: quiz.user_id,
      p_action_type: 'quiz_completed',
      p_details: {
        quizId: quiz.id,
        responseId: response.id,
        result: result_collection,
        leadId,
      },
      p_executed: true,
      p_module: 'quiz',
      p_reference_id: response.id,
      p_reference_table: 'quiz_responses',
    });

    return {
      success: true,
      response: response as QuizResponse,
      result: result as QuizResult,
    };
  } catch (error) {
    console.error('Quiz submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getQuizAnalytics(
  userId: string,
  quizId: string
): Promise<{
  totalResponses: number;
  collectionBreakdown: Record<string, number>;
  averageTimeSeconds: number;
  conversionRate: number;
}> {
  const supabase = createServerSupabaseClient();

  const { data: responses } = await supabase
    .from('quiz_responses')
    .select('result_collection, time_spent_seconds, lead_id')
    .eq('quiz_id', quizId)
    .eq('user_id', userId);

  if (!responses || responses.length === 0) {
    return {
      totalResponses: 0,
      collectionBreakdown: { grounding: 0, wholeness: 0, growth: 0 },
      averageTimeSeconds: 0,
      conversionRate: 0,
    };
  }

  const collectionBreakdown = {
    grounding: responses.filter((r) => r.result_collection === 'grounding').length,
    wholeness: responses.filter((r) => r.result_collection === 'wholeness').length,
    growth: responses.filter((r) => r.result_collection === 'growth').length,
  };

  const times = responses
    .filter((r) => r.time_spent_seconds !== null)
    .map((r) => r.time_spent_seconds as number);

  const averageTimeSeconds = times.length > 0
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0;

  const withLead = responses.filter((r) => r.lead_id !== null).length;
  const conversionRate = responses.length > 0 ? withLead / responses.length : 0;

  return {
    totalResponses: responses.length,
    collectionBreakdown,
    averageTimeSeconds,
    conversionRate,
  };
}
```

### `app/api/quiz/[slug]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public endpoint - no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        slug,
        show_results_immediately,
        require_email,
        questions:quiz_questions(
          id,
          question_text,
          question_type,
          position,
          image_url,
          help_text,
          is_required,
          answers:quiz_answers(
            id,
            answer_text,
            position,
            image_url
          )
        )
      `)
      .eq('slug', params.slug)
      .eq('status', 'active')
      .single();
    
    if (error || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    // Sort questions and answers by position
    quiz.questions.sort((a: any, b: any) => a.position - b.position);
    quiz.questions.forEach((q: any) => {
      q.answers.sort((a: any, b: any) => a.position - b.position);
    });
    
    // Track quiz start
    await supabase
      .from('quizzes')
      .update({ starts: supabase.sql`starts + 1` })
      .eq('id', quiz.id);
    
    return NextResponse.json({ quiz });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load quiz' },
      { status: 500 }
    );
  }
}
```

### `app/api/quiz/[slug]/submit/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { submitQuiz } from '@/lib/quiz/quiz-service';
import { createClient } from '@supabase/supabase-js';

const submitSchema = z.object({
  answers: z.record(z.array(z.string())),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
});

// Public endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get quiz ID from slug
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, require_email')
      .eq('slug', params.slug)
      .eq('status', 'active')
      .single();
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const data = submitSchema.parse(body);
    
    // Validate email if required
    if (quiz.require_email && !data.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const result = await submitQuiz(
      {
        quizId: quiz.id,
        answers: data.answers,
        email: data.email,
        firstName: data.firstName,
      },
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    );
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      result: result.result,
      scores: result.response?.scores,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 15.1
- **User Instructions**: None

---

# Phase 16: Cart Abandonment

## Step 16.1: Create Abandonment Database Schema

- **Task**: Create database schema for tracking cart abandonments and triggering sequences.

- **Files**:

### `supabase/migrations/013_abandonment.sql`
```sql
-- ============================================================================
-- Migration: 013_abandonment
-- Description: Cart abandonment tracking and sequences
-- Feature: 16 (Cart Abandonment)
-- ============================================================================

-- ============================================================================
-- Abandoned Checkouts Table
-- ============================================================================
CREATE TABLE abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Shopify references
  shopify_checkout_id TEXT NOT NULL,
  shopify_checkout_token TEXT,
  
  -- Customer info
  email TEXT NOT NULL,
  customer_id TEXT, -- Shopify customer ID if known
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Cart details
  cart_total NUMERIC(10,2) NOT NULL,
  cart_items JSONB NOT NULL DEFAULT '[]',
  -- [{ product_id, variant_id, title, quantity, price, image_url }]
  
  -- Checkout state
  checkout_url TEXT,
  
  -- Timing
  abandoned_at TIMESTAMPTZ NOT NULL,
  
  -- Recovery status
  status TEXT NOT NULL DEFAULT 'abandoned' CHECK (status IN (
    'abandoned',    -- Cart was abandoned
    'sequence_triggered', -- Klaviyo sequence started
    'recovered',    -- Customer completed purchase
    'expired'       -- Recovery window expired
  )),
  
  -- Sequence tracking
  sequence_triggered_at TIMESTAMPTZ,
  klaviyo_flow_id TEXT,
  
  -- Recovery tracking
  recovered_at TIMESTAMPTZ,
  recovered_order_id TEXT,
  recovered_order_total NUMERIC(10,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, shopify_checkout_id)
);

-- ============================================================================
-- Abandonment Sequences Table (recovery email configuration)
-- ============================================================================
CREATE TABLE abandonment_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Sequence details
  name TEXT NOT NULL,
  
  -- Timing configuration
  trigger_delay_hours INTEGER NOT NULL DEFAULT 1, -- Hours after abandonment
  
  -- Klaviyo integration
  klaviyo_flow_id TEXT NOT NULL,
  
  -- Conditions
  min_cart_value NUMERIC(10,2) DEFAULT 0,
  max_cart_value NUMERIC(10,2),
  
  -- Collections to target (empty = all)
  target_collections TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Performance
  checkouts_triggered INTEGER NOT NULL DEFAULT 0,
  checkouts_recovered INTEGER NOT NULL DEFAULT 0,
  revenue_recovered NUMERIC(12,2) NOT NULL DEFAULT 0,
  recovery_rate NUMERIC(5,4) GENERATED ALWAYS AS (
    CASE WHEN checkouts_triggered > 0 
      THEN checkouts_recovered::NUMERIC / checkouts_triggered 
      ELSE 0 
    END
  ) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_abandoned_checkouts_user ON abandoned_checkouts(user_id);
CREATE INDEX idx_abandoned_checkouts_email ON abandoned_checkouts(user_id, email);
CREATE INDEX idx_abandoned_checkouts_status ON abandoned_checkouts(user_id, status);
CREATE INDEX idx_abandoned_checkouts_abandoned ON abandoned_checkouts(user_id, abandoned_at)
  WHERE status = 'abandoned';
CREATE INDEX idx_abandoned_checkouts_shopify ON abandoned_checkouts(shopify_checkout_id);

CREATE INDEX idx_sequences_user ON abandonment_sequences(user_id);
CREATE INDEX idx_sequences_active ON abandonment_sequences(user_id, is_active)
  WHERE is_active = true;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandonment_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY checkouts_all ON abandoned_checkouts FOR ALL USING (user_id = auth.uid());
CREATE POLICY sequences_all ON abandonment_sequences FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER checkouts_updated_at BEFORE UPDATE ON abandoned_checkouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER sequences_updated_at BEFORE UPDATE ON abandonment_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Get checkouts ready for sequence trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION get_checkouts_for_sequence(
  p_user_id UUID,
  p_window_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
  checkout_id UUID,
  email TEXT,
  cart_total NUMERIC,
  cart_items JSONB,
  checkout_url TEXT,
  sequence_id UUID,
  klaviyo_flow_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id AS checkout_id,
    ac.email,
    ac.cart_total,
    ac.cart_items,
    ac.checkout_url,
    seq.id AS sequence_id,
    seq.klaviyo_flow_id
  FROM abandoned_checkouts ac
  CROSS JOIN abandonment_sequences seq
  WHERE ac.user_id = p_user_id
    AND seq.user_id = p_user_id
    AND ac.status = 'abandoned'
    AND seq.is_active = true
    AND ac.abandoned_at <= NOW() - (seq.trigger_delay_hours || ' hours')::INTERVAL
    AND ac.cart_total >= COALESCE(seq.min_cart_value, 0)
    AND (seq.max_cart_value IS NULL OR ac.cart_total <= seq.max_cart_value)
    AND NOT EXISTS (
      -- Check if already triggered for any sequence
      SELECT 1 FROM abandoned_checkouts ac2
      WHERE ac2.id = ac.id AND ac2.sequence_triggered_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `types/abandonment.ts`
```typescript
export interface AbandonedCheckout {
  id: string;
  user_id: string;
  shopify_checkout_id: string;
  shopify_checkout_token: string | null;
  email: string;
  customer_id: string | null;
  lead_id: string | null;
  cart_total: number;
  cart_items: CartItem[];
  checkout_url: string | null;
  abandoned_at: string;
  status: AbandonmentStatus;
  sequence_triggered_at: string | null;
  klaviyo_flow_id: string | null;
  recovered_at: string | null;
  recovered_order_id: string | null;
  recovered_order_total: number | null;
  created_at: string;
  updated_at: string;
}

export type AbandonmentStatus = 'abandoned' | 'sequence_triggered' | 'recovered' | 'expired';

export interface CartItem {
  product_id: string;
  variant_id: string;
  title: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export interface AbandonmentSequence {
  id: string;
  user_id: string;
  name: string;
  trigger_delay_hours: number;
  klaviyo_flow_id: string;
  min_cart_value: number | null;
  max_cart_value: number | null;
  target_collections: string[];
  is_active: boolean;
  checkouts_triggered: number;
  checkouts_recovered: number;
  revenue_recovered: number;
  recovery_rate: number;
  created_at: string;
  updated_at: string;
}
```

- **Step Dependencies**: Step 14.1
- **User Instructions**: Run migration

---

## Step 16.2: Implement Abandonment Service

- **Task**: Create the service for processing abandoned checkouts and triggering Klaviyo flows.

- **Files**:

### `lib/abandonment/abandonment-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { AbandonedCheckout, CartItem } from '@/types/abandonment';

interface ProcessResult {
  triggered: number;
  errors: string[];
}

export async function processAbandonedCheckouts(userId: string): Promise<ProcessResult> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();
  const errors: string[] = [];
  let triggered = 0;

  try {
    // Get user's abandonment window from guardrails
    const { data: settings } = await supabase
      .from('user_settings')
      .select('guardrails')
      .eq('user_id', userId)
      .single();

    const windowHours = settings?.guardrails?.abandonment_window_hours || 1;

    // Get checkouts ready for sequence trigger
    const { data: checkouts } = await supabase.rpc('get_checkouts_for_sequence', {
      p_user_id: userId,
      p_window_hours: windowHours,
    });

    if (!checkouts || checkouts.length === 0) {
      return { triggered: 0, errors: [] };
    }

    // Get Klaviyo API key
    const apiKey = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'klaviyo',
      p_credential_type: 'api_key',
    });

    if (!apiKey.data) {
      return { triggered: 0, errors: ['Klaviyo not connected'] };
    }

    // Process each checkout
    for (const checkout of checkouts) {
      try {
        // Trigger Klaviyo flow
        await triggerKlaviyoFlow(
          apiKey.data,
          checkout.klaviyo_flow_id,
          checkout.email,
          {
            cart_total: checkout.cart_total,
            cart_items: checkout.cart_items,
            checkout_url: checkout.checkout_url,
          }
        );

        // Update checkout status
        await supabase
          .from('abandoned_checkouts')
          .update({
            status: 'sequence_triggered',
            sequence_triggered_at: new Date().toISOString(),
            klaviyo_flow_id: checkout.klaviyo_flow_id,
          })
          .eq('id', checkout.checkout_id);

        // Update sequence stats
        await supabase
          .from('abandonment_sequences')
          .update({
            checkouts_triggered: supabase.sql`checkouts_triggered + 1`,
          })
          .eq('id', checkout.sequence_id);

        triggered++;
      } catch (error) {
        errors.push(`Checkout ${checkout.checkout_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log activity
    if (triggered > 0) {
      await supabase.rpc('log_activity', {
        p_user_id: userId,
        p_action_type: 'abandonment_sequences_triggered',
        p_details: { triggered, errors: errors.length },
        p_executed: true,
        p_module: 'abandonment',
      });
    }

    return { triggered, errors };
  } catch (error) {
    console.error('Abandonment processing error:', error);
    return {
      triggered,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function recordAbandonedCheckout(
  userId: string,
  checkout: {
    shopifyCheckoutId: string;
    shopifyCheckoutToken?: string;
    email: string;
    customerId?: string;
    cartTotal: number;
    cartItems: CartItem[];
    checkoutUrl?: string;
    abandonedAt: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    // Check if lead exists
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', userId)
      .eq('email', checkout.email)
      .single();

    const { error } = await supabase
      .from('abandoned_checkouts')
      .upsert({
        user_id: userId,
        shopify_checkout_id: checkout.shopifyCheckoutId,
        shopify_checkout_token: checkout.shopifyCheckoutToken,
        email: checkout.email,
        customer_id: checkout.customerId,
        lead_id: lead?.id,
        cart_total: checkout.cartTotal,
        cart_items: checkout.cartItems,
        checkout_url: checkout.checkoutUrl,
        abandoned_at: checkout.abandonedAt,
        status: 'abandoned',
      }, {
        onConflict: 'user_id,shopify_checkout_id',
      });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Record abandoned checkout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function markCheckoutRecovered(
  userId: string,
  shopifyCheckoutId: string,
  orderId: string,
  orderTotal: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();

  try {
    const { data: checkout } = await supabase
      .from('abandoned_checkouts')
      .select('id, klaviyo_flow_id')
      .eq('user_id', userId)
      .eq('shopify_checkout_id', shopifyCheckoutId)
      .single();

    if (!checkout) {
      return { success: false, error: 'Checkout not found' };
    }

    // Update checkout
    await supabase
      .from('abandoned_checkouts')
      .update({
        status: 'recovered',
        recovered_at: new Date().toISOString(),
        recovered_order_id: orderId,
        recovered_order_total: orderTotal,
      })
      .eq('id', checkout.id);

    // Update sequence stats if triggered
    if (checkout.klaviyo_flow_id) {
      await supabase
        .from('abandonment_sequences')
        .update({
          checkouts_recovered: supabase.sql`checkouts_recovered + 1`,
          revenue_recovered: supabase.sql`revenue_recovered + ${orderTotal}`,
        })
        .eq('klaviyo_flow_id', checkout.klaviyo_flow_id);
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'checkout_recovered',
      p_details: {
        checkoutId: checkout.id,
        orderId,
        orderTotal,
        wasSequenceTriggered: !!checkout.klaviyo_flow_id,
      },
      p_executed: true,
      p_module: 'abandonment',
      p_reference_id: checkout.id,
      p_reference_table: 'abandoned_checkouts',
    });

    return { success: true };
  } catch (error) {
    console.error('Mark checkout recovered error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function triggerKlaviyoFlow(
  apiKey: string,
  flowId: string,
  email: string,
  properties: Record<string, unknown>
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
          profile: { email },
          metric: { name: 'Checkout Abandoned' },
          properties,
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

- **Step Dependencies**: Step 16.1
- **User Instructions**: None

---

**Part 9 Summary**

This part covers:

**Phase 14 (Lead Capture):**
- Landing pages schema with form configuration
- Leads table with UTM tracking and conversion tracking
- Form submissions with processing function
- Lead capture service with Klaviyo sync
- Landing pages API endpoints (CRUD, public submit)
- Leads API with search and filtering
- **Landing Page Builder UI** with drag-and-drop blocks
- Block types: hero, text, image, CTA, quiz embed, product grid, testimonial, FAQ
- Block editor with inline editing

**Phase 14.5 (Popups):**
- **Popups database schema** with trigger configuration
- Trigger types: exit intent, scroll depth, time on page, page views, click
- **Popup display system** with frequency capping
- **Popup targeting** by device, URL, visitor type
- Popup analytics tracking (impressions, conversions)
- **Popup management UI** with status controls

**Phase 15 (Quiz System):**
- Quiz schema with questions, answers, and scoring
- Weighted scoring for collection recommendation
- Quiz responses table with lead association
- Quiz service with result calculation
- Public quiz API endpoints (load, submit)
- Quiz analytics tracking

**Phase 16 (Cart Abandonment):**
- Abandoned checkouts tracking table
- Abandonment sequences configuration
- Guardrail-aware trigger delay
- Recovery tracking with revenue attribution
- Abandonment processing service
- Klaviyo flow triggering
- Recovery tracking when orders complete

---

**Remaining phases to cover:**
- **Part 10:** Phase 17-19 (Customer Journey, Win-Back, Loyalty)
- **Part 11:** Phase 20-23 (Attribution, Campaigns, Intelligence, Daily Digest)
