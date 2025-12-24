# Haven Hub: Complete Implementation Task Plan
## Part 7: Phases 9-10 (Dynamic Mockups, Shopify Products)

---

# Phase 9: Dynamic Mockups Integration

## Step 9.1: Create Mockups Database Schema

- **Task**: Create the database schema for mockup tracking, credits, and scene configurations.

- **Files**:

### `supabase/migrations/007_mockups.sql`
```sql
-- ============================================================================
-- Migration: 007_mockups
-- Description: Mockups table and credit tracking
-- Feature: 9 (Dynamic Mockups Integration)
-- ============================================================================

-- ============================================================================
-- Mockups Table
-- ============================================================================
CREATE TABLE mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  
  -- Scene configuration
  scene TEXT NOT NULL,
  scene_config JSONB NOT NULL DEFAULT '{}',
  -- { template_id, placement, size, rotation, etc. }
  
  -- Generated files
  file_url TEXT NOT NULL,
  file_key TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Dynamic Mockups API response
  dm_render_id TEXT, -- Dynamic Mockups render ID
  dm_metadata JSONB DEFAULT '{}',
  
  -- Credits
  credits_used INTEGER NOT NULL DEFAULT 1,
  
  -- Quality/Status
  quality_score NUMERIC(4,3),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'generating', 'completed', 'failed', 'approved', 'rejected'
  )),
  error_message TEXT,
  
  -- Performance (when used in pins)
  total_pins INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_mockups_user ON mockups(user_id);
CREATE INDEX idx_mockups_asset ON mockups(asset_id);
CREATE INDEX idx_mockups_quote ON mockups(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX idx_mockups_scene ON mockups(user_id, scene);
CREATE INDEX idx_mockups_status ON mockups(user_id, status);
CREATE INDEX idx_mockups_pending ON mockups(user_id, created_at) WHERE status = 'pending';

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE mockups ENABLE ROW LEVEL SECURITY;

CREATE POLICY mockups_select ON mockups FOR SELECT USING (user_id = auth.uid());
CREATE POLICY mockups_insert ON mockups FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY mockups_update ON mockups FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY mockups_delete ON mockups FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER mockups_updated_at
  BEFORE UPDATE ON mockups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Mockup Credit Usage Table (for tracking and reporting)
-- ============================================================================
CREATE TABLE mockup_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mockup_id UUID REFERENCES mockups(id) ON DELETE SET NULL,
  
  -- Usage details
  credits INTEGER NOT NULL,
  operation TEXT NOT NULL, -- 'generation', 'regeneration', 'refund'
  
  -- Balance tracking
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Annual budget tracking
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM NOW()),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_usage_user ON mockup_credit_usage(user_id);
CREATE INDEX idx_credit_usage_year ON mockup_credit_usage(user_id, year);
CREATE INDEX idx_credit_usage_month ON mockup_credit_usage(user_id, year, month);

ALTER TABLE mockup_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_usage_select ON mockup_credit_usage 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY credit_usage_insert ON mockup_credit_usage 
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Scene Templates Table
-- ============================================================================
CREATE TABLE mockup_scene_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scene identification
  scene_key TEXT NOT NULL, -- 'bedroom', 'therapy_office', etc.
  name TEXT NOT NULL,
  description TEXT,
  
  -- Dynamic Mockups template reference
  dm_template_id TEXT NOT NULL,
  dm_template_url TEXT,
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',
  -- { smart_object_name, default_size, default_position, etc. }
  
  -- Preview image
  preview_url TEXT,
  
  -- Availability
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false, -- true for built-in scenes
  
  -- Collections this scene works well with
  recommended_collections TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System scenes are global, user scenes are per-user
CREATE UNIQUE INDEX idx_scene_templates_key 
  ON mockup_scene_templates(scene_key) 
  WHERE user_id IS NULL AND is_system = true;

CREATE INDEX idx_scene_templates_user 
  ON mockup_scene_templates(user_id) 
  WHERE user_id IS NOT NULL;

ALTER TABLE mockup_scene_templates ENABLE ROW LEVEL SECURITY;

-- Users can see system templates and their own
CREATE POLICY scene_templates_select ON mockup_scene_templates 
  FOR SELECT USING (is_system = true OR user_id = auth.uid());

CREATE POLICY scene_templates_insert ON mockup_scene_templates 
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY scene_templates_update ON mockup_scene_templates 
  FOR UPDATE USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY scene_templates_delete ON mockup_scene_templates 
  FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- ============================================================================
-- Function: Get credit usage for period
-- ============================================================================
CREATE OR REPLACE FUNCTION get_credit_usage(
  p_user_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_used INTEGER,
  monthly_used INTEGER,
  annual_budget INTEGER,
  monthly_soft_limit INTEGER,
  remaining_annual INTEGER,
  remaining_monthly INTEGER
) AS $$
DECLARE
  v_annual_budget INTEGER;
  v_monthly_limit INTEGER;
  v_total_used INTEGER;
  v_monthly_used INTEGER;
BEGIN
  -- Get guardrails
  SELECT 
    (guardrails->>'annual_mockup_budget')::INTEGER,
    (guardrails->>'monthly_mockup_soft_limit')::INTEGER
  INTO v_annual_budget, v_monthly_limit
  FROM user_settings
  WHERE user_id = p_user_id;
  
  -- Default values
  v_annual_budget := COALESCE(v_annual_budget, 3500);
  v_monthly_limit := COALESCE(v_monthly_limit, 292);
  
  -- Get annual usage
  SELECT COALESCE(SUM(credits), 0)
  INTO v_total_used
  FROM mockup_credit_usage
  WHERE user_id = p_user_id
    AND year = p_year
    AND operation = 'generation';
  
  -- Get monthly usage
  SELECT COALESCE(SUM(credits), 0)
  INTO v_monthly_used
  FROM mockup_credit_usage
  WHERE user_id = p_user_id
    AND year = p_year
    AND month = COALESCE(p_month, EXTRACT(MONTH FROM NOW()))
    AND operation = 'generation';
  
  RETURN QUERY SELECT
    v_total_used,
    v_monthly_used,
    v_annual_budget,
    v_monthly_limit,
    GREATEST(v_annual_budget - v_total_used, 0),
    GREATEST(v_monthly_limit - v_monthly_used, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: Reserve credits before generation
-- ============================================================================
CREATE OR REPLACE FUNCTION reserve_mockup_credits(
  p_user_id UUID,
  p_credits INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  remaining INTEGER,
  message TEXT
) AS $$
DECLARE
  v_annual_budget INTEGER;
  v_used INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Get budget and usage
  SELECT 
    (guardrails->>'annual_mockup_budget')::INTEGER
  INTO v_annual_budget
  FROM user_settings
  WHERE user_id = p_user_id;
  
  v_annual_budget := COALESCE(v_annual_budget, 3500);
  
  SELECT COALESCE(SUM(credits), 0)
  INTO v_used
  FROM mockup_credit_usage
  WHERE user_id = p_user_id
    AND year = EXTRACT(YEAR FROM NOW())
    AND operation = 'generation';
  
  v_remaining := v_annual_budget - v_used;
  
  IF v_remaining < p_credits THEN
    RETURN QUERY SELECT 
      false, 
      v_remaining,
      'Insufficient credits. ' || v_remaining || ' remaining.';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true, 
    v_remaining - p_credits,
    'Credits reserved successfully.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Insert system scene templates
-- ============================================================================
INSERT INTO mockup_scene_templates (scene_key, name, description, dm_template_id, is_system, recommended_collections, config)
VALUES
  ('bedroom', 'Bedroom', 'Cozy bedroom setting with natural light', 'dm_bedroom_001', true, ARRAY['grounding', 'wholeness'], 
   '{"smart_object": "artwork_frame", "default_size": {"width": 800, "height": 1000}}'),
  ('therapy_office', 'Therapy Office', 'Professional office with warm tones', 'dm_therapy_001', true, ARRAY['wholeness', 'growth'],
   '{"smart_object": "wall_art", "default_size": {"width": 600, "height": 800}}'),
  ('living_room', 'Living Room', 'Modern living space with natural elements', 'dm_living_001', true, ARRAY['grounding', 'growth'],
   '{"smart_object": "frame_display", "default_size": {"width": 900, "height": 1200}}'),
  ('reading_nook', 'Reading Nook', 'Intimate corner with soft lighting', 'dm_reading_001', true, ARRAY['grounding', 'wholeness'],
   '{"smart_object": "small_frame", "default_size": {"width": 500, "height": 700}}'),
  ('home_office', 'Home Office', 'Productive workspace with inspiring decor', 'dm_office_001', true, ARRAY['growth'],
   '{"smart_object": "desk_frame", "default_size": {"width": 600, "height": 800}}')
ON CONFLICT DO NOTHING;
```

