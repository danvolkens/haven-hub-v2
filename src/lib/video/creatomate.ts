/**
 * Creatomate Video Rendering Integration
 * Prompt 4.4: Video generation with template modifications
 *
 * NOTE: This implementation supports mock mode for development.
 * Set CREATOMATE_API_KEY environment variable for production.
 */

import { createClient } from '@/lib/supabase/server';
import { selectFootage } from './stock-footage';
import { selectMusic } from './music-tracks';
import { selectHook } from './hooks';
import type { Collection, VideoContentType, StockFootage, MusicTrack, VideoHook } from '@/types/instagram';

// ============================================================================
// Configuration
// ============================================================================

const CREATOMATE_API_URL = 'https://api.creatomate.com/v1';
const THUMBNAIL_TIMES = [2, 4, 6]; // Seconds into video for thumbnails

// ============================================================================
// Types
// ============================================================================

export interface RenderRequest {
  quoteId: string;
  collection: Collection;
  contentType: VideoContentType;
  templateId?: string;
}

export interface RenderJob {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  quoteId: string;
  templateId: string;
  footageId: string;
  musicId: string;
  hookId: string | null;
  estimatedCompletionAt: Date;
  metadata: RenderMetadata;
}

export interface RenderMetadata {
  quote_id: string;
  footage_id: string;
  music_id: string;
  hook_id: string | null;
  collection: Collection;
  content_type: VideoContentType;
}

export interface RenderResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrls?: string[];
  error?: string;
}

export interface CreatomateModifications {
  'Quote-Text'?: string;
  'Quote-Author'?: string;
  'Background-Video'?: string;
  'Music-Track'?: string;
  'Hook-Text'?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Main Render Function
// ============================================================================

/**
 * Render a video for a quote using Creatomate
 *
 * Flow:
 * 1. Get quote data
 * 2. Select footage, music, and hook based on collection
 * 3. Call Creatomate API with template modifications
 * 4. Return render job for webhook to pick up
 */
export async function renderVideo(request: RenderRequest): Promise<RenderJob> {
  const supabase = await createClient();
  const { quoteId, collection, contentType, templateId } = request;

  // Get quote data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quote, error: quoteError } = await (supabase as any)
    .from('quotes')
    .select('id, text, author, collection')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) {
    throw new Error(`Quote not found: ${quoteId}`);
  }

  // Select assets using the collection
  const effectiveCollection = (quote.collection as Collection) || collection;

  const [footage, music, hook] = await Promise.all([
    selectFootage(effectiveCollection),
    selectMusic(effectiveCollection),
    selectHook(effectiveCollection, contentType),
  ]);

  if (!footage) {
    throw new Error(`No footage available for collection: ${effectiveCollection}`);
  }

  if (!music) {
    throw new Error(`No music available for collection: ${effectiveCollection}`);
  }

  // Get default template if not specified
  const resolvedTemplateId = templateId || await getDefaultTemplateId(supabase, contentType);

  // Build modifications
  const modifications: CreatomateModifications = {
    'Quote-Text': quote.text,
    'Quote-Author': quote.author || '',
    'Background-Video': footage.video_url,
    'Music-Track': music.file_url,
  };

  if (hook) {
    modifications['Hook-Text'] = hook.hook_text;
  }

  // Build metadata for webhook
  const metadata: RenderMetadata = {
    quote_id: quoteId,
    footage_id: footage.id,
    music_id: music.id,
    hook_id: hook?.id || null,
    collection: effectiveCollection,
    content_type: contentType,
  };

  // Call Creatomate API (or mock)
  const renderJobId = await callCreatomateAPI(
    resolvedTemplateId,
    modifications,
    metadata
  );

  // Create render job record
  const renderJob = await createRenderJobRecord(
    supabase,
    renderJobId,
    quoteId,
    resolvedTemplateId,
    footage,
    music,
    hook,
    metadata
  );

  return renderJob;
}

// ============================================================================
// Creatomate API
// ============================================================================

/**
 * Call Creatomate API to start rendering
 */
