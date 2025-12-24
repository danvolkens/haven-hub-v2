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

    const effectiveMode = (settings?.module_overrides as Record<string, string>)?.mockups || settings?.global_mode || 'supervised';
    const autoApprove = effectiveMode === 'autopilot' || payload.skipApproval;

    // Route successful mockups
    for (const result of successful) {
      if (autoApprove) {
        // Auto-approve
        await (supabase as any)
          .from('mockups')
          .update({ status: 'approved' })
          .eq('id', result.mockupId);
      } else {
        // Add to approval queue
        const { data: mockup } = await (supabase as any)
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