### `types/mockups.ts`
```typescript
export interface Mockup {
  id: string;
  user_id: string;
  asset_id: string;
  quote_id: string | null;
  scene: string;
  scene_config: SceneConfig;
  file_url: string;
  file_key: string;
  thumbnail_url: string | null;
  dm_render_id: string | null;
  dm_metadata: Record<string, unknown>;
  credits_used: number;
  quality_score: number | null;
  status: MockupStatus;
  error_message: string | null;
  total_pins: number;
  total_impressions: number;
  created_at: string;
  updated_at: string;
}

export type MockupStatus = 
  | 'pending' 
  | 'generating' 
  | 'completed' 
  | 'failed' 
  | 'approved' 
  | 'rejected';

export interface SceneConfig {
  smart_object?: string;
  default_size?: { width: number; height: number };
  position?: { x: number; y: number };
  rotation?: number;
  scale?: number;
}

export interface MockupSceneTemplate {
  id: string;
  user_id: string | null;
  scene_key: string;
  name: string;
  description: string | null;
  dm_template_id: string;
  dm_template_url: string | null;
  config: SceneConfig;
  preview_url: string | null;
  is_active: boolean;
  is_system: boolean;
  recommended_collections: string[];
  created_at: string;
  updated_at: string;
}

export interface CreditUsage {
  total_used: number;
  monthly_used: number;
  annual_budget: number;
  monthly_soft_limit: number;
  remaining_annual: number;
  remaining_monthly: number;
}

export interface MockupGenerationRequest {
  assetIds: string[];
  scenes: string[];
  skipApproval?: boolean;
}

export interface MockupGenerationResult {
  mockupId: string;
  assetId: string;
  scene: string;
  status: 'success' | 'failed';
  url?: string;
  error?: string;
  creditsUsed: number;
}
```

- **Step Dependencies**: Step 7.1
- **User Instructions**: Run migration

---

## Step 9.2: Implement Dynamic Mockups API Client

- **Task**: Create the Dynamic Mockups API client with render methods and error handling.

- **Files**:

### `lib/integrations/dynamic-mockups/config.ts`
```typescript
export const DM_CONFIG = {
  apiKey: process.env.DYNAMIC_MOCKUPS_API_KEY!,
  baseUrl: 'https://api.dynamicmockups.com/v1',
  creditsPerRender: 1,
  maxBatchSize: 10,
  timeoutMs: 120000, // 2 minutes
};
```