async function callCreatomateAPI(
  templateId: string,
  modifications: CreatomateModifications,
  metadata: RenderMetadata
): Promise<string> {
  const apiKey = process.env.CREATOMATE_API_KEY;

  // Mock mode for development
  if (!apiKey || process.env.CREATOMATE_MOCK_MODE === 'true') {
    console.log('[Creatomate] Mock mode: Simulating render request');
    console.log('[Creatomate] Template:', templateId);
    console.log('[Creatomate] Modifications:', modifications);
    return `mock_render_${Date.now()}`;
  }

  const response = await fetch(`${CREATOMATE_API_URL}/renders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: templateId,
      modifications,
      render_preset: 'social-media-pack',
      output_format: 'mp4',
      snapshot_time: THUMBNAIL_TIMES,
      metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Creatomate API error: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Check render status
 */
export async function checkRenderStatus(renderId: string): Promise<{
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  url?: string;
  snapshots?: string[];
  error?: string;
}> {
  const apiKey = process.env.CREATOMATE_API_KEY;

  // Mock mode
  if (!apiKey || process.env.CREATOMATE_MOCK_MODE === 'true') {
    console.log('[Creatomate] Mock mode: Returning completed status');
    return {
      status: 'completed',
      url: `https://mock-video.test/video_${renderId}.mp4`,
      snapshots: THUMBNAIL_TIMES.map(t => `https://mock-video.test/thumb_${t}s.jpg`),
    };
  }

  const response = await fetch(`${CREATOMATE_API_URL}/renders/${renderId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Creatomate API error: ${error.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    status: data.status,
    url: data.url,
    snapshots: data.snapshots?.map((s: { url: string }) => s.url),
    error: data.error_message,
  };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Get default template for content type
 */
async function getDefaultTemplateId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contentType: VideoContentType
): Promise<string> {
  const { data: template } = await supabase
    .from('video_templates')
    .select('creatomate_template_id')
    .eq('content_type', contentType)
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (template?.creatomate_template_id) {
    return template.creatomate_template_id;
  }

  // Fallback to any active template
  const { data: anyTemplate } = await supabase
    .from('video_templates')
    .select('creatomate_template_id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (anyTemplate?.creatomate_template_id) {
    return anyTemplate.creatomate_template_id;
  }

  // Use environment variable as last resort
  return process.env.CREATOMATE_DEFAULT_TEMPLATE_ID || 'default-template';
}

/**
 * Create a render job record in the database
 */
async function createRenderJobRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  renderJobId: string,
  quoteId: string,
  templateId: string,
  footage: StockFootage,
  music: MusicTrack,
  hook: VideoHook | null,
  metadata: RenderMetadata
): Promise<RenderJob> {
  // Calculate estimated completion (usually 1-2 minutes)
  const estimatedCompletionAt = new Date(Date.now() + 2 * 60 * 1000);

  // Store job in database for webhook to find
  await supabase
    .from('video_render_jobs')
    .insert({
      id: renderJobId,
      quote_id: quoteId,
      template_id: templateId,
      footage_id: footage.id,
      music_id: music.id,
      hook_id: hook?.id || null,
      status: 'pending',
      metadata,
      estimated_completion_at: estimatedCompletionAt.toISOString(),
    })
    .catch(() => {
      // Table might not exist in development
      console.log('[Creatomate] Note: video_render_jobs table not found, skipping DB insert');
    });

  return {
    id: renderJobId,
    status: 'pending',
    quoteId,
    templateId,
    footageId: footage.id,
    musicId: music.id,
    hookId: hook?.id || null,
    estimatedCompletionAt,
    metadata,
  };
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

export interface CreatomateWebhookPayload {
  id: string;
  status: 'succeeded' | 'failed';
  url?: string;
  snapshots?: Array<{ time: number; url: string }>;
  error_message?: string;
  metadata?: RenderMetadata;
}

/**
 * Process webhook payload from Creatomate
 */
export async function processWebhookPayload(
  payload: CreatomateWebhookPayload
): Promise<RenderResult> {
  const supabase = await createClient();

  if (payload.status === 'failed') {
    // Update render job status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('video_render_jobs')
      .update({
        status: 'failed',
        error_message: payload.error_message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .catch(() => {});

    return {
      success: false,
      error: payload.error_message || 'Render failed',
    };
  }

  const metadata = payload.metadata;
  if (!metadata) {
    return {
      success: false,
      error: 'Missing metadata in webhook payload',
    };
  }

  // Store video in asset library
  const videoAsset = await storeVideoAsset(
    supabase,
    payload.url!,
    metadata.quote_id,
    metadata
  );

  // Store thumbnails
  const thumbnailUrls: string[] = [];
  if (payload.snapshots) {
    for (const snapshot of payload.snapshots) {
      const thumbnailUrl = await storeThumbnail(
        supabase,
        snapshot.url,
        videoAsset?.id,
        snapshot.time
      );
      if (thumbnailUrl) {
        thumbnailUrls.push(thumbnailUrl);
      }
    }
  }

  // Update render job status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('video_render_jobs')
    .update({
      status: 'completed',
      video_asset_id: videoAsset?.id,
      completed_at: new Date().toISOString(),
    })
    .eq('id', payload.id)
    .catch(() => {});

  // Update usage tracking for assets
  await updateUsageTracking(supabase, metadata);

  // Log activity
  await logRenderActivity(supabase, metadata, videoAsset?.id);

  return {
    success: true,
    videoUrl: payload.url,
    thumbnailUrls,
  };
}

// ============================================================================
// Asset Storage
// ============================================================================

/**
 * Store video in the asset library
 */
async function storeVideoAsset(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  videoUrl: string,
  quoteId: string,
  metadata: RenderMetadata
): Promise<{ id: string; url: string } | null> {
  // In production, this would:
  // 1. Download the video from Creatomate URL
  // 2. Upload to R2/storage
  // 3. Create asset record

  // For now, create asset record with external URL
  const { data: asset, error } = await supabase
    .from('assets')
    .insert({
      type: 'video',
      url: videoUrl,
      quote_id: quoteId,
      metadata: {
        source: 'creatomate',
        ...metadata,
      },
      status: 'approved',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to store video asset:', error);
    return null;
  }

  return asset;
}

/**
 * Store thumbnail in the database
 */
async function storeThumbnail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  thumbnailUrl: string,
  videoAssetId: string | undefined,
  timestampSeconds: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('video_thumbnails')
    .insert({
      video_asset_id: videoAssetId,
      thumbnail_url: thumbnailUrl,
      timestamp_seconds: timestampSeconds,
      is_selected: timestampSeconds === 4, // Default to middle thumbnail
    })
    .select('thumbnail_url')
    .single();

  if (error) {
    console.error('Failed to store thumbnail:', error);
    return null;
  }

  return data?.thumbnail_url;
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Update usage tracking for all assets used in render
 */
async function updateUsageTracking(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  metadata: RenderMetadata
): Promise<void> {
  // Update footage usage
  await supabase.rpc('increment_footage_usage', { footage_id: metadata.footage_id }).catch(() => {});

  // Update music usage
  await supabase.rpc('increment_music_usage', { track_id: metadata.music_id }).catch(() => {});

  // Update hook usage
  if (metadata.hook_id) {
    await supabase.rpc('increment_hook_usage', { hook_id: metadata.hook_id }).catch(() => {});
  }
}

/**
 * Log render activity
 */
async function logRenderActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  metadata: RenderMetadata,
  videoAssetId: string | undefined
): Promise<void> {
  await supabase
    .from('user_activity')
    .insert({
      activity_type: 'video_rendered',
      metadata: {
        ...metadata,
        video_asset_id: videoAssetId,
      },
    })
    .catch(() => {});
}

// ============================================================================
// Batch Rendering
// ============================================================================

/**
 * Render multiple videos in batch
 */
export async function renderBatch(
  requests: RenderRequest[]
): Promise<RenderJob[]> {
  const results: RenderJob[] = [];

  for (const request of requests) {
    try {
      const job = await renderVideo(request);
      results.push(job);
    } catch (error) {
      console.error(`Failed to render video for quote ${request.quoteId}:`, error);
    }
  }

  return results;
}

/**
 * Get render queue status
 */
export async function getRenderQueueStatus(): Promise<{
  pending: number;
  rendering: number;
  completed: number;
  failed: number;
}> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobs } = await (supabase as any)
    .from('video_render_jobs')
    .select('status');

  const statusCounts = {
    pending: 0,
    rendering: 0,
    completed: 0,
    failed: 0,
  };

  if (jobs) {
    for (const job of jobs) {
      if (job.status in statusCounts) {
        statusCounts[job.status as keyof typeof statusCounts]++;
      }
    }
  }

  return statusCounts;
}
