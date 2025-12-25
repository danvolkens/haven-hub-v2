import { task, logger, tasks } from '@trigger.dev/sdk/v3';
import { getAdminClient } from '@/lib/supabase/admin';
import { renderQuoteImage } from '@/lib/design-engine/canvas-renderer';
import { resizeMasterImage } from '@/lib/design-engine/master-image-resizer';
import { checkImageQuality } from '@/lib/design-engine/quality-checker';
import { getFormatSpec, SOCIAL_FORMATS, PRINT_FORMATS } from '@/lib/design-engine/format-specs';
import { uploadImage, getFileBuffer } from '@/lib/storage/storage-utils';
import { STORAGE_PATHS } from '@/lib/storage/r2-client';
import type { DesignEnginePayload } from '@/lib/trigger/client';
import type { DesignConfig, ColorConfig, QualityScores } from '@/types/quotes';

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
    const { quoteId, userId, outputFormats, generateMockups, mockupScenes } = payload;

    logger.info('Starting design engine pipeline', { quoteId, userId });

    // Step 1: Fetch quote and design rules
    logger.info('Step 1: Fetching quote and design rules');

    const { data: quote, error: quoteError } = await (supabase as any)
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('user_id', userId)
      .single();

    if (quoteError || !quote) {
      throw new Error(`Quote not found: ${quoteError?.message}`);
    }

    // Update quote status
    await (supabase as any)
      .from('quotes')
      .update({ status: 'generating' })
      .eq('id', quoteId);

    // Get applicable design rules
    const { data: designRules } = await (supabase as any).rpc('get_applicable_design_rules', {
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

    // Check if quote has a master image
    const hasMasterImage = Boolean(quote.master_image_url && quote.master_image_key);
    let masterImageBuffer: Buffer | null = null;

    if (hasMasterImage) {
      logger.info('Quote has master image, will resize instead of rendering text');
      try {
        // For local storage URLs, read the file directly
        if (quote.master_image_url.includes('/uploads/')) {
          const fs = await import('fs');
          const path = await import('path');
          const localPath = path.join(process.cwd(), 'public', 'uploads', quote.master_image_key);
          masterImageBuffer = fs.readFileSync(localPath);
        } else {
          // For R2 URLs, fetch the file
          masterImageBuffer = await getFileBuffer(quote.master_image_key);
        }
      } catch (err) {
        logger.error('Failed to fetch master image, falling back to text rendering', { error: err });
      }
    }

    // Step 3: Generate assets for each format
    logger.info('Step 3: Generating assets', { usingMasterImage: Boolean(masterImageBuffer) });

    const generatedAssets: Array<{
      format: string;
      url: string;
      key: string;
      qualityScores: QualityScores;
      flags: string[];
      flagReasons: Record<string, string>;
      passed: boolean;
    }> = [];

    for (const format of formatsToGenerate) {
      if (!format) continue;

      logger.info(`Generating ${format.name}`);

      try {
        let buffer: Buffer;
        let metadata: { textBounds?: any } = {};

        if (masterImageBuffer) {
          // Resize master image to target dimensions
          buffer = await resizeMasterImage(masterImageBuffer, {
            width: format.width,
            height: format.height,
          });
        } else {
          // Render image from text
          const result = await renderQuoteImage({
            width: format.width,
            height: format.height,
            text: quote.text,
            attribution: quote.attribution || undefined,
            config,
          });
          buffer = result.buffer;
          metadata = result.metadata;
        }

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

    const { data: insertedAssets, error: insertError } = await (supabase as any)
      .from('assets')
      .insert(assetRecords)
      .select('id, format, quality_scores, flags');

    if (insertError) {
      logger.error('Failed to insert assets', { error: insertError });
    }

    // Step 5: Check operator mode for auto-approval
    logger.info('Step 5: Checking operator mode for auto-approval');

    const { data: userSettings } = await (supabase as any)
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
      await (supabase as any)
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
        ?.filter((a: any) => assetsToPendingApproval.includes(a.id))
        .map((asset: any) => {
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
        await (supabase as any).from('approval_items').insert(approvalItems);
        logger.info(`Created ${approvalItems.length} approval items`);
      }
    }

    // Step 6: Trigger mockup generation if requested
    let mockupsTriggered = false;
    if (generateMockups && mockupScenes && mockupScenes.length > 0 && insertedAssets && insertedAssets.length > 0) {
      logger.info('Step 6: Triggering mockup generation', {
        assetCount: insertedAssets.length,
        sceneCount: mockupScenes.length,
      });

      // Trigger mockup generator task for approved assets only (or all if auto-approved)
      const assetIdsForMockups = assetsToAutoApprove.length > 0
        ? assetsToAutoApprove
        : insertedAssets.map((a: any) => a.id);

      if (assetIdsForMockups.length > 0) {
        await tasks.trigger('mockup-generator', {
          userId,
          assetIds: assetIdsForMockups,
          scenes: mockupScenes,
          skipApproval: false,
        });
        mockupsTriggered = true;
        logger.info('Mockup generation triggered', {
          assetIds: assetIdsForMockups,
          scenes: mockupScenes,
        });
      }
    }

    // Step 7: Update quote
    logger.info('Step 7: Updating quote');

    await (supabase as any)
      .from('quotes')
      .update({
        status: 'active',
        assets_generated: quote.assets_generated + generatedAssets.length,
        last_generated_at: new Date().toISOString(),
        generation_settings: {
          designRuleId: designRule.id,
          outputFormats: formatsToGenerate.map((f) => f?.id),
          generateMockups,
          mockupScenes: mockupScenes || [],
        },
      })
      .eq('id', quoteId);

    // Log activity
    await (supabase as any).rpc('log_activity', {
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
      mockupsTriggered,
      mockupScenes: mockupsTriggered ? mockupScenes?.length : 0,
    };
  },
});