### `lib/integrations/dynamic-mockups/client.ts`
```typescript
import { DM_CONFIG } from './config';

interface RenderRequest {
  template_id: string;
  layers: Array<{
    name: string;
    image_url: string;
    fit?: 'contain' | 'cover' | 'fill';
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  }>;
  output?: {
    format?: 'png' | 'jpg';
    quality?: number;
    width?: number;
    height?: number;
  };
}

interface RenderResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url?: string;
  thumbnail_url?: string;
  error?: string;
  credits_used: number;
  created_at: string;
  completed_at?: string;
}

interface TemplateInfo {
  id: string;
  name: string;
  preview_url: string;
  layers: Array<{
    name: string;
    type: 'image' | 'text' | 'shape';
    is_smart_object: boolean;
    default_size: { width: number; height: number };
  }>;
}

export class DynamicMockupsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || DM_CONFIG.apiKey;
    this.baseUrl = DM_CONFIG.baseUrl;
    
    if (!this.apiKey) {
      throw new Error('Dynamic Mockups API key not configured');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DM_CONFIG.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new DynamicMockupsError(
          error.message || `API error: ${response.status}`,
          response.status,
          error.code
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof DynamicMockupsError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new DynamicMockupsError('Request timed out', 408, 'TIMEOUT');
      }
      
      throw new DynamicMockupsError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        'UNKNOWN'
      );
    }
  }

  /**
   * Create a new render job
   */
  async createRender(request: RenderRequest): Promise<RenderResponse> {
    return this.request('/renders', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get render status and result
   */
  async getRender(renderId: string): Promise<RenderResponse> {
    return this.request(`/renders/${renderId}`);
  }

  /**
   * Wait for render to complete (with polling)
   */
  async waitForRender(
    renderId: string,
    options?: {
      maxWaitMs?: number;
      pollIntervalMs?: number;
    }
  ): Promise<RenderResponse> {
    const maxWait = options?.maxWaitMs || 120000;
    const pollInterval = options?.pollIntervalMs || 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const render = await this.getRender(renderId);
      
      if (render.status === 'completed') {
        return render;
      }
      
      if (render.status === 'failed') {
        throw new DynamicMockupsError(
          render.error || 'Render failed',
          500,
          'RENDER_FAILED'
        );
      }
      
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new DynamicMockupsError('Render timed out', 408, 'RENDER_TIMEOUT');
  }

  /**
   * Create render and wait for completion
   */
  async renderAndWait(request: RenderRequest): Promise<RenderResponse> {
    const render = await this.createRender(request);
    return this.waitForRender(render.id);
  }

  /**
   * Get template information
   */
  async getTemplate(templateId: string): Promise<TemplateInfo> {
    return this.request(`/templates/${templateId}`);
  }

  /**
   * List available templates
   */
  async listTemplates(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<{ templates: TemplateInfo[]; total: number }> {
    const query = new URLSearchParams(params as Record<string, string>);
    return this.request(`/templates?${query}`);
  }

  /**
   * Get account credits
   */
  async getCredits(): Promise<{ remaining: number; total: number }> {
    return this.request('/account/credits');
  }
}

export class DynamicMockupsError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'DynamicMockupsError';
    this.status = status;
    this.code = code;
  }
}

// Singleton instance
let clientInstance: DynamicMockupsClient | null = null;

export function getDynamicMockupsClient(): DynamicMockupsClient {
  if (!clientInstance) {
    clientInstance = new DynamicMockupsClient();
  }
  return clientInstance;
}
```

### `lib/integrations/dynamic-mockups/render-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDynamicMockupsClient } from './client';
import { uploadFile, generateStorageKey, STORAGE_PATHS } from '@/lib/storage/storage-utils';
import type { MockupGenerationResult } from '@/types/mockups';

interface RenderOptions {
  assetId: string;
  assetUrl: string;
  scene: string;
  sceneConfig: {
    dm_template_id: string;
    smart_object: string;
    default_size: { width: number; height: number };
  };
  userId: string;
  quoteId?: string;
}

