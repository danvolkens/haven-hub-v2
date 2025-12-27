import { task, logger, tasks } from '@trigger.dev/sdk/v3';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  checkAutoGeneration,
  getSceneKeysFromTemplates,
} from '@/lib/mockups/auto-generation-service';
import type { AutoMockupQueuePayload } from '@/lib/trigger/client';

/**
 * Auto-Mockup Queue Task
 *
 * This task is triggered when assets are approved and checks if auto-generation
 * should occur. If enabled, it queues the mockup-generator task with the
 * appropriate templates and respects Operator Mode settings.
 */
export const autoMockupQueueTask = task({
  id: 'auto-mockup-queue',

  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },

  machine: 'small-1x',
  maxDuration: 300,

  run: async (payload: AutoMockupQueuePayload, { ctx }) => {
    const supabase = getAdminClient();
    const { userId, assetIds, quoteId, source } = payload;

    logger.info('Auto-mockup queue started', {
      userId,
      assetCount: assetIds.length,
      quoteId,
      source,
    });

    // Check if auto-generation should occur
    const result = await checkAutoGeneration({
      userId,
      assetIds,
      quoteId,
      source,
    });

    if (!result.shouldGenerate) {
      logger.info('Auto-generation skipped', { reason: result.reason });
      return {
        success: true,
        skipped: true,
        reason: result.reason,
      };
    }

    logger.info('Auto-generation approved', {
      templateCount: result.templates.length,
      operatorMode: result.operatorMode,
      settings: result.settings,
    });

    // Get scene keys from templates
    const scenes = getSceneKeysFromTemplates(result.templates);

    // Determine skip approval based on Operator Mode
    const skipApproval = result.operatorMode === 'autopilot';

    // Trigger mockup generation
    const handle = await tasks.trigger('mockup-generator', {
      userId,
      assetIds,
      scenes,
      skipApproval,
    });

    logger.info('Mockup generation triggered', {
      taskId: handle.id,
      assetCount: assetIds.length,
      sceneCount: scenes.length,
      skipApproval,
    });

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'auto_mockup_queued',
      p_details: {
        assetIds,
        quoteId,
        source,
        templateCount: result.templates.length,
        templateNames: result.templates.map((t) => t.name),
        operatorMode: result.operatorMode,
        skipApproval,
        taskId: handle.id,
      },
      p_executed: true,
      p_module: 'mockups',
      p_reference_id: quoteId || assetIds[0],
      p_reference_table: quoteId ? 'quotes' : 'assets',
    });

    // If supervised mode, create approval items for the mockups
    if (result.operatorMode === 'supervised') {
      logger.info('Supervised mode - mockups will require approval');
    }

    return {
      success: true,
      skipped: false,
      mockupTaskId: handle.id,
      templatesUsed: result.templates.length,
      assetsProcessed: assetIds.length,
      operatorMode: result.operatorMode,
      estimatedMockups: assetIds.length * scenes.length,
    };
  },
});
