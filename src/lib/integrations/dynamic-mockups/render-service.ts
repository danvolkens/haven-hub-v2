import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDynamicMockupsClient } from './client';
import { uploadFile, generateStorageKey } from '@/lib/storage/storage-utils';
import { STORAGE_PATHS } from '@/lib/storage/r2-client';
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
  const supabase = await createServerSupabaseClient();
  const client = getDynamicMockupsClient();

  try {
    // Reserve credits
    const { data: creditCheck } = await (supabase as any).rpc('reserve_mockup_credits', {
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
    const { data: mockup, error } = await (supabase as any)
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
    await (supabase as any).from('mockup_credit_usage').insert({
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
  const supabase = await createServerSupabaseClient();
  const results: MockupGenerationResult[] = [];

  // Get scene templates
  const { data: templates } = await (supabase as any)
    .from('mockup_scene_templates')
    .select('*')
    .in('scene_key', scenes)
    .eq('is_active', true);

  const templateMap = new Map(templates?.map((t: any) => [t.scene_key, t]) || []);

  // Get assets
  const { data: assets } = await (supabase as any)
    .from('assets')
    .select('id, file_url, quote_id')
    .in('id', assetIds);

  if (!assets) {
    return [];
  }

  // Process each asset-scene combination
  for (const asset of assets) {
    for (const scene of scenes) {
      const template = templateMap.get(scene) as any;
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