export async function renderMockup(options: RenderOptions): Promise<MockupGenerationResult> {
  const supabase = createServerSupabaseClient();
  const client = getDynamicMockupsClient();
  
  try {
    // Reserve credits
    const { data: creditCheck } = await supabase.rpc('reserve_mockup_credits', {
      p_user_id: options.userId,
      p_credits: 1,
    });
    
    if (!creditCheck?.[0]?.success) {
      return {
        mockupId: '',
        assetId: options.assetId,
        scene: options.scene,
        status: 'failed',
        error: creditCheck?.[0]?.message || 'Insufficient credits',
        creditsUsed: 0,
      };
    }

    // Create render request
    const renderResponse = await client.renderAndWait({
      template_id: options.sceneConfig.dm_template_id,
      layers: [
        {
          name: options.sceneConfig.smart_object,
          image_url: options.assetUrl,
          fit: 'contain',
          size: options.sceneConfig.default_size,
        },
      ],
      output: {
        format: 'png',
        quality: 95,
      },
    });

    if (!renderResponse.result_url) {
      throw new Error('No result URL in render response');
    }

    // Download and upload to R2
    const imageResponse = await fetch(renderResponse.result_url);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    const storageKey = generateStorageKey(
      STORAGE_PATHS.MOCKUPS,
      options.userId,
      `mockup-${options.scene}.png`,
      options.assetId
    );
    
    const fileUrl = await uploadFile(storageKey, imageBuffer, 'image/png');

    // Create mockup record
    const { data: mockup, error } = await supabase
      .from('mockups')
      .insert({
        user_id: options.userId,
        asset_id: options.assetId,
        quote_id: options.quoteId,
        scene: options.scene,
        scene_config: options.sceneConfig,
        file_url: fileUrl,
        file_key: storageKey,
        thumbnail_url: renderResponse.thumbnail_url,
        dm_render_id: renderResponse.id,
        dm_metadata: renderResponse,
        credits_used: renderResponse.credits_used,
        status: 'completed',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Record credit usage
    await supabase.from('mockup_credit_usage').insert({
      user_id: options.userId,
      mockup_id: mockup.id,
      credits: renderResponse.credits_used,
      operation: 'generation',
      balance_before: creditCheck[0].remaining + renderResponse.credits_used,
      balance_after: creditCheck[0].remaining,
    });

    return {
      mockupId: mockup.id,
      assetId: options.assetId,
      scene: options.scene,
      status: 'success',
      url: fileUrl,
      creditsUsed: renderResponse.credits_used,
    };
  } catch (error) {
    console.error('Mockup render error:', error);
    
    return {
      mockupId: '',
      assetId: options.assetId,
      scene: options.scene,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      creditsUsed: 0,
    };
  }
}

export async function renderMockupBatch(
  assetIds: string[],
  scenes: string[],
  userId: string
): Promise<MockupGenerationResult[]> {
  const supabase = createServerSupabaseClient();
  const results: MockupGenerationResult[] = [];

  // Get scene templates
  const { data: templates } = await supabase
    .from('mockup_scene_templates')
    .select('*')
    .in('scene_key', scenes)
    .eq('is_active', true);

  const templateMap = new Map(templates?.map((t) => [t.scene_key, t]) || []);

  // Get assets
  const { data: assets } = await supabase
    .from('assets')
    .select('id, file_url, quote_id')
    .in('id', assetIds);

  if (!assets) {
    return [];
  }

  // Process each asset-scene combination
  for (const asset of assets) {
    for (const scene of scenes) {
      const template = templateMap.get(scene);
      if (!template) {
        results.push({
          mockupId: '',
          assetId: asset.id,
          scene,
          status: 'failed',
          error: `Scene template not found: ${scene}`,
          creditsUsed: 0,
        });
        continue;
      }

      const result = await renderMockup({
        assetId: asset.id,
        assetUrl: asset.file_url,
        scene,
        sceneConfig: {
          dm_template_id: template.dm_template_id,
          smart_object: template.config.smart_object || 'artwork',
          default_size: template.config.default_size || { width: 800, height: 1000 },
        },
        userId,
        quoteId: asset.quote_id,
      });

      results.push(result);
    }
  }

  return results;
}
```

- **Step Dependencies**: Step 9.1
- **User Instructions**: Add DYNAMIC_MOCKUPS_API_KEY to .env.local

---

## Step 9.3: Create Mockup Generation Trigger Task

- **Task**: Implement the Trigger.dev task for background mockup generation.

- **Files**:

### `trigger/mockup-generator.ts`
```typescript
import { task, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import { renderMockupBatch } from '@/lib/integrations/dynamic-mockups/render-service';

interface MockupGeneratorPayload {
  userId: string;
  assetIds: string[];
  scenes: string[];
  skipApproval?: boolean;
}

export const mockupGeneratorTask = task({
  id: 'mockup-generator',
  
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  
  machine: 'medium-1x',
  maxDuration: 600, // 10 minutes for batch processing
  
  run: async (payload: MockupGeneratorPayload, { ctx }) => {
    logger.info('Starting mockup generation', {
      assetCount: payload.assetIds.length,
      sceneCount: payload.scenes.length,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate mockups
    const results = await renderMockupBatch(
      payload.assetIds,
      payload.scenes,
      payload.userId
    );

    const successful = results.filter((r) => r.status === 'success');
    const failed = results.filter((r) => r.status === 'failed');

    logger.info('Mockup generation complete', {
      successful: successful.length,
      failed: failed.length,
    });

    // Log activity for successful generations
    for (const result of successful) {
      await supabase.rpc('log_activity', {
        p_user_id: payload.userId,
        p_action_type: 'mockup_generated',
        p_details: {
          mockupId: result.mockupId,
          scene: result.scene,
          creditsUsed: result.creditsUsed,
        },
        p_executed: true,
        p_module: 'mockups',
        p_reference_id: result.mockupId,
        p_reference_table: 'mockups',
      });
    }

    // Get operator mode to determine approval routing
    const { data: settings } = await supabase
      .from('user_settings')
      .select('global_mode, module_overrides')
      .eq('user_id', payload.userId)
      .single();

    const effectiveMode = settings?.module_overrides?.mockups || settings?.global_mode || 'supervised';
    const autoApprove = effectiveMode === 'autopilot' || payload.skipApproval;

    // Route successful mockups
    for (const result of successful) {
      if (autoApprove) {
        // Auto-approve
        await supabase
          .from('mockups')
          .update({ status: 'approved' })
          .eq('id', result.mockupId);
      } else {
        // Add to approval queue
        const { data: mockup } = await supabase
          .from('mockups')
          .select('*, assets(quote_id, quotes(collection))')
          .eq('id', result.mockupId)
          .single();

        await supabase.from('approval_items').insert({
          user_id: payload.userId,
          type: 'mockup',
          reference_id: result.mockupId,
          reference_table: 'mockups',
          payload: {
            type: 'mockup',
            mockupUrl: result.url,
            thumbnailUrl: mockup?.thumbnail_url,
            scene: result.scene,
            creditsUsed: result.creditsUsed,
            assetId: mockup?.asset_id,
            quoteId: mockup?.assets?.quote_id,
          },
          collection: mockup?.assets?.quotes?.collection,
          priority: 0,
        });
      }
    }

    // Queue failed items for retry
    for (const result of failed) {
      await supabase.rpc('queue_for_retry', {
        p_user_id: payload.userId,
        p_operation_type: 'mockup_generation',
        p_payload: {
          assetId: result.assetId,
          scene: result.scene,
        },
        p_error: result.error,
        p_reference_id: result.assetId,
        p_reference_table: 'assets',
      });
    }

    return {
      success: true,
      generated: successful.length,
      failed: failed.length,
      totalCreditsUsed: successful.reduce((sum, r) => sum + r.creditsUsed, 0),
    };
  },
});
```

- **Step Dependencies**: Step 9.2
- **User Instructions**: None

---

## Step 9.4: Create Mockup Management API and UI

- **Task**: Build the mockup viewing and management interface with credit tracking.

- **Files**:

### `app/api/mockups/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const querySchema = z.object({
  scene: z.string().optional(),
  status: z.string().optional(),
  assetId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { scene, status, assetId, limit, offset } = querySchema.parse(searchParams);
    
    let query = supabase
      .from('mockups')
      .select(`
        *,
        assets (
          id,
          file_url,
          format,
          quotes (
            id,
            text,
            collection,
            mood
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (scene) {
      query = query.eq('scene', scene);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      mockups: data,
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

### `app/api/mockups/credits/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const { data, error } = await supabase.rpc('get_credit_usage', {
      p_user_id: userId,
    });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data?.[0] || {
      total_used: 0,
      monthly_used: 0,
      annual_budget: 3500,
      monthly_soft_limit: 292,
      remaining_annual: 3500,
      remaining_monthly: 292,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/mockups/generate/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { triggerMockupGeneration } from '@/lib/trigger/client';

const generateSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(20),
  scenes: z.array(z.string()).min(1).max(5),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();
    
    const { assetIds, scenes } = generateSchema.parse(body);
    
    // Verify assets belong to user
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('id')
      .in('id', assetIds)
      .eq('user_id', userId);
    
    if (assetError || !assets || assets.length !== assetIds.length) {
      return NextResponse.json(
        { error: 'One or more assets not found' },
        { status: 404 }
      );
    }
    
    // Check credits
    const creditsNeeded = assetIds.length * scenes.length;
    const { data: creditCheck } = await supabase.rpc('reserve_mockup_credits', {
      p_user_id: userId,
      p_credits: creditsNeeded,
    });
    
    if (!creditCheck?.[0]?.success) {
      return NextResponse.json(
        { error: creditCheck?.[0]?.message || 'Insufficient credits' },
        { status: 400 }
      );
    }
    
    // Trigger generation
    const handle = await triggerMockupGeneration({
      userId,
      assetIds,
      scenes,
    });
    
    return NextResponse.json({
      success: true,
      taskId: handle.id,
      mockupsQueued: creditsNeeded,
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

### `components/mockups/credit-usage-card.tsx`
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { Coins, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import type { CreditUsage } from '@/types/mockups';

export function CreditUsageCard() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['mockup-credits'],
    queryFn: () => api.get<CreditUsage>('/mockups/credits'),
    refetchInterval: 60000,
  });

  if (isLoading || !usage) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-elevated rounded" />
        </CardContent>
      </Card>
    );
  }

  const annualPercent = (usage.total_used / usage.annual_budget) * 100;
  const monthlyPercent = (usage.monthly_used / usage.monthly_soft_limit) * 100;
  const isMonthlyWarning = monthlyPercent >= 80;
  const isAnnualWarning = annualPercent >= 80;

  return (
    <Card>
      <CardHeader
        title="Mockup Credits"
        description="Dynamic Mockups API usage"
        action={
          <Coins className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        }
      />
      <CardContent className="p-6 pt-0 space-y-4">
        {/* Annual budget */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-body-sm">Annual Budget</span>
            <div className="flex items-center gap-2">
              {isAnnualWarning && (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <span className="text-body-sm font-mono">
                {usage.remaining_annual.toLocaleString()} remaining
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                annualPercent >= 90 ? 'bg-error' :
                annualPercent >= 75 ? 'bg-warning' : 'bg-sage'
              )}
              style={{ width: `${Math.min(annualPercent, 100)}%` }}
            />
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            {usage.total_used.toLocaleString()} / {usage.annual_budget.toLocaleString()} used this year
          </p>
        </div>

        {/* Monthly usage */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-body-sm">Monthly Pace</span>
            <Badge variant={isMonthlyWarning ? 'warning' : 'secondary'} size="sm">
              {isMonthlyWarning ? 'Above target' : 'On track'}
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                monthlyPercent >= 100 ? 'bg-warning' : 'bg-teal'
              )}
              style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
            />
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
            {usage.monthly_used} / {usage.monthly_soft_limit} soft limit
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- **Step Dependencies**: Step 9.3
- **User Instructions**: None

---

# Phase 10: Shopify Products Integration

## Step 10.1: Create Products Database Schema

- **Task**: Create the database schema for Shopify product management with variant tracking.

- **Files**:

### `supabase/migrations/008_products.sql`
```sql
-- ============================================================================
-- Migration: 008_products
-- Description: Products table for Shopify integration
-- Feature: 10 (Shopify Products)
-- ============================================================================

-- ============================================================================
-- Products Table
-- ============================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Source references
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  
  -- Shopify references
  shopify_product_id TEXT,
  shopify_product_gid TEXT, -- GraphQL ID
  shopify_handle TEXT,
  
  -- Product details
  title TEXT NOT NULL,
  description TEXT,
  product_type TEXT DEFAULT 'Print',
  vendor TEXT DEFAULT 'Haven & Hold',
  tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Classification
  collection TEXT CHECK (collection IN ('grounding', 'wholeness', 'growth')),
  
  -- Status per spec
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Not yet published to Shopify
    'pending',      -- Awaiting approval
    'active',       -- Published and available
    'retired',      -- Underperformer, retired
    'archived'      -- Manually archived
  )),
  
  -- Publishing
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  retire_reason TEXT, -- 'underperformer', 'manual', 'seasonal'
  
  -- Performance tracking
  total_views INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Sync status
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Product Variants Table
-- ============================================================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Shopify references
  shopify_variant_id TEXT,
  shopify_variant_gid TEXT,
  
  -- Variant details
  title TEXT NOT NULL, -- e.g., "8×10 / White Frame"
  sku TEXT,
  
  -- Options (per spec print sizes)
  size TEXT NOT NULL, -- '8x10', '11x14', etc.
  frame_style TEXT, -- 'white', 'black', 'natural', 'unframed'
  
  -- Pricing
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  
  -- Inventory
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  inventory_policy TEXT DEFAULT 'continue', -- 'continue' for POD
  
  -- Digital delivery (Sky Pilot)
  is_digital BOOLEAN NOT NULL DEFAULT false,
  digital_file_url TEXT,
  digital_file_key TEXT,
  sky_pilot_asset_id TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Product Images Table
-- ============================================================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Shopify references
  shopify_image_id TEXT,
  
  -- Image details
  position INTEGER NOT NULL DEFAULT 0,
  src TEXT NOT NULL, -- CDN URL
  alt TEXT,
  
  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN ('asset', 'mockup', 'upload')),
  source_id UUID, -- asset_id or mockup_id
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_collection ON products(user_id, collection);
CREATE INDEX idx_products_status ON products(user_id, status);
CREATE INDEX idx_products_shopify ON products(shopify_product_id) WHERE shopify_product_id IS NOT NULL;
CREATE INDEX idx_products_quote ON products(quote_id) WHERE quote_id IS NOT NULL;

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_size ON product_variants(product_id, size);
CREATE INDEX idx_variants_shopify ON product_variants(shopify_variant_id) WHERE shopify_variant_id IS NOT NULL;

CREATE INDEX idx_product_images_product ON product_images(product_id, position);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_all ON products FOR ALL USING (user_id = auth.uid());
CREATE POLICY variants_all ON product_variants FOR ALL USING (user_id = auth.uid());
CREATE POLICY images_all ON product_images FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Default pricing table per spec
-- ============================================================================
CREATE TABLE product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Size
  size TEXT NOT NULL,
  
  -- Pricing
  base_price NUMERIC(10,2) NOT NULL,
  framed_price NUMERIC(10,2),
  digital_price NUMERIC(10,2),
  
  -- Cost (for profit calculation)
  cost NUMERIC(10,2),
  
  -- Active
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- System vs user defined
  is_system BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique per user per size (or global for system)
CREATE UNIQUE INDEX idx_pricing_user_size ON product_pricing(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID), size);

ALTER TABLE product_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY pricing_select ON product_pricing 
  FOR SELECT USING (is_system = true OR user_id = auth.uid());
CREATE POLICY pricing_insert ON product_pricing 
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_system = false);
CREATE POLICY pricing_update ON product_pricing 
  FOR UPDATE USING (user_id = auth.uid() AND is_system = false);

-- Insert default pricing per spec
INSERT INTO product_pricing (size, base_price, framed_price, digital_price, cost, is_system)
VALUES
  ('8x10', 24.99, 49.99, 9.99, 8.00, true),
  ('11x14', 34.99, 69.99, 12.99, 12.00, true),
  ('16x20', 49.99, 99.99, 14.99, 18.00, true),
  ('12x16', 39.99, 79.99, 12.99, 14.00, true),
  ('18x24', 59.99, 119.99, 16.99, 22.00, true),
  ('12x18', 44.99, 89.99, 14.99, 16.00, true),
  ('16x24', 54.99, 109.99, 16.99, 20.00, true),
  ('24x36', 79.99, 159.99, 19.99, 30.00, true),
  ('A4', 29.99, 59.99, 9.99, 10.00, true),
  ('A3', 44.99, 89.99, 12.99, 15.00, true)
ON CONFLICT DO NOTHING;
```

### `types/products.ts`
```typescript
export interface Product {
  id: string;
  user_id: string;
  quote_id: string | null;
  asset_id: string | null;
  shopify_product_id: string | null;
  shopify_product_gid: string | null;
  shopify_handle: string | null;
  title: string;
  description: string | null;
  product_type: string;
  vendor: string;
  tags: string[];
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  status: ProductStatus;
  published_at: string | null;
  retired_at: string | null;
  retire_reason: string | null;
  total_views: number;
  total_orders: number;
  total_revenue: number;
  last_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export type ProductStatus = 'draft' | 'pending' | 'active' | 'retired' | 'archived';

export interface ProductVariant {
  id: string;
  product_id: string;
  user_id: string;
  shopify_variant_id: string | null;
  shopify_variant_gid: string | null;
  title: string;
  sku: string | null;
  size: string;
  frame_style: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  inventory_policy: string;
  is_digital: boolean;
  digital_file_url: string | null;
  digital_file_key: string | null;
  sky_pilot_asset_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  user_id: string;
  shopify_image_id: string | null;
  position: number;
  src: string;
  alt: string | null;
  source_type: 'asset' | 'mockup' | 'upload';
  source_id: string | null;
  created_at: string;
}

export interface ProductPricing {
  id: string;
  user_id: string | null;
  size: string;
  base_price: number;
  framed_price: number | null;
  digital_price: number | null;
  cost: number | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  quoteId?: string;
  assetId?: string;
  title: string;
  description?: string;
  collection?: 'grounding' | 'wholeness' | 'growth';
  tags?: string[];
  variants: Array<{
    size: string;
    frame_style?: string;
    price: number;
    is_digital?: boolean;
  }>;
  imageIds?: string[]; // asset or mockup IDs
  publishImmediately?: boolean;
}
```

- **Step Dependencies**: Step 5.2
- **User Instructions**: Run migration

---

## Step 10.2: Implement Product Creation Service

- **Task**: Build the service for creating products locally and syncing to Shopify.

- **Files**:

### `lib/products/product-service.ts`
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { ShopifyClient } from '@/lib/integrations/shopify/client';
import { uploadFile, getFileBuffer, generateStorageKey, STORAGE_PATHS } from '@/lib/storage/storage-utils';
import type { CreateProductRequest, Product, ProductVariant } from '@/types/products';

interface ProductCreationResult {
  success: boolean;
  product?: Product;
  shopifyProductId?: string;
  error?: string;
}

export async function createProduct(
  userId: string,
  request: CreateProductRequest
): Promise<ProductCreationResult> {
  const supabase = createServerSupabaseClient();
  
  try {
    // Create local product record
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        user_id: userId,
        quote_id: request.quoteId,
        asset_id: request.assetId,
        title: request.title,
        description: request.description,
        collection: request.collection,
        tags: request.tags || [],
        status: 'draft',
      })
      .select()
      .single();

    if (productError || !product) {
      throw new Error(productError?.message || 'Failed to create product');
    }

    // Get pricing defaults
    const { data: pricingDefaults } = await supabase
      .from('product_pricing')
      .select('*')
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .order('is_system', { ascending: true }); // User pricing takes precedence

    const pricingMap = new Map(pricingDefaults?.map((p) => [p.size, p]) || []);

    // Create variants
    const variantsToInsert = request.variants.map((v) => {
      const defaultPricing = pricingMap.get(v.size);
      const price = v.price || (v.is_digital 
        ? defaultPricing?.digital_price 
        : v.frame_style 
          ? defaultPricing?.framed_price 
          : defaultPricing?.base_price
      ) || 24.99;

      return {
        product_id: product.id,
        user_id: userId,
        title: v.frame_style 
          ? `${v.size} / ${v.frame_style} Frame`
          : v.size,
        size: v.size,
        frame_style: v.frame_style,
        price,
        is_digital: v.is_digital || false,
        sku: generateSku(product.id, v.size, v.frame_style),
      };
    });

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(variantsToInsert);

    if (variantError) {
      throw new Error(`Failed to create variants: ${variantError.message}`);
    }

    // Add images
    if (request.imageIds && request.imageIds.length > 0) {
      const imageInserts = await Promise.all(
        request.imageIds.map(async (id, index) => {
          // Try to find as asset first, then mockup
          let imageUrl: string | null = null;
          let sourceType: 'asset' | 'mockup' = 'asset';

          const { data: asset } = await supabase
            .from('assets')
            .select('file_url')
            .eq('id', id)
            .single();

          if (asset) {
            imageUrl = asset.file_url;
          } else {
            const { data: mockup } = await supabase
              .from('mockups')
              .select('file_url')
              .eq('id', id)
              .single();

            if (mockup) {
              imageUrl = mockup.file_url;
              sourceType = 'mockup';
            }
          }

          if (!imageUrl) return null;

          return {
            product_id: product.id,
            user_id: userId,
            position: index,
            src: imageUrl,
            source_type: sourceType,
            source_id: id,
          };
        })
      );

      const validImages = imageInserts.filter(Boolean);
      if (validImages.length > 0) {
        await supabase.from('product_images').insert(validImages);
      }
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'product_created',
      p_details: {
        productId: product.id,
        title: request.title,
        variantCount: request.variants.length,
      },
      p_executed: true,
      p_module: 'products',
      p_reference_id: product.id,
      p_reference_table: 'products',
    });

    // Publish to Shopify if requested
    if (request.publishImmediately) {
      const publishResult = await publishProductToShopify(userId, product.id);
      if (!publishResult.success) {
        // Update product with pending status for approval
        await supabase
          .from('products')
          .update({ status: 'pending' })
          .eq('id', product.id);
      }
    }

    return {
      success: true,
      product: product as Product,
    };
  } catch (error) {
    console.error('Product creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function publishProductToShopify(
  userId: string,
  productId: string
): Promise<ProductCreationResult> {
  const supabase = createServerSupabaseClient();
  const adminClient = getAdminClient();

  try {
    // Get product with variants and images
    const { data: product } = await supabase
      .from('products')
      .select(`
        *,
        variants:product_variants(*),
        images:product_images(*)
      `)
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (!product) {
      throw new Error('Product not found');
    }

    // Get Shopify credentials
    const { data: integration } = await supabase
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .eq('status', 'connected')
      .single();

    if (!integration) {
      throw new Error('Shopify not connected');
    }

    const shopDomain = integration.metadata.shop_domain;
    const accessToken = await adminClient.rpc('get_credential', {
      p_user_id: userId,
      p_provider: 'shopify',
      p_credential_type: 'access_token',
    });

    if (!accessToken.data) {
      throw new Error('Shopify access token not found');
    }

    const shopifyClient = new ShopifyClient({
      shop: shopDomain,
      accessToken: accessToken.data,
    });

    // Create Shopify product
    const shopifyProduct = await shopifyClient.createProduct({
      title: product.title,
      body_html: product.description || '',
      vendor: product.vendor,
      product_type: product.product_type,
      tags: product.tags.join(', '),
      status: 'active',
      variants: product.variants.map((v: ProductVariant) => ({
        title: v.title,
        price: String(v.price),
        sku: v.sku || undefined,
        inventory_quantity: v.is_digital ? 9999 : v.inventory_quantity,
        inventory_policy: v.is_digital ? 'continue' : 'deny',
        option1: v.size,
        option2: v.frame_style || undefined,
      })),
      images: product.images.map((img: { src: string; alt?: string }) => ({
        src: img.src,
        alt: img.alt || product.title,
      })),
      options: [
        { name: 'Size', values: [...new Set(product.variants.map((v: ProductVariant) => v.size))] },
        ...(product.variants.some((v: ProductVariant) => v.frame_style) 
          ? [{ name: 'Frame', values: [...new Set(product.variants.filter((v: ProductVariant) => v.frame_style).map((v: ProductVariant) => v.frame_style))] }]
          : []
        ),
      ],
    });

    // Update local product with Shopify IDs
    await supabase
      .from('products')
      .update({
        shopify_product_id: String(shopifyProduct.product.id),
        shopify_handle: shopifyProduct.product.handle,
        status: 'active',
        published_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', productId);

    // Update variant IDs
    for (const shopifyVariant of shopifyProduct.product.variants) {
      const localVariant = product.variants.find(
        (v: ProductVariant) => v.title === shopifyVariant.title || v.sku === shopifyVariant.sku
      );
      if (localVariant) {
        await supabase
          .from('product_variants')
          .update({ shopify_variant_id: String(shopifyVariant.id) })
          .eq('id', localVariant.id);
      }
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'product_published',
      p_details: {
        productId,
        shopifyProductId: shopifyProduct.product.id,
      },
      p_executed: true,
      p_module: 'products',
      p_reference_id: productId,
      p_reference_table: 'products',
    });

    return {
      success: true,
      shopifyProductId: String(shopifyProduct.product.id),
    };
  } catch (error) {
    console.error('Shopify publish error:', error);
    
    // Update product with error
    await supabase
      .from('products')
      .update({
        sync_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', productId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function generateSku(productId: string, size: string, frameStyle?: string | null): string {
  const prefix = 'HH';
  const productPart = productId.slice(0, 8).toUpperCase();
  const sizePart = size.replace(/[^a-zA-Z0-9]/g, '');
  const framePart = frameStyle ? frameStyle.slice(0, 3).toUpperCase() : 'UNF';
  return `${prefix}-${productPart}-${sizePart}-${framePart}`;
}
```

- **Step Dependencies**: Step 10.1
- **User Instructions**: None

---

## Step 10.3: Create Products API Endpoints

- **Task**: Build the API routes for product CRUD operations and Shopify sync.

- **Files**:

### `app/api/products/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { createProduct } from '@/lib/products/product-service';

const querySchema = z.object({
  status: z.string().optional(),
  collection: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  quoteId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']).optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(z.object({
    size: z.string(),
    frame_style: z.string().optional(),
    price: z.number().positive(),
    is_digital: z.boolean().optional(),
  })).min(1),
  imageIds: z.array(z.string().uuid()).optional(),
  publishImmediately: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, collection, search, limit, offset } = querySchema.parse(searchParams);
    
    let query = supabase
      .from('products')
      .select(`
        *,
        variants:product_variants(*),
        images:product_images(*)
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
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      products: data,
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
    const result = await createProduct(userId, data);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      product: result.product,
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

### `app/api/products/[id]/publish/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth/session';
import { publishProductToShopify } from '@/lib/products/product-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const result = await publishProductToShopify(userId, params.id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      shopifyProductId: result.shopifyProductId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/products/[id]/retire/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

const retireSchema = z.object({
  reason: z.enum(['underperformer', 'manual', 'seasonal']).default('manual'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json().catch(() => ({}));
    
    const { reason } = retireSchema.parse(body);
    
    // Update local product
    const { data: product, error } = await supabase
      .from('products')
      .update({
        status: 'retired',
        retired_at: new Date().toISOString(),
        retire_reason: reason,
      })
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // TODO: Update Shopify product status to archived
    
    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'product_retired',
      p_details: { productId: params.id, reason },
      p_executed: true,
      p_module: 'products',
      p_reference_id: params.id,
      p_reference_table: 'products',
    });
    
    return NextResponse.json({
      success: true,
      product,
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

- **Step Dependencies**: Step 10.2
- **User Instructions**: None

---

## Step 10.4: Create Products Management UI

- **Task**: Build the products list and creation interface.

- **Files**:

### `app/(dashboard)/dashboard/products/page.tsx`
```typescript
import { PageContainer } from '@/components/layout/page-container';
import { ProductsList } from '@/components/products/products-list';
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Products | Haven Hub',
};

export default function ProductsPage() {
  return (
    <PageContainer
      title="Products"
      description="Manage your Shopify products"
      actions={
        <Link href="/dashboard/products/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Create Product
          </Button>
        </Link>
      }
    >
      <ProductsList />
    </PageContainer>
  );
}
```

### `components/products/products-list.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  ExternalLink,
  MoreVertical,
  Archive,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button, Card, Badge, Select } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/products';

interface ProductsResponse {
  products: Product[];
  total: number;
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
];

const collectionOptions = [
  { value: '', label: 'All Collections' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'wholeness', label: 'Wholeness' },
  { value: 'growth', label: 'Growth' },
];

export function ProductsList() {
  const [status, setStatus] = useState('');
  const [collection, setCollection] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', status, collection],
    queryFn: () => api.get<ProductsResponse>('/products', { status, collection }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  const products = data?.products || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select
          options={statusOptions}
          value={status}
          onChange={(v) => setStatus(v as string)}
          className="w-32"
        />
        <Select
          options={collectionOptions}
          value={collection}
          onChange={(v) => setCollection(v as string)}
          className="w-36"
        />
      </div>

      {/* Products grid */}
      {products.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3" />
          <h3 className="text-h3 mb-1">No products yet</h3>
          <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
            Create products from your approved assets
          </p>
          <Link href="/dashboard/products/new">
            <Button>Create Your First Product</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images?.[0];
  const variantCount = product.variants?.length || 0;
  const priceRange = product.variants?.length
    ? {
        min: Math.min(...product.variants.map((v) => v.price)),
        max: Math.max(...product.variants.map((v) => v.price)),
      }
    : null;

  const statusColors: Record<string, string> = {
    draft: 'bg-elevated text-[var(--color-text-secondary)]',
    pending: 'bg-warning/10 text-warning',
    active: 'bg-success/10 text-success',
    retired: 'bg-error/10 text-error',
    archived: 'bg-elevated text-[var(--color-text-tertiary)]',
  };

  return (
    <Card className="overflow-hidden hover:shadow-elevation-2 transition-shadow">
      {/* Image */}
      <div className="relative aspect-square bg-elevated">
        {mainImage ? (
          <Image
            src={mainImage.src}
            alt={product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-12 w-12 text-[var(--color-text-tertiary)]" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className={statusColors[product.status]}>
            {product.status}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-body font-medium line-clamp-1">{product.title}</h3>
        
        <div className="flex items-center gap-2 mt-1">
          {product.collection && (
            <Badge variant={product.collection as 'grounding' | 'wholeness' | 'growth'} size="sm">
              {product.collection}
            </Badge>
          )}
          <span className="text-caption text-[var(--color-text-tertiary)]">
            {variantCount} variant{variantCount !== 1 ? 's' : ''}
          </span>
        </div>

        {priceRange && (
          <p className="text-body-sm font-medium mt-2">
            {priceRange.min === priceRange.max
              ? formatCurrency(priceRange.min)
              : `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`}
          </p>
        )}

        {/* Stats */}
        {product.status === 'active' && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-caption text-[var(--color-text-tertiary)]">
            <span>{product.total_views} views</span>
            <span>{product.total_orders} orders</span>
            <span>{formatCurrency(product.total_revenue)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Link href={`/dashboard/products/${product.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          {product.shopify_handle && (
            <a
              href={`https://${product.shopify_handle}.myshopify.com/products/${product.shopify_handle}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon-sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
```

- **Step Dependencies**: Step 10.3
- **User Instructions**: None

---

**Part 7 Summary**

This part covers:

**Phase 9 (Dynamic Mockups Integration):**
- Complete mockups database schema with credit tracking
- Scene templates table with system defaults
- Credit usage tracking and reservation functions
- Dynamic Mockups API client with error handling
- Render service for individual and batch mockup generation
- Trigger.dev task for background mockup processing
- Mockups API endpoints for listing, credits, and generation
- Credit usage card component with visual indicators

**Phase 10 (Shopify Products):**
- Products database schema with variants and images
- Product pricing table with system defaults
- Product creation service with Shopify sync
- Products API endpoints (CRUD, publish, retire)
- Products list page with filtering
- Product card component with stats

---

**Remaining phases to cover:**
- **Part 8:** Phase 11-13 (Pinterest Core, Analytics, Ads)
- **Part 9:** Phase 14-16 (Lead Capture, Quiz, Abandonment)
- **Part 10:** Phase 17-19 (Customer Journey, Win-Back, Loyalty)
- **Part 11:** Phase 20-23 (Attribution, Campaigns, Intelligence, Daily Digest)
