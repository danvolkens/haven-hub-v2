# Haven Hub: Complete Implementation Task Plan
## Part 6: Phases 7-8 (Design System Foundation, Design Engine Pipeline)

---

# Phase 7: Design System Foundation

## Step 7.1: Create Quotes Database Schema

- **Task**: Create the database schema for quotes with collection, mood, and status tracking.

- **Files**:

### `supabase/migrations/006_quotes.sql`
```sql
-- ============================================================================
-- Migration: 006_quotes
-- Description: Quotes table with collection, mood, and generation tracking
-- Feature: 7 (Design Engine)
-- ============================================================================

-- ============================================================================
-- Quotes Table
-- ============================================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Quote content
  text TEXT NOT NULL,
  attribution TEXT, -- Optional author/source
  
  -- Classification per spec Feature 7
  collection TEXT NOT NULL CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  mood TEXT NOT NULL CHECK (mood IN ('calm', 'warm', 'hopeful', 'reflective', 'empowering')),
  
  -- Tags for temporal content (Feature 41)
  temporal_tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'generating')),
  
  -- Generation tracking
  assets_generated INTEGER NOT NULL DEFAULT 0,
  last_generated_at TIMESTAMPTZ,
  generation_settings JSONB, -- Stores settings used for last generation
  
  -- Performance tracking
  total_pins INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_saves INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  best_performing_asset_id UUID,
  
  -- Import tracking
  imported_from TEXT, -- 'csv', 'manual', 'api'
  import_batch_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_collection ON quotes(user_id, collection);
CREATE INDEX idx_quotes_mood ON quotes(user_id, mood);
CREATE INDEX idx_quotes_status ON quotes(user_id, status);
CREATE INDEX idx_quotes_temporal ON quotes USING GIN (temporal_tags);
CREATE INDEX idx_quotes_text_search ON quotes USING GIN (to_tsvector('english', text));

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotes_select ON quotes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY quotes_insert ON quotes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY quotes_update ON quotes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY quotes_delete ON quotes FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Assets Table (generated from quotes)
-- ============================================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Asset details
  format TEXT NOT NULL, -- 'pinterest', 'instagram_post', 'instagram_story', 'print_8x10', etc.
  dimensions JSONB NOT NULL, -- { width: number, height: number }
  
  -- File locations
  file_url TEXT NOT NULL,
  file_key TEXT NOT NULL, -- R2 storage key
  thumbnail_url TEXT,
  
  -- Design metadata
  design_config JSONB NOT NULL DEFAULT '{}', -- Full design configuration used
  template_id TEXT, -- If using a template
  
  -- Quality scores per spec
  quality_scores JSONB NOT NULL DEFAULT '{}',
  -- { readability: 0.95, contrast: 0.88, composition: 0.92, overall: 0.91 }
  
  overall_score NUMERIC(4,3) GENERATED ALWAYS AS (
    (quality_scores->>'overall')::NUMERIC
  ) STORED,
  
  -- Flags
  flags TEXT[] NOT NULL DEFAULT '{}',
  flag_reasons JSONB NOT NULL DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'published', 'archived'
  )),
  
  -- Performance (aggregated from pins)
  total_pins INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_saves INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Asset Indexes
-- ============================================================================
CREATE INDEX idx_assets_user ON assets(user_id);
CREATE INDEX idx_assets_quote ON assets(quote_id);
CREATE INDEX idx_assets_format ON assets(user_id, format);
CREATE INDEX idx_assets_status ON assets(user_id, status);
CREATE INDEX idx_assets_score ON assets(user_id, overall_score DESC) WHERE overall_score IS NOT NULL;
CREATE INDEX idx_assets_pending ON assets(user_id, created_at) WHERE status = 'pending';

-- ============================================================================
-- Asset RLS
-- ============================================================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY assets_select ON assets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY assets_insert ON assets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY assets_update ON assets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY assets_delete ON assets FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Design Rules Table (user-configurable design settings)
-- ============================================================================
CREATE TABLE design_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Collection/mood applicability
  applies_to_collections TEXT[] NOT NULL DEFAULT '{}', -- Empty = all
  applies_to_moods TEXT[] NOT NULL DEFAULT '{}', -- Empty = all
  
  -- Typography settings
  typography JSONB NOT NULL DEFAULT '{
    "font_family": "Cormorant Garamond",
    "font_weight": 400,
    "font_size_base": 48,
    "line_height": 1.4,
    "letter_spacing": 0,
    "text_transform": "none",
    "attribution_font_family": "Inter",
    "attribution_font_size": 14
  }',
  
  -- Color settings (per collection)
  colors JSONB NOT NULL DEFAULT '{
    "grounding": {
      "background": "#F5F3EF",
      "text": "#2D3E50",
      "accent": "#7A9E7E"
    },
    "wholeness": {
      "background": "#FAF9F7",
      "text": "#2D3E50",
      "accent": "#4A9B9B"
    },
    "growth": {
      "background": "#F8F6F3",
      "text": "#2D3E50",
      "accent": "#D4A574"
    }
  }',
  
  -- Layout settings
  layout JSONB NOT NULL DEFAULT '{
    "padding": 60,
    "text_alignment": "center",
    "vertical_alignment": "center",
    "max_width_percent": 80,
    "include_attribution": true,
    "include_logo": false,
    "logo_position": "bottom-right",
    "logo_size": 40
  }',
  
  -- Decorative elements
  decorations JSONB NOT NULL DEFAULT '{
    "border": false,
    "border_width": 1,
    "border_color": "accent",
    "shadow": false,
    "background_pattern": null,
    "corner_style": "square"
  }',
  
  -- Output settings
  output_formats TEXT[] NOT NULL DEFAULT ARRAY['pinterest', 'instagram_post'],
  print_sizes TEXT[] NOT NULL DEFAULT ARRAY['8x10', '11x14'],
  
  -- Quality thresholds
  quality_thresholds JSONB NOT NULL DEFAULT '{
    "min_readability": 0.7,
    "min_contrast": 0.6,
    "min_overall": 0.65,
    "auto_approve_threshold": 0.85
  }',
  
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_rules_user ON design_rules(user_id);
CREATE INDEX idx_design_rules_default ON design_rules(user_id, is_default) WHERE is_default = true;

ALTER TABLE design_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY design_rules_all ON design_rules FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER design_rules_updated_at
  BEFORE UPDATE ON design_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Get applicable design rules for a quote
-- ============================================================================
CREATE OR REPLACE FUNCTION get_applicable_design_rules(
  p_user_id UUID,
  p_collection TEXT,
  p_mood TEXT
)
RETURNS SETOF design_rules AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM design_rules
  WHERE user_id = p_user_id
    AND enabled = true
    AND (
      array_length(applies_to_collections, 1) IS NULL 
      OR p_collection = ANY(applies_to_collections)
    )
    AND (
      array_length(applies_to_moods, 1) IS NULL 
      OR p_mood = ANY(applies_to_moods)
    )
  ORDER BY 
    CASE WHEN is_default THEN 0 ELSE 1 END,
    priority DESC,
    created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Create default design rules for new user
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_design_rules()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO design_rules (user_id, name, description, is_default)
  VALUES (
    NEW.id,
    'Haven & Hold Default',
    'Default design rules matching Haven & Hold brand guidelines',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to user creation (after user_settings)
CREATE TRIGGER on_auth_user_created_design_rules
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_design_rules();
```

### `types/quotes.ts`
```typescript
import type { Collection, Mood } from '@/lib/constants';

export interface Quote {
  id: string;
  user_id: string;
  text: string;
  attribution: string | null;
  collection: Collection;
  mood: Mood;
  temporal_tags: string[];
  status: 'active' | 'archived' | 'generating';
  assets_generated: number;
  last_generated_at: string | null;
  generation_settings: GenerationSettings | null;
  total_pins: number;
  total_impressions: number;
  total_saves: number;
  total_clicks: number;
  best_performing_asset_id: string | null;
  imported_from: 'csv' | 'manual' | 'api' | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationSettings {
  designRuleId: string;
  outputFormats: string[];
  printSizes: string[];
  generateMockups: boolean;
  mockupScenes: string[];
}

export interface Asset {
  id: string;
  user_id: string;
  quote_id: string;
  format: string;
  dimensions: { width: number; height: number };
  file_url: string;
  file_key: string;
  thumbnail_url: string | null;
  design_config: DesignConfig;
  template_id: string | null;
  quality_scores: QualityScores;
  overall_score: number | null;
  flags: string[];
  flag_reasons: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected' | 'published' | 'archived';
  total_pins: number;
  total_impressions: number;
  total_saves: number;
  total_clicks: number;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityScores {
  readability: number;
  contrast: number;
  composition: number;
  overall: number;
}

export interface DesignConfig {
  typography: TypographyConfig;
  colors: ColorConfig;
  layout: LayoutConfig;
  decorations: DecorationConfig;
}

export interface TypographyConfig {
  font_family: string;
  font_weight: number;
  font_size_base: number;
  line_height: number;
  letter_spacing: number;
  text_transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  attribution_font_family: string;
  attribution_font_size: number;
}

export interface ColorConfig {
  background: string;
  text: string;
  accent: string;
}

export interface LayoutConfig {
  padding: number;
  text_alignment: 'left' | 'center' | 'right';
  vertical_alignment: 'top' | 'center' | 'bottom';
  max_width_percent: number;
  include_attribution: boolean;
  include_logo: boolean;
  logo_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logo_size: number;
}

export interface DecorationConfig {
  border: boolean;
  border_width: number;
  border_color: string;
  shadow: boolean;
  background_pattern: string | null;
  corner_style: 'square' | 'rounded' | 'pill';
}

export interface DesignRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  applies_to_collections: Collection[];
  applies_to_moods: Mood[];
  typography: TypographyConfig;
  colors: Record<Collection, ColorConfig>;
  layout: LayoutConfig;
  decorations: DecorationConfig;
  output_formats: string[];
  print_sizes: string[];
  quality_thresholds: {
    min_readability: number;
    min_contrast: number;
    min_overall: number;
    auto_approve_threshold: number;
  };
  priority: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

- **Step Dependencies**: Step 2.1
- **User Instructions**: Run migration

---

## Step 7.2: Create Quotes API Endpoints

- **Task**: Implement CRUD API routes for quotes with search and filtering.

- **Files**:

### `app/api/quotes/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const createQuoteSchema = z.object({
  text: z.string().min(1).max(500),
  attribution: z.string().max(100).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']),
  mood: z.enum(['calm', 'warm', 'hopeful', 'reflective', 'empowering']),
  temporal_tags: z.array(z.string()).default([]),
});

const querySchema = z.object({
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  mood: z.enum(['calm', 'warm', 'hopeful', 'reflective', 'empowering']).optional(),
  status: z.enum(['active', 'archived', 'generating']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(['created_at', 'updated_at', 'total_impressions']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { collection, mood, status, search, limit, offset, sort, order } = querySchema.parse(searchParams);
    
    let query = supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    if (collection) {
      query = query.eq('collection', collection);
    }
    
    if (mood) {
      query = query.eq('mood', mood);
    }
    
    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'archived'); // Default: hide archived
    }
    
    if (search) {
      query = query.textSearch('text', search, { type: 'websearch' });
    }
    
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      quotes: data,
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
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const validated = createQuoteSchema.parse(body);
    
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        user_id: userId,
        ...validated,
        imported_from: 'manual',
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/quotes/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const updateQuoteSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  attribution: z.string().max(100).nullable().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  mood: z.enum(['calm', 'warm', 'hopeful', 'reflective', 'empowering']).optional(),
  temporal_tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('quotes')
      .select('*, assets(*)')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const validated = updateQuoteSchema.parse(body);
    
    const { data, error } = await supabase
      .from('quotes')
      .update(validated)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/quotes/import/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { nanoid } from 'nanoid';

const importRowSchema = z.object({
  text: z.string().min(1).max(500),
  attribution: z.string().max(100).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']),
  mood: z.enum(['calm', 'warm', 'hopeful', 'reflective', 'empowering']),
  temporal_tags: z.array(z.string()).or(z.string()).optional(),
});

const importSchema = z.object({
  quotes: z.array(importRowSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { quotes } = importSchema.parse(body);
    const batchId = nanoid();
    
    // Prepare quotes for insertion
    const quotesToInsert = quotes.map((q) => ({
      user_id: userId,
      text: q.text,
      attribution: q.attribution || null,
      collection: q.collection,
      mood: q.mood,
      temporal_tags: Array.isArray(q.temporal_tags) 
        ? q.temporal_tags 
        : q.temporal_tags?.split(',').map((t) => t.trim()) || [],
      imported_from: 'csv' as const,
      import_batch_id: batchId,
    }));
    
    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    const errors: Array<{ index: number; error: string }> = [];
    
    for (let i = 0; i < quotesToInsert.length; i += batchSize) {
      const batch = quotesToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('quotes')
        .insert(batch)
        .select('id');
      
      if (error) {
        errors.push({ index: i, error: error.message });
      } else {
        inserted += data?.length || 0;
      }
    }
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'quotes_imported',
      p_details: { 
        total: quotes.length, 
        inserted, 
        errors: errors.length,
        batchId,
      },
      p_executed: true,
      p_module: 'design_engine',
    });
    
    return NextResponse.json({
      success: true,
      batchId,
      total: quotes.length,
      inserted,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 7.1
- **User Instructions**: None

---

## Step 7.3: Create Quote Management UI

- **Task**: Build the quotes list, create/edit forms, and import functionality.

- **Files**:

### `hooks/use-quotes.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetcher';
import { useToast } from '@/components/providers/toast-provider';
import type { Quote, Collection, Mood } from '@/types/quotes';

interface QuotesQueryParams {
  collection?: Collection;
  mood?: Mood;
  status?: 'active' | 'archived' | 'generating';
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'created_at' | 'updated_at' | 'total_impressions';
  order?: 'asc' | 'desc';
}

interface QuotesResponse {
  quotes: Quote[];
  total: number;
  limit: number;
  offset: number;
}

export function useQuotes(params: QuotesQueryParams = {}) {
  return useQuery({
    queryKey: ['quotes', params],
    queryFn: () => api.get<QuotesResponse>('/quotes', params),
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: () => api.get<Quote & { assets: unknown[] }>(`/quotes/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      text: string;
      attribution?: string;
      collection: Collection;
      mood: Mood;
      temporal_tags?: string[];
    }) => api.post<Quote>('/quotes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast('Quote created', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to create quote', 'error');
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Quote>) =>
      api.patch<Quote>(`/quotes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
      toast('Quote updated', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to update quote', 'error');
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast('Quote deleted', 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to delete quote', 'error');
    },
  });
}

export function useImportQuotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (quotes: Array<{
      text: string;
      attribution?: string;
      collection: Collection;
      mood: Mood;
      temporal_tags?: string[];
    }>) => api.post<{ inserted: number; errors: unknown[] }>('/quotes/import', { quotes }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast(`Imported ${data.inserted} quotes`, 'success');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to import quotes', 'error');
    },
  });
}
```

### `components/quotes/quote-form.tsx`
```typescript
'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Sparkles, Quote as QuoteIcon } from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  Card,
  CardHeader,
  CardContent,
  Badge,
} from '@/components/ui';
import { COLLECTIONS, MOODS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Quote, Collection, Mood } from '@/types/quotes';

interface QuoteFormProps {
  initialData?: Partial<Quote>;
  onSubmit: (data: QuoteFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface QuoteFormData {
  text: string;
  attribution: string;
  collection: Collection;
  mood: Mood;
  temporal_tags: string[];
}

const collectionOptions = COLLECTIONS.map((c) => ({
  value: c.id,
  label: c.name,
  description: c.description,
}));

const moodOptions = MOODS.map((m) => ({
  value: m.id,
  label: m.name,
  description: m.description,
}));

export function QuoteForm({ initialData, onSubmit, onCancel, isLoading }: QuoteFormProps) {
  const [form, setForm] = useState<QuoteFormData>({
    text: initialData?.text || '',
    attribution: initialData?.attribution || '',
    collection: initialData?.collection || 'grounding',
    mood: initialData?.mood || 'calm',
    temporal_tags: initialData?.temporal_tags || [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    if (!form.text.trim()) {
      setErrors({ text: 'Quote text is required' });
      return;
    }

    if (form.text.length > 500) {
      setErrors({ text: 'Quote text must be 500 characters or less' });
      return;
    }

    await onSubmit(form);
  };

  const characterCount = form.text.length;
  const isOverLimit = characterCount > 500;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quote Text */}
      <div className="space-y-2">
        <Label htmlFor="text">Quote Text</Label>
        <Textarea
          id="text"
          value={form.text}
          onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
          placeholder="Enter your quote text..."
          rows={4}
          error={errors.text}
          maxLength={500}
        />
        <div className="flex justify-between">
          <p className="text-caption text-[var(--color-text-tertiary)]">
            Keep quotes concise for best visual results
          </p>
          <p className={cn(
            'text-caption',
            isOverLimit ? 'text-error' : 'text-[var(--color-text-tertiary)]'
          )}>
            {characterCount}/500
          </p>
        </div>
      </div>

      {/* Attribution */}
      <div className="space-y-2">
        <Label htmlFor="attribution" optional>Attribution</Label>
        <Input
          id="attribution"
          value={form.attribution}
          onChange={(e) => setForm((prev) => ({ ...prev, attribution: e.target.value }))}
          placeholder="— Author Name"
          maxLength={100}
        />
      </div>

      {/* Collection & Mood */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="collection">Collection</Label>
          <Select
            options={collectionOptions}
            value={form.collection}
            onChange={(v) => setForm((prev) => ({ ...prev, collection: v as Collection }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mood">Mood</Label>
          <Select
            options={moodOptions}
            value={form.mood}
            onChange={(v) => setForm((prev) => ({ ...prev, mood: v as Mood }))}
          />
        </div>
      </div>

      {/* Preview */}
      <Card variant="bordered" className="bg-elevated">
        <CardContent className="p-6">
          <div className="text-center">
            <QuoteIcon className="h-6 w-6 mx-auto mb-3 text-[var(--color-text-tertiary)]" />
            <p className="text-h3 font-serif italic">
              {form.text || 'Your quote will appear here...'}
            </p>
            {form.attribution && (
              <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                — {form.attribution}
              </p>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Badge variant={form.collection as 'grounding' | 'wholeness' | 'growth'}>
                {form.collection}
              </Badge>
              <Badge variant="secondary">{form.mood}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} leftIcon={<Sparkles className="h-4 w-4" />}>
          {initialData?.id ? 'Save Changes' : 'Create Quote'}
        </Button>
      </div>
    </form>
  );
}
```

### `components/quotes/quotes-list.tsx`
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit,
  Sparkles,
  Archive,
  Image as ImageIcon,
} from 'lucide-react';
import { useQuotes, useDeleteQuote, useUpdateQuote } from '@/hooks/use-quotes';
import {
  Button,
  Input,
  Card,
  Badge,
  Select,
  Modal,
  ConfirmModal,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import { COLLECTIONS, MOODS } from '@/lib/constants';
import type { Quote, Collection, Mood } from '@/types/quotes';

export function QuotesList() {
  const [filters, setFilters] = useState<{
    collection?: Collection;
    mood?: Mood;
    search?: string;
  }>({});
  const [page, setPage] = useState(0);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Quote | null>(null);

  const { data, isLoading } = useQuotes({
    ...filters,
    limit: 20,
    offset: page * 20,
  });

  const deleteMutation = useDeleteQuote();
  const updateMutation = useUpdateQuote();

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleArchive = async (quote: Quote) => {
    await updateMutation.mutateAsync({ id: quote.id, status: 'archived' });
  };

  return (
    <PageContainer
      title="Quotes"
      description="Manage your quote library"
      actions={
        <div className="flex gap-2">
          <Link href="/dashboard/quotes/import">
            <Button variant="secondary">Import CSV</Button>
          </Link>
          <Link href="/dashboard/quotes/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Quote</Button>
          </Link>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Search quotes..."
            value={filters.search || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          options={[
            { value: '', label: 'All Collections' },
            ...COLLECTIONS.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={filters.collection || ''}
          onChange={(v) => setFilters((prev) => ({ ...prev, collection: v as Collection || undefined }))}
          placeholder="Collection"
          className="w-40"
        />
        <Select
          options={[
            { value: '', label: 'All Moods' },
            ...MOODS.map((m) => ({ value: m.id, label: m.name })),
          ]}
          value={filters.mood || ''}
          onChange={(v) => setFilters((prev) => ({ ...prev, mood: v as Mood || undefined }))}
          placeholder="Mood"
          className="w-36"
        />
      </div>

      {/* Quotes Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-elevated rounded" />
              <div className="mt-4 h-4 w-24 bg-elevated rounded" />
            </Card>
          ))}
        </div>
      ) : data?.quotes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-sage-pale flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-sage" />
          </div>
          <h3 className="text-h3 mb-2">No quotes yet</h3>
          <p className="text-body text-[var(--color-text-secondary)] mb-4">
            Add your first quote to start generating beautiful assets.
          </p>
          <Link href="/dashboard/quotes/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Quote</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onEdit={() => setSelectedQuote(quote)}
                onDelete={() => setDeleteConfirm(quote)}
                onArchive={() => handleArchive(quote)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > 20 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="py-2 px-4 text-body-sm">
                Page {page + 1} of {Math.ceil(data.total / 20)}
              </span>
              <Button
                variant="ghost"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * 20 >= data.total}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Quote?"
        message="This will also delete all generated assets for this quote. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}

function QuoteCard({
  quote,
  onEdit,
  onDelete,
  onArchive,
}: {
  quote: Quote;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="group relative">
      <div className="p-6">
        {/* Quote text */}
        <p className="text-body font-serif italic line-clamp-3">
          "{quote.text}"
        </p>
        {quote.attribution && (
          <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
            — {quote.attribution}
          </p>
        )}

        {/* Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={quote.collection as 'grounding' | 'wholeness' | 'growth'} size="sm">
            {quote.collection}
          </Badge>
          <Badge variant="secondary" size="sm">{quote.mood}</Badge>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-caption text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {quote.assets_generated} assets
          </span>
          {quote.total_impressions > 0 && (
            <span>{formatNumber(quote.total_impressions)} impressions</span>
          )}
        </div>

        {/* Actions menu */}
        <div className="absolute top-4 right-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-md border bg-surface shadow-elevation-2 py-1">
                  <Link href={`/dashboard/quotes/${quote.id}/generate`}>
                    <button className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Generate Assets
                    </button>
                  </Link>
                  <Link href={`/dashboard/quotes/${quote.id}/edit`}>
                    <button className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onArchive();
                    }}
                    className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-3 py-2 text-left text-body-sm hover:bg-elevated flex items-center gap-2 text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
```

### `app/(dashboard)/dashboard/quotes/page.tsx`
```typescript
import { QuotesList } from '@/components/quotes/quotes-list';

export const metadata = {
  title: 'Quotes | Haven Hub',
};

export default function QuotesPage() {
  return <QuotesList />;
}
```

### `app/(dashboard)/dashboard/quotes/new/page.tsx`
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui';
import { QuoteForm, type QuoteFormData } from '@/components/quotes/quote-form';
import { useCreateQuote } from '@/hooks/use-quotes';

export default function NewQuotePage() {
  const router = useRouter();
  const createMutation = useCreateQuote();

  const handleSubmit = async (data: QuoteFormData) => {
    await createMutation.mutateAsync(data);
    router.push('/dashboard/quotes');
  };

  return (
    <PageContainer
      title="Add Quote"
      description="Create a new quote for your library"
    >
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <QuoteForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
```

- **Step Dependencies**: Step 7.2
- **User Instructions**: None

---

# Phase 8: Design Engine Pipeline

## Step 8.1: Create Image Generation Service

- **Task**: Build the server-side image generation service using node-canvas.

- **Files**:

### `lib/design-engine/canvas-renderer.ts`
```typescript
import { createCanvas, registerFont, loadImage, type Canvas, type CanvasRenderingContext2D } from 'canvas';
import path from 'path';
import type { DesignConfig, ColorConfig, TypographyConfig, LayoutConfig } from '@/types/quotes';

// Register fonts (run once on server start)
const fontsRegistered = false;
export function registerFonts() {
  if (fontsRegistered) return;
  
  // Register Haven & Hold brand fonts
  // These should be placed in public/fonts/
  try {
    registerFont(path.join(process.cwd(), 'public/fonts/CormorantGaramond-Regular.ttf'), {
      family: 'Cormorant Garamond',
      weight: '400',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/CormorantGaramond-Italic.ttf'), {
      family: 'Cormorant Garamond',
      weight: '400',
      style: 'italic',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/CormorantGaramond-SemiBold.ttf'), {
      family: 'Cormorant Garamond',
      weight: '600',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf'), {
      family: 'Inter',
      weight: '400',
    });
    registerFont(path.join(process.cwd(), 'public/fonts/Inter-Medium.ttf'), {
      family: 'Inter',
      weight: '500',
    });
  } catch (error) {
    console.warn('Failed to register custom fonts, using system fonts:', error);
  }
}

export interface RenderOptions {
  width: number;
  height: number;
  text: string;
  attribution?: string;
  config: DesignConfig;
}

export interface RenderResult {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    textBounds: { x: number; y: number; width: number; height: number };
  };
}

export async function renderQuoteImage(options: RenderOptions): Promise<RenderResult> {
  registerFonts();
  
  const { width, height, text, attribution, config } = options;
  const { typography, colors, layout, decorations } = config;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);
  
  // Apply decorations
  if (decorations.border) {
    ctx.strokeStyle = decorations.border_color === 'accent' ? colors.accent : decorations.border_color;
    ctx.lineWidth = decorations.border_width;
    const inset = decorations.border_width / 2;
    ctx.strokeRect(inset, inset, width - decorations.border_width, height - decorations.border_width);
  }
  
  // Calculate text area
  const padding = layout.padding;
  const maxWidth = (width - padding * 2) * (layout.max_width_percent / 100);
  const textAreaX = padding + (width - padding * 2 - maxWidth) / 2;
  
  // Set typography
  const fontSize = calculateFontSize(text, maxWidth, typography, ctx);
  ctx.font = `${typography.font_weight} ${fontSize}px "${typography.font_family}"`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = layout.text_alignment;
  ctx.textBaseline = 'top';
  
  // Wrap text
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * typography.line_height;
  const totalTextHeight = lines.length * lineHeight;
  
  // Calculate attribution height if present
  let attributionHeight = 0;
  if (attribution && layout.include_attribution) {
    ctx.font = `${typography.attribution_font_size}px "${typography.attribution_font_family}"`;
    attributionHeight = typography.attribution_font_size * 1.5 + 20; // Line + spacing
  }
  
  // Calculate vertical position
  const totalContentHeight = totalTextHeight + attributionHeight;
  let startY: number;
  
  switch (layout.vertical_alignment) {
    case 'top':
      startY = padding;
      break;
    case 'bottom':
      startY = height - padding - totalContentHeight;
      break;
    case 'center':
    default:
      startY = (height - totalContentHeight) / 2;
  }
  
  // Render quote text
  ctx.font = `italic ${typography.font_weight} ${fontSize}px "${typography.font_family}"`;
  ctx.fillStyle = colors.text;
  
  let textX: number;
  switch (layout.text_alignment) {
    case 'left':
      textX = textAreaX;
      break;
    case 'right':
      textX = textAreaX + maxWidth;
      break;
    case 'center':
    default:
      textX = width / 2;
  }
  
  const textBounds = {
    x: textAreaX,
    y: startY,
    width: maxWidth,
    height: totalTextHeight,
  };
  
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * lineHeight);
  });
  
  // Render attribution
  if (attribution && layout.include_attribution) {
    ctx.font = `${typography.attribution_font_size}px "${typography.attribution_font_family}"`;
    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.7;
    ctx.fillText(`— ${attribution}`, textX, startY + totalTextHeight + 20);
    ctx.globalAlpha = 1;
  }
  
  return {
    buffer: canvas.toBuffer('image/png'),
    metadata: {
      width,
      height,
      textBounds,
    },
  };
}

function calculateFontSize(
  text: string,
  maxWidth: number,
  typography: TypographyConfig,
  ctx: CanvasRenderingContext2D
): number {
  let fontSize = typography.font_size_base;
  
  // Adjust based on text length
  if (text.length > 200) {
    fontSize = fontSize * 0.7;
  } else if (text.length > 100) {
    fontSize = fontSize * 0.85;
  }
  
  // Ensure text fits width
  ctx.font = `${typography.font_weight} ${fontSize}px "${typography.font_family}"`;
  const testMetrics = ctx.measureText(text);
  
  if (testMetrics.width > maxWidth * 3) {
    fontSize = fontSize * 0.8;
  }
  
  return Math.round(fontSize);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
```

### `lib/design-engine/quality-checker.ts`
```typescript
import { createCanvas, loadImage } from 'canvas';

export interface QualityScores {
  readability: number;
  contrast: number;
  composition: number;
  overall: number;
}

export interface QualityCheckResult {
  scores: QualityScores;
  flags: string[];
  flagReasons: Record<string, string>;
  passed: boolean;
}

const MIN_THRESHOLDS = {
  readability: 0.6,
  contrast: 0.5,
  overall: 0.6,
};

export async function checkImageQuality(
  imageBuffer: Buffer,
  textBounds: { x: number; y: number; width: number; height: number }
): Promise<QualityCheckResult> {
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  
  const scores: QualityScores = {
    readability: checkReadability(imageData, textBounds),
    contrast: checkContrast(imageData),
    composition: checkComposition(img.width, img.height, textBounds),
    overall: 0,
  };
  
  // Calculate overall score (weighted average)
  scores.overall = (
    scores.readability * 0.4 +
    scores.contrast * 0.3 +
    scores.composition * 0.3
  );
  
  // Determine flags
  const flags: string[] = [];
  const flagReasons: Record<string, string> = {};
  
  if (scores.readability < MIN_THRESHOLDS.readability) {
    flags.push('low_readability');
    flagReasons.low_readability = `Readability score ${(scores.readability * 100).toFixed(0)}% is below minimum ${(MIN_THRESHOLDS.readability * 100)}%`;
  }
  
  if (scores.contrast < MIN_THRESHOLDS.contrast) {
    flags.push('low_contrast');
    flagReasons.low_contrast = `Contrast score ${(scores.contrast * 100).toFixed(0)}% is below minimum ${(MIN_THRESHOLDS.contrast * 100)}%`;
  }
  
  if (scores.overall < MIN_THRESHOLDS.overall) {
    flags.push('low_overall_quality');
    flagReasons.low_overall_quality = `Overall quality ${(scores.overall * 100).toFixed(0)}% is below minimum ${(MIN_THRESHOLDS.overall * 100)}%`;
  }
  
  return {
    scores,
    flags,
    flagReasons,
    passed: flags.length === 0,
  };
}

function checkReadability(
  imageData: ImageData,
  textBounds: { x: number; y: number; width: number; height: number }
): number {
  // Sample pixels in text area to check for uniform background
  const { x, y, width, height } = textBounds;
  const data = imageData.data;
  const imgWidth = imageData.width;
  
  let variance = 0;
  let samples = 0;
  const colors: Array<{ r: number; g: number; b: number }> = [];
  
  // Sample every 10th pixel in text area
  for (let py = Math.max(0, y); py < Math.min(y + height, imageData.height); py += 10) {
    for (let px = Math.max(0, x); px < Math.min(x + width, imgWidth); px += 10) {
      const idx = (py * imgWidth + px) * 4;
      colors.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      });
      samples++;
    }
  }
  
  if (samples === 0) return 0.8; // Default if no samples
  
  // Calculate variance in brightness
  const brightnessValues = colors.map(c => (c.r + c.g + c.b) / 3);
  const avgBrightness = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
  variance = brightnessValues.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnessValues.length;
  
  // Lower variance = better readability (more uniform background)
  // Score: 1.0 for variance < 100, decreasing to 0.5 for variance > 2000
  const readabilityScore = Math.max(0.5, 1 - (variance / 2000));
  
  return Math.min(1, readabilityScore);
}

function checkContrast(imageData: ImageData): number {
  const data = imageData.data;
  
  // Get average foreground and background colors
  // Assuming text is darker than background in our design
  let minBrightness = 255;
  let maxBrightness = 0;
  
  for (let i = 0; i < data.length; i += 4 * 100) { // Sample every 100th pixel
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }
  
  // Calculate contrast ratio
  const contrastRatio = (maxBrightness - minBrightness) / 255;
  
  // Score: We want decent contrast but not extreme
  // Ideal is around 0.3-0.7
  if (contrastRatio < 0.2) return 0.5;
  if (contrastRatio > 0.8) return 0.8;
  return 0.9 + (0.1 * (1 - Math.abs(contrastRatio - 0.5) / 0.3));
}

function checkComposition(
  width: number,
  height: number,
  textBounds: { x: number; y: number; width: number; height: number }
): number {
  // Check if text is well-positioned
  const centerX = width / 2;
  const centerY = height / 2;
  const textCenterX = textBounds.x + textBounds.width / 2;
  const textCenterY = textBounds.y + textBounds.height / 2;
  
  // Distance from center as percentage of dimensions
  const xOffset = Math.abs(textCenterX - centerX) / width;
  const yOffset = Math.abs(textCenterY - centerY) / height;
  
  // Check margin compliance
  const minMargin = Math.min(width, height) * 0.05;
  const hasAdequateMargins = 
    textBounds.x >= minMargin &&
    textBounds.y >= minMargin &&
    (textBounds.x + textBounds.width) <= (width - minMargin) &&
    (textBounds.y + textBounds.height) <= (height - minMargin);
  
  // Score based on centering and margins
  let score = 1.0;
  score -= xOffset * 0.3; // Penalize horizontal offset
  score -= yOffset * 0.3; // Penalize vertical offset
  if (!hasAdequateMargins) score -= 0.2;
  
  return Math.max(0.5, Math.min(1, score));
}
```

### `lib/design-engine/format-specs.ts`
```typescript
// Output format specifications per Feature 7 spec

export interface FormatSpec {
  id: string;
  name: string;
  category: 'social' | 'print';
  width: number;
  height: number;
  aspectRatio: string;
  dpi: number;
}

export const SOCIAL_FORMATS: FormatSpec[] = [
  {
    id: 'pinterest',
    name: 'Pinterest Pin',
    category: 'social',
    width: 1000,
    height: 1500,
    aspectRatio: '2:3',
    dpi: 72,
  },
  {
    id: 'instagram_post',
    name: 'Instagram Post',
    category: 'social',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    dpi: 72,
  },
  {
    id: 'instagram_story',
    name: 'Instagram Story',
    category: 'social',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    dpi: 72,
  },
];

export const PRINT_FORMATS: FormatSpec[] = [
  {
    id: 'print_8x10',
    name: '8×10"',
    category: 'print',
    width: 2400,
    height: 3000,
    aspectRatio: '4:5',
    dpi: 300,
  },
  {
    id: 'print_11x14',
    name: '11×14"',
    category: 'print',
    width: 3300,
    height: 4200,
    aspectRatio: '11:14',
    dpi: 300,
  },
  {
    id: 'print_16x20',
    name: '16×20"',
    category: 'print',
    width: 4800,
    height: 6000,
    aspectRatio: '4:5',
    dpi: 300,
  },
  {
    id: 'print_12x16',
    name: '12×16"',
    category: 'print',
    width: 3600,
    height: 4800,
    aspectRatio: '3:4',
    dpi: 300,
  },
  {
    id: 'print_18x24',
    name: '18×24"',
    category: 'print',
    width: 5400,
    height: 7200,
    aspectRatio: '3:4',
    dpi: 300,
  },
  {
    id: 'print_12x18',
    name: '12×18"',
    category: 'print',
    width: 3600,
    height: 5400,
    aspectRatio: '2:3',
    dpi: 300,
  },
  {
    id: 'print_16x24',
    name: '16×24"',
    category: 'print',
    width: 4800,
    height: 7200,
    aspectRatio: '2:3',
    dpi: 300,
  },
  {
    id: 'print_24x36',
    name: '24×36"',
    category: 'print',
    width: 7200,
    height: 10800,
    aspectRatio: '2:3',
    dpi: 300,
  },
  {
    id: 'print_a4',
    name: 'A4',
    category: 'print',
    width: 2480,
    height: 3508,
    aspectRatio: '1:1.414',
    dpi: 300,
  },
  {
    id: 'print_a3',
    name: 'A3',
    category: 'print',
    width: 3508,
    height: 4961,
    aspectRatio: '1:1.414',
    dpi: 300,
  },
];

export const ALL_FORMATS = [...SOCIAL_FORMATS, ...PRINT_FORMATS];

export function getFormatSpec(formatId: string): FormatSpec | undefined {
  return ALL_FORMATS.find((f) => f.id === formatId);
}

export function getFormatsByCategory(category: 'social' | 'print'): FormatSpec[] {
  return ALL_FORMATS.filter((f) => f.category === category);
}
```

- **Step Dependencies**: Step 7.1
- **User Instructions**: 
  1. Download and place font files in `public/fonts/`
  2. Run `npm install canvas` (may require system dependencies)

---

## Step 8.2: Create Design Engine Trigger.dev Task

- **Task**: Implement the complete design engine pipeline as a Trigger.dev task.

- **Files**:

### `trigger/design-engine.ts` (complete implementation)
```typescript
import { task, logger } from '@trigger.dev/sdk/v3';
import { getAdminClient } from '@/lib/supabase/admin';
import { renderQuoteImage } from '@/lib/design-engine/canvas-renderer';
import { checkImageQuality } from '@/lib/design-engine/quality-checker';
import { getFormatSpec, ALL_FORMATS, SOCIAL_FORMATS, PRINT_FORMATS } from '@/lib/design-engine/format-specs';
import { uploadImage, STORAGE_PATHS } from '@/lib/storage/storage-utils';
import type { DesignEnginePayload } from '@/lib/trigger/client';
import type { DesignConfig, ColorConfig } from '@/types/quotes';

export const designEngineTask = task({
  id: 'design-engine',
  
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  
  machine: 'medium-1x',
  maxDuration: 900,
  
  run: async (payload: DesignEnginePayload, { ctx }) => {
    const supabase = getAdminClient();
    const { quoteId, userId, outputFormats, generateMockups } = payload;
    
    logger.info('Starting design engine pipeline', { quoteId, userId });
    
    // Step 1: Fetch quote and design rules
    logger.info('Step 1: Fetching quote and design rules');
    
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();
    
    if (quoteError || !quote) {
      throw new Error(`Quote not found: ${quoteError?.message}`);
    }
    
    // Update quote status
    await supabase
      .from('quotes')
      .update({ status: 'generating' })
      .eq('id', quoteId);
    
    // Get applicable design rules
    const { data: designRules } = await supabase.rpc('get_applicable_design_rules', {
      p_user_id: userId,
      p_collection: quote.collection,
      p_mood: quote.mood,
    });
    
    const designRule = designRules?.[0];
    if (!designRule) {
      throw new Error('No applicable design rules found');
    }
    
    // Build design config
    const colorConfig = designRule.colors[quote.collection as keyof typeof designRule.colors] as ColorConfig;
    const config: DesignConfig = {
      typography: designRule.typography,
      colors: colorConfig,
      layout: designRule.layout,
      decorations: designRule.decorations,
    };
    
    // Step 2: Determine formats to generate
    logger.info('Step 2: Determining output formats');
    
    const formatsToGenerate = outputFormats.length > 0
      ? outputFormats.map((f) => getFormatSpec(f)).filter(Boolean)
      : [...SOCIAL_FORMATS, ...PRINT_FORMATS.slice(0, 2)]; // Default: social + first 2 print
    
    logger.info(`Generating ${formatsToGenerate.length} formats`);
    
    // Step 3: Generate assets for each format
    logger.info('Step 3: Generating assets');
    
    const generatedAssets: Array<{
      format: string;
      url: string;
      key: string;
      qualityScores: Record<string, number>;
      flags: string[];
      flagReasons: Record<string, string>;
      passed: boolean;
    }> = [];
    
    for (const format of formatsToGenerate) {
      if (!format) continue;
      
      logger.info(`Generating ${format.name}`);
      
      try {
        // Render image
        const { buffer, metadata } = await renderQuoteImage({
          width: format.width,
          height: format.height,
          text: quote.text,
          attribution: quote.attribution || undefined,
          config,
        });
        
        // Quality check
        const qualityResult = await checkImageQuality(buffer, metadata.textBounds);
        
        // Upload to R2
        const { url, key } = await uploadImage(
          STORAGE_PATHS.ASSETS,
          userId,
          buffer,
          {
            filename: `${quoteId}-${format.id}.png`,
            prefix: quote.collection,
            metadata: {
              quoteId,
              format: format.id,
              collection: quote.collection,
              mood: quote.mood,
            },
          }
        );
        
        generatedAssets.push({
          format: format.id,
          url,
          key,
          qualityScores: qualityResult.scores,
          flags: qualityResult.flags,
          flagReasons: qualityResult.flagReasons,
          passed: qualityResult.passed,
        });
        
        logger.info(`Generated ${format.name}`, {
          url,
          quality: qualityResult.scores.overall,
          passed: qualityResult.passed,
        });
      } catch (err) {
        logger.error(`Failed to generate ${format.name}`, { error: err });
      }
    }
    
    // Step 4: Save assets to database
    logger.info('Step 4: Saving assets to database');
    
    const assetRecords = generatedAssets.map((asset) => {
      const formatSpec = getFormatSpec(asset.format);
      return {
        user_id: userId,
        quote_id: quoteId,
        format: asset.format,
        dimensions: { width: formatSpec?.width, height: formatSpec?.height },
        file_url: asset.url,
        file_key: asset.key,
        design_config: config,
        quality_scores: asset.qualityScores,
        flags: asset.flags,
        flag_reasons: asset.flagReasons,
        status: 'pending' as const,
      };
    });
    
    const { data: insertedAssets, error: insertError } = await supabase
      .from('assets')
      .insert(assetRecords)
      .select('id, format, quality_scores, flags');
    
    if (insertError) {
      logger.error('Failed to insert assets', { error: insertError });
    }
    
    // Step 5: Check operator mode for auto-approval
    logger.info('Step 5: Checking operator mode for auto-approval');
    
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('global_mode, module_overrides')
      .eq('user_id', userId)
      .single();
    
    const effectiveMode = userSettings?.module_overrides?.design_engine || userSettings?.global_mode || 'supervised';
    const autoApproveThreshold = designRule.quality_thresholds.auto_approve_threshold;
    
    const assetsToAutoApprove: string[] = [];
    const assetsToPendingApproval: string[] = [];
    
    for (const asset of insertedAssets || []) {
      const overallScore = asset.quality_scores?.overall || 0;
      const hasFlags = asset.flags && asset.flags.length > 0;
      
      if (
        effectiveMode === 'autopilot' ||
        (effectiveMode === 'assisted' && overallScore >= autoApproveThreshold && !hasFlags)
      ) {
        assetsToAutoApprove.push(asset.id);
      } else {
        assetsToPendingApproval.push(asset.id);
      }
    }
    
    // Auto-approve qualifying assets
    if (assetsToAutoApprove.length > 0) {
      await supabase
        .from('assets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .in('id', assetsToAutoApprove);
      
      logger.info(`Auto-approved ${assetsToAutoApprove.length} assets`);
    }
    
    // Create approval items for remaining assets
    if (assetsToPendingApproval.length > 0) {
      const approvalItems = insertedAssets
        ?.filter((a) => assetsToPendingApproval.includes(a.id))
        .map((asset) => {
          const formatSpec = getFormatSpec(asset.format);
          const fullAsset = generatedAssets.find((g) => g.format === asset.format);
          
          return {
            user_id: userId,
            type: 'asset' as const,
            reference_id: asset.id,
            reference_table: 'assets',
            payload: {
              type: 'asset',
              quoteId,
              quoteText: quote.text.substring(0, 100) + (quote.text.length > 100 ? '...' : ''),
              assetUrl: fullAsset?.url,
              thumbnailUrl: fullAsset?.url, // Will generate thumbnails in future
              format: formatSpec?.name || asset.format,
              size: `${formatSpec?.width}×${formatSpec?.height}`,
              collection: quote.collection,
              mood: quote.mood,
              qualityScores: asset.quality_scores,
            },
            confidence_score: asset.quality_scores?.overall || 0,
            flags: asset.flags || [],
            flag_reasons: fullAsset?.flagReasons || {},
            collection: quote.collection,
            priority: asset.flags && asset.flags.length > 0 ? 1 : 0, // Flagged items higher priority
          };
        });
      
      if (approvalItems && approvalItems.length > 0) {
        await supabase.from('approval_items').insert(approvalItems);
        logger.info(`Created ${approvalItems.length} approval items`);
      }
    }
    
    // Step 6: Update quote
    logger.info('Step 6: Updating quote');
    
    await supabase
      .from('quotes')
      .update({
        status: 'active',
        assets_generated: quote.assets_generated + generatedAssets.length,
        last_generated_at: new Date().toISOString(),
        generation_settings: {
          designRuleId: designRule.id,
          outputFormats: formatsToGenerate.map((f) => f?.id),
          generateMockups,
        },
      })
      .eq('id', quoteId);
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'asset_generated',
      p_details: {
        quoteId,
        assetCount: generatedAssets.length,
        autoApproved: assetsToAutoApprove.length,
        pendingApproval: assetsToPendingApproval.length,
        formats: generatedAssets.map((a) => a.format),
      },
      p_executed: true,
      p_module: 'design_engine',
      p_reference_id: quoteId,
      p_reference_table: 'quotes',
    });
    
    logger.info('Design engine pipeline complete', {
      quoteId,
      totalGenerated: generatedAssets.length,
      autoApproved: assetsToAutoApprove.length,
      pendingApproval: assetsToPendingApproval.length,
    });
    
    return {
      success: true,
      quoteId,
      assetsGenerated: generatedAssets.length,
      autoApproved: assetsToAutoApprove.length,
      pendingApproval: assetsToPendingApproval.length,
      mockupsQueued: generateMockups,
    };
  },
});
```

### `app/api/quotes/[id]/generate/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { triggerDesignEngine } from '@/lib/trigger/client';

const generateSchema = z.object({
  outputFormats: z.array(z.string()).default([]),
  generateMockups: z.boolean().default(false),
  mockupScenes: z.array(z.string()).default([]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json().catch(() => ({}));
    
    const { outputFormats, generateMockups, mockupScenes } = generateSchema.parse(body);
    
    // Verify quote exists and belongs to user
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();
    
    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    if (quote.status === 'generating') {
      return NextResponse.json(
        { error: 'Quote is already being processed' },
        { status: 409 }
      );
    }
    
    // Trigger design engine
    const { id: runId } = await triggerDesignEngine({
      quoteId: params.id,
      userId,
      outputFormats,
      generateMockups,
    });
    
    return NextResponse.json({
      success: true,
      runId,
      message: 'Asset generation started',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

- **Step Dependencies**: Step 8.1
- **User Instructions**: Run `npx trigger.dev@latest dev` during development

---

## Step 8.3: Create Asset Generation UI

- **Task**: Build the UI for triggering asset generation and monitoring progress.

- **Files**:

### `app/(dashboard)/dashboard/quotes/[id]/generate/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  Image as ImageIcon,
  Frame,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Checkbox,
  Badge,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { SOCIAL_FORMATS, PRINT_FORMATS } from '@/lib/design-engine/format-specs';
import type { Quote } from '@/types/quotes';
import { useToast } from '@/components/providers/toast-provider';
import Link from 'next/link';

const MOCKUP_SCENES = [
  { id: 'bedroom', name: 'Bedroom', description: 'Framed on bedside table' },
  { id: 'therapy_office', name: 'Therapy Office', description: 'Wall art in counseling setting' },
  { id: 'living_room', name: 'Living Room', description: 'Gallery wall display' },
  { id: 'reading_nook', name: 'Reading Nook', description: 'Cozy corner setting' },
  { id: 'home_office', name: 'Home Office', description: 'Desk or shelf display' },
];

export default function GenerateAssetsPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const { toast } = useToast();

  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    'pinterest',
    'instagram_post',
    'print_8x10',
    'print_11x14',
  ]);
  const [generateMockups, setGenerateMockups] = useState(false);
  const [selectedScenes, setSelectedScenes] = useState<string[]>(['bedroom', 'living_room']);

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => api.get<Quote>(`/quotes/${quoteId}`),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post(`/quotes/${quoteId}/generate`, {
        outputFormats: selectedFormats,
        generateMockups,
        mockupScenes: generateMockups ? selectedScenes : [],
      }),
    onSuccess: () => {
      toast('Asset generation started! Check the approval queue for results.', 'success');
      router.push('/dashboard/approval-queue');
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : 'Failed to start generation', 'error');
    },
  });

  const toggleFormat = (formatId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId)
        ? prev.filter((f) => f !== formatId)
        : [...prev, formatId]
    );
  };

  const toggleScene = (sceneId: string) => {
    setSelectedScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((s) => s !== sceneId)
        : [...prev, sceneId]
    );
  };

  const selectAllSocial = () => {
    const socialIds = SOCIAL_FORMATS.map((f) => f.id);
    setSelectedFormats((prev) => [...new Set([...prev, ...socialIds])]);
  };

  const selectAllPrint = () => {
    const printIds = PRINT_FORMATS.map((f) => f.id);
    setSelectedFormats((prev) => [...new Set([...prev, ...printIds])]);
  };

  if (quoteLoading) {
    return (
      <PageContainer title="Generate Assets">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sage" />
        </div>
      </PageContainer>
    );
  }

  if (!quote) {
    return (
      <PageContainer title="Quote Not Found">
        <Card className="p-8 text-center">
          <p className="text-body text-[var(--color-text-secondary)]">
            The quote you're looking for doesn't exist.
          </p>
          <Link href="/dashboard/quotes">
            <Button variant="secondary" className="mt-4">
              Back to Quotes
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Generate Assets"
      description="Select output formats and options"
    >
      <div className="max-w-3xl space-y-6">
        {/* Back link */}
        <Link
          href={`/dashboard/quotes`}
          className="inline-flex items-center text-body-sm text-[var(--color-text-secondary)] hover:text-charcoal"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Quotes
        </Link>

        {/* Quote Preview */}
        <Card>
          <CardContent className="p-6">
            <p className="text-h3 font-serif italic">"{quote.text}"</p>
            {quote.attribution && (
              <p className="mt-2 text-body-sm text-[var(--color-text-secondary)]">
                — {quote.attribution}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Badge variant={quote.collection as 'grounding' | 'wholeness' | 'growth'}>
                {quote.collection}
              </Badge>
              <Badge variant="secondary">{quote.mood}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Social Formats */}
        <Card>
          <CardHeader
            title="Social Media Formats"
            description="Optimized for sharing on social platforms"
            action={
              <Button variant="ghost" size="sm" onClick={selectAllSocial}>
                Select All
              </Button>
            }
          />
          <CardContent className="p-6 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SOCIAL_FORMATS.map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  selected={selectedFormats.includes(format.id)}
                  onToggle={() => toggleFormat(format.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Print Formats */}
        <Card>
          <CardHeader
            title="Print Sizes"
            description="High-resolution files for physical prints"
            action={
              <Button variant="ghost" size="sm" onClick={selectAllPrint}>
                Select All
              </Button>
            }
          />
          <CardContent className="p-6 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRINT_FORMATS.map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  selected={selectedFormats.includes(format.id)}
                  onToggle={() => toggleFormat(format.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mockups */}
        <Card>
          <CardHeader
            title="Generate Mockups"
            description="Create lifestyle mockups using Dynamic Mockups API"
          />
          <CardContent className="p-6 pt-0">
            <div className="mb-4">
              <Checkbox
                checked={generateMockups}
                onChange={() => setGenerateMockups(!generateMockups)}
                label="Generate mockups for approved assets"
                description="Credits will be charged when mockups are generated"
              />
            </div>

            {generateMockups && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-body-sm font-medium mb-3">Select Scenes</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MOCKUP_SCENES.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => toggleScene(scene.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-md border p-3 text-left transition-colors',
                        selectedScenes.includes(scene.id)
                          ? 'border-sage bg-sage-pale'
                          : 'hover:bg-elevated'
                      )}
                    >
                      <div
                        className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center',
                          selectedScenes.includes(scene.id)
                            ? 'bg-sage border-sage'
                            : 'border-[var(--color-border)]'
                        )}
                      >
                        {selectedScenes.includes(scene.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-body-sm font-medium">{scene.name}</p>
                        <p className="text-caption text-[var(--color-text-tertiary)]">
                          {scene.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & Generate */}
        <Card className="bg-sage-pale border-sage/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">Ready to Generate</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  {selectedFormats.length} format{selectedFormats.length !== 1 ? 's' : ''} selected
                  {generateMockups && ` • ${selectedScenes.length} mockup scene${selectedScenes.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button
                onClick={() => generateMutation.mutate()}
                isLoading={generateMutation.isPending}
                disabled={selectedFormats.length === 0}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Generate Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function FormatCard({
  format,
  selected,
  onToggle,
}: {
  format: { id: string; name: string; width: number; height: number; aspectRatio: string };
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 rounded-md border p-3 text-left transition-colors',
        selected ? 'border-sage bg-sage-pale' : 'hover:bg-elevated'
      )}
    >
      <div
        className={cn(
          'h-5 w-5 rounded border flex items-center justify-center shrink-0',
          selected ? 'bg-sage border-sage' : 'border-[var(--color-border)]'
        )}
      >
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="min-w-0">
        <p className="text-body-sm font-medium">{format.name}</p>
        <p className="text-caption text-[var(--color-text-tertiary)]">
          {format.width}×{format.height}px • {format.aspectRatio}
        </p>
      </div>
    </button>
  );
}
```

- **Step Dependencies**: Step 8.2
- **User Instructions**: None

---

## Step 8.4: Create Design Templates System

- **Task**: Create templates for pre-designed quote layouts.

- **Files**:

### `supabase/migrations/006a_templates.sql`
```sql
-- ============================================================================
-- Migration: 006a_templates
-- Description: Design templates for pre-built layouts
-- Feature: 7.4 (Templates Schema)
-- ============================================================================

CREATE TABLE design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  
  -- Template Type
  type TEXT NOT NULL DEFAULT 'quote' CHECK (type IN ('quote', 'product', 'announcement')),
  category TEXT, -- 'minimal', 'bold', 'elegant', 'playful'
  
  -- Design Configuration
  layout JSONB NOT NULL DEFAULT '{}',
  -- {
  --   text_position: 'center' | 'top' | 'bottom' | 'left' | 'right',
  --   text_alignment: 'center' | 'left' | 'right',
  --   padding: { top, right, bottom, left },
  --   attribution_position: 'below' | 'inline' | 'hidden'
  -- }
  
  typography JSONB NOT NULL DEFAULT '{}',
  -- {
  --   font_family: string,
  --   font_size_scale: number (0.5 - 2.0),
  --   line_height: number,
  --   letter_spacing: number,
  --   text_transform: 'none' | 'uppercase' | 'lowercase'
  -- }
  
  colors JSONB NOT NULL DEFAULT '{}',
  -- {
  --   background: string,
  --   text: string,
  --   accent: string,
  --   gradient: { from, to, direction }
  -- }
  
  decorations JSONB NOT NULL DEFAULT '{}',
  -- {
  --   border: { width, color, radius },
  --   shadow: { x, y, blur, color },
  --   overlay: { color, opacity }
  -- }
  
  -- Compatibility
  compatible_formats TEXT[] DEFAULT '{}',
  compatible_moods TEXT[] DEFAULT '{}',
  
  -- Status
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Usage Stats
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_templates_user ON design_templates(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_templates_type ON design_templates(type, category);
CREATE INDEX idx_templates_system ON design_templates(is_system) WHERE is_system = true;

-- RLS
ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_select ON design_templates FOR SELECT 
  USING (is_system = true OR user_id = auth.uid());

CREATE POLICY templates_insert ON design_templates FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY templates_update ON design_templates FOR UPDATE 
  USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY templates_delete ON design_templates FOR DELETE 
  USING (user_id = auth.uid() AND is_system = false);

-- Trigger
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON design_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed system templates
INSERT INTO design_templates (is_system, name, description, type, category, layout, typography, colors, compatible_formats, compatible_moods) VALUES
(true, 'Minimal Center', 'Clean centered text on solid background', 'quote', 'minimal', 
  '{"text_position": "center", "text_alignment": "center", "padding": {"top": 80, "right": 60, "bottom": 80, "left": 60}}',
  '{"font_family": "Playfair Display", "font_size_scale": 1.0, "line_height": 1.4}',
  '{"background": "#ffffff", "text": "#1a1a1a"}',
  ARRAY['instagram_square', 'pinterest_pin'], ARRAY['calm', 'thoughtful', 'elegant']),

(true, 'Bold Impact', 'Large bold text with high contrast', 'quote', 'bold',
  '{"text_position": "center", "text_alignment": "center", "padding": {"top": 60, "right": 40, "bottom": 60, "left": 40}}',
  '{"font_family": "Montserrat", "font_size_scale": 1.3, "text_transform": "uppercase", "letter_spacing": 2}',
  '{"background": "#1a1a1a", "text": "#ffffff"}',
  ARRAY['instagram_square', 'instagram_story'], ARRAY['bold', 'powerful', 'motivational']),

(true, 'Elegant Script', 'Sophisticated script font styling', 'quote', 'elegant',
  '{"text_position": "center", "text_alignment": "center", "padding": {"top": 100, "right": 80, "bottom": 100, "left": 80}}',
  '{"font_family": "Dancing Script", "font_size_scale": 1.1, "line_height": 1.6}',
  '{"background": "#f5f0eb", "text": "#2d2d2d", "accent": "#b8860b"}',
  ARRAY['pinterest_pin', 'instagram_square'], ARRAY['romantic', 'elegant', 'soft']),

(true, 'Nature Overlay', 'Text with semi-transparent overlay', 'quote', 'playful',
  '{"text_position": "bottom", "text_alignment": "left", "padding": {"top": 40, "right": 40, "bottom": 60, "left": 40}}',
  '{"font_family": "Lora", "font_size_scale": 0.9}',
  '{"background": "#4a5568", "text": "#ffffff"}',
  ARRAY['instagram_square', 'facebook_post'], ARRAY['nature', 'peaceful', 'thoughtful']);
```

### `types/templates.ts`
```typescript
export interface DesignTemplate {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  preview_url?: string;
  type: 'quote' | 'product' | 'announcement';
  category?: string;
  layout: TemplateLayout;
  typography: TemplateTypography;
  colors: TemplateColors;
  decorations: TemplateDecorations;
  compatible_formats: string[];
  compatible_moods: string[];
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateLayout {
  text_position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  text_alignment: 'center' | 'left' | 'right';
  padding: { top: number; right: number; bottom: number; left: number };
  attribution_position?: 'below' | 'inline' | 'hidden';
}

export interface TemplateTypography {
  font_family: string;
  font_size_scale: number;
  line_height?: number;
  letter_spacing?: number;
  text_transform?: 'none' | 'uppercase' | 'lowercase';
}

export interface TemplateColors {
  background: string;
  text: string;
  accent?: string;
  gradient?: { from: string; to: string; direction: string };
}

export interface TemplateDecorations {
  border?: { width: number; color: string; radius: number };
  shadow?: { x: number; y: number; blur: number; color: string };
  overlay?: { color: string; opacity: number };
}
```

### `app/api/templates/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const category = searchParams.get('category');

  let query = supabase
    .from('design_templates')
    .select('*')
    .eq('is_active', true)
    .order('is_system', { ascending: false })
    .order('usage_count', { ascending: false });

  // Include system templates + user's templates
  if (user) {
    query = query.or(`is_system.eq.true,user_id.eq.${user.id}`);
  } else {
    query = query.eq('is_system', true);
  }

  if (type) query = query.eq('type', type);
  if (category) query = query.eq('category', category);

  const { data: templates, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data: template, error } = await supabase
    .from('design_templates')
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description,
      type: body.type || 'quote',
      category: body.category,
      layout: body.layout || {},
      typography: body.typography || {},
      colors: body.colors || {},
      decorations: body.decorations || {},
      compatible_formats: body.compatible_formats || [],
      compatible_moods: body.compatible_moods || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
```

- **Step Dependencies**: Step 8.3
- **User Instructions**: Run migration `006a_templates.sql`

---

## Step 8.5: Create Design Rules Editor UI

- **Task**: Build the UI for managing design rules and templates.

- **Files**:

### `components/design/design-rules-editor.tsx`
```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, RotateCcw, Eye } from 'lucide-react';

interface DesignRulesEditorProps {
  userId: string;
}

export function DesignRulesEditor({ userId }: DesignRulesEditorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('typography');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['design-rules'],
    queryFn: async () => {
      const response = await fetch('/api/design-rules');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const [localRules, setLocalRules] = useState(rules?.rules || {});

  const saveMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch('/api/design-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to save');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-rules'] });
      setHasChanges(false);
    },
  });

  const updateRule = (category: string, key: string, value: any) => {
    setLocalRules((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localRules);
  };

  const handleReset = () => {
    setLocalRules(rules?.rules || {});
    setHasChanges(false);
  };

  if (isLoading) {
    return <div>Loading design rules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Design Rules</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        {/* Typography Tab */}
        <TabsContent value="typography">
          <Card className="p-6 space-y-6">
            <div>
              <Label>Primary Font</Label>
              <Select
                value={localRules.typography?.primary_font || 'Playfair Display'}
                onChange={(v) => updateRule('typography', 'primary_font', v)}
                options={[
                  { value: 'Playfair Display', label: 'Playfair Display' },
                  { value: 'Montserrat', label: 'Montserrat' },
                  { value: 'Lora', label: 'Lora' },
                  { value: 'Roboto', label: 'Roboto' },
                  { value: 'Open Sans', label: 'Open Sans' },
                ]}
              />
            </div>

            <div>
              <Label>Base Font Size: {localRules.typography?.base_size || 48}px</Label>
              <Slider
                value={[localRules.typography?.base_size || 48]}
                onValueChange={([v]) => updateRule('typography', 'base_size', v)}
                min={24}
                max={96}
                step={2}
              />
            </div>

            <div>
              <Label>Line Height: {localRules.typography?.line_height || 1.4}</Label>
              <Slider
                value={[localRules.typography?.line_height || 1.4]}
                onValueChange={([v]) => updateRule('typography', 'line_height', v)}
                min={1}
                max={2}
                step={0.1}
              />
            </div>

            <div>
              <Label>Letter Spacing: {localRules.typography?.letter_spacing || 0}px</Label>
              <Slider
                value={[localRules.typography?.letter_spacing || 0]}
                onValueChange={([v]) => updateRule('typography', 'letter_spacing', v)}
                min={-2}
                max={10}
                step={0.5}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.background || '#ffffff'}
                    onChange={(e) => updateRule('colors', 'background', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.background || '#ffffff'}
                    onChange={(e) => updateRule('colors', 'background', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.text || '#1a1a1a'}
                    onChange={(e) => updateRule('colors', 'text', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.text || '#1a1a1a'}
                    onChange={(e) => updateRule('colors', 'text', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Accent Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.accent || '#4f7c5f'}
                    onChange={(e) => updateRule('colors', 'accent', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.accent || '#4f7c5f'}
                    onChange={(e) => updateRule('colors', 'accent', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Attribution Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.attribution || '#666666'}
                    onChange={(e) => updateRule('colors', 'attribution', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.attribution || '#666666'}
                    onChange={(e) => updateRule('colors', 'attribution', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout">
          <Card className="p-6 space-y-6">
            <div>
              <Label>Default Text Position</Label>
              <Select
                value={localRules.layout?.text_position || 'center'}
                onChange={(v) => updateRule('layout', 'text_position', v)}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'top', label: 'Top' },
                  { value: 'bottom', label: 'Bottom' },
                ]}
              />
            </div>

            <div>
              <Label>Horizontal Padding: {localRules.layout?.padding_x || 60}px</Label>
              <Slider
                value={[localRules.layout?.padding_x || 60]}
                onValueChange={([v]) => updateRule('layout', 'padding_x', v)}
                min={20}
                max={150}
                step={5}
              />
            </div>

            <div>
              <Label>Vertical Padding: {localRules.layout?.padding_y || 80}px</Label>
              <Slider
                value={[localRules.layout?.padding_y || 80]}
                onValueChange={([v]) => updateRule('layout', 'padding_y', v)}
                min={20}
                max={150}
                step={5}
              />
            </div>

            <div>
              <Label>Safe Zone Margin: {localRules.layout?.safe_zone || 5}%</Label>
              <Slider
                value={[localRules.layout?.safe_zone || 5]}
                onValueChange={([v]) => updateRule('layout', 'safe_zone', v)}
                min={0}
                max={15}
                step={1}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality">
          <Card className="p-6 space-y-6">
            <div>
              <Label>Minimum Contrast Ratio: {localRules.quality?.min_contrast || 4.5}</Label>
              <Slider
                value={[localRules.quality?.min_contrast || 4.5]}
                onValueChange={([v]) => updateRule('quality', 'min_contrast', v)}
                min={3}
                max={7}
                step={0.5}
              />
              <p className="text-sm text-muted-foreground mt-1">
                WCAG AA requires 4.5:1 for normal text
              </p>
            </div>

            <div>
              <Label>Auto-Approval Threshold: {localRules.quality?.auto_approve_threshold || 85}%</Label>
              <Slider
                value={[localRules.quality?.auto_approve_threshold || 85]}
                onValueChange={([v]) => updateRule('quality', 'auto_approve_threshold', v)}
                min={50}
                max={100}
                step={5}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Assets above this score are auto-approved in Assisted mode
              </p>
            </div>

            <div>
              <Label>Minimum Quality Score: {localRules.quality?.min_score || 60}%</Label>
              <Slider
                value={[localRules.quality?.min_score || 60]}
                onValueChange={([v]) => updateRule('quality', 'min_score', v)}
                min={0}
                max={80}
                step={5}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Assets below this score are flagged for review
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### `app/(dashboard)/dashboard/design/rules/page.tsx`
```tsx
import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/layout/page-container';
import { DesignRulesEditor } from '@/components/design/design-rules-editor';

export default async function DesignRulesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <PageContainer
      title="Design Rules"
      description="Configure default styling for generated assets"
    >
      <DesignRulesEditor userId={user.id} />
    </PageContainer>
  );
}
```

- **Step Dependencies**: Step 8.4
- **User Instructions**: None

---

**Part 6 Summary**

This part covers:

**Phase 7 (Design System Foundation):**
- Complete quotes database schema with collection/mood classification
- Assets table with quality scores and status tracking
- Design rules table with configurable typography, colors, and layout
- Quotes CRUD API endpoints with search and filtering
- Quote import API for bulk CSV imports
- Comprehensive quote management UI (list, create, edit, import)
- **Design Templates System** with pre-built layouts
- System templates for minimal, bold, elegant, and playful styles
- Custom user templates with full configuration

**Phase 8 (Design Engine Pipeline):**
- Canvas-based image renderer using node-canvas
- Quality checking system (readability, contrast, composition)
- Format specifications for all social and print sizes per spec
- Complete Trigger.dev task for the design engine pipeline
- Auto-approval logic based on operator mode and quality thresholds
- Asset generation API endpoint
- Generation UI with format and mockup selection
- **Design Rules Editor UI** with live preview
- Typography, colors, layout, and quality threshold controls

---

**Remaining phases to cover in subsequent parts:**
- **Part 7:** Phase 9 (Dynamic Mockups), Phase 10 (Shopify Products)
- **Part 8:** Phase 11-13 (Pinterest Core, Analytics, Ads)
- **Part 9:** Phase 14-16 (Lead Capture, Quiz, Abandonment)
- **Part 10:** Phase 17-19 (Customer Journey, Win-Back, Loyalty)
- **Part 11:** Phase 20-24 (Attribution, Campaigns, Intelligence, Daily Digest, Polish)
