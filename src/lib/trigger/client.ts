import { tasks, runs } from '@trigger.dev/sdk/v3';

// Type-safe task trigger functions

export interface DesignEnginePayload {
  quoteId: string;
  userId: string;
  outputFormats: string[];
  generateMockups: boolean;
  mockupScenes?: string[];
}

export interface MockupGeneratorPayload {
  userId: string;
  assetIds: string[];
  scenes: string[];
  skipApproval?: boolean;
}

export interface WinnerRefreshPayload {
  userId: string;
  pinIds?: string[];
}

export interface WebhookProcessorPayload {
  webhookId: string;
  provider: string;
}

export interface DigestEmailPayload {
  userId: string;
  date: string;
}

export interface ExportGeneratorPayload {
  userId: string;
  exportType: string;
  format: 'csv' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
  fields?: string[];
}

export interface AutoMockupQueuePayload {
  userId: string;
  assetIds: string[];
  quoteId?: string;
  source: 'asset_approval' | 'quote_approval' | 'manual';
}

/**
 * Trigger the design engine pipeline
 */
export async function triggerDesignEngine(payload: DesignEnginePayload) {
  return tasks.trigger('design-engine', payload);
}

/**
 * Trigger mockup generation
 */
export async function triggerMockupGeneration(payload: MockupGeneratorPayload) {
  return tasks.trigger('mockup-generator', payload);
}

/**
 * Trigger winner refresh (weekly top performers)
 */
export async function triggerWinnerRefresh(payload: WinnerRefreshPayload) {
  return tasks.trigger('winner-refresh', payload);
}

/**
 * Trigger webhook processing
 */
export async function triggerWebhookProcessor(payload: WebhookProcessorPayload) {
  return tasks.trigger('webhook-processor', payload);
}

/**
 * Trigger digest email generation
 */
export async function triggerDigestEmail(payload: DigestEmailPayload) {
  return tasks.trigger('digest-email', payload);
}

/**
 * Trigger data export generation
 */
export async function triggerExportGenerator(payload: ExportGeneratorPayload) {
  return tasks.trigger('export-generator', payload);
}

/**
 * Get task run status
 */
export async function getTaskRunStatus(runId: string) {
  return runs.retrieve(runId);
}

/**
 * Cancel a task run
 */
export async function cancelTaskRun(runId: string) {
  return runs.cancel(runId);
}

/**
 * Trigger auto-mockup generation queue
 * Called when assets are approved and auto-generation is enabled
 */
export async function triggerAutoMockupQueue(payload: AutoMockupQueuePayload) {
  return tasks.trigger('auto-mockup-queue', payload);
}

// ==========================================
// Scheduled Pin Publishing
// ==========================================

export interface ScheduledPinPayload {
  pinId: string;
}

/**
 * Schedule a pin to be published at a specific time.
 * Uses Trigger.dev's delay feature to run at the exact scheduled time.
 *
 * @param pinId - The ID of the pin to publish
 * @param scheduledFor - The exact date/time when the pin should be published
 * @returns The task handle (can be used to cancel if needed)
 */
export async function schedulePin(pinId: string, scheduledFor: Date) {
  const now = new Date();
  const delay = scheduledFor.getTime() - now.getTime();

  // If scheduled time is in the past or very soon, trigger immediately
  if (delay <= 1000) {
    return tasks.trigger('scheduled-pin-publish', { pinId });
  }

  // Schedule for the future using delay
  return tasks.trigger('scheduled-pin-publish', { pinId }, {
    delay: scheduledFor,
  });
}

/**
 * Schedule multiple pins for publishing at their scheduled times.
 *
 * @param pins - Array of pin IDs and their scheduled times
 * @returns Array of task handles
 */
export async function schedulePinsBatch(
  pins: Array<{ pinId: string; scheduledFor: Date }>
) {
  const results = await Promise.allSettled(
    pins.map(({ pinId, scheduledFor }) => schedulePin(pinId, scheduledFor))
  );

  return results.map((result, index) => ({
    pinId: pins[index].pinId,
    success: result.status === 'fulfilled',
    handle: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}

/**
 * Cancel a scheduled pin publish task.
 *
 * @param runId - The run ID returned when the pin was scheduled
 */
export async function cancelScheduledPin(runId: string) {
  return runs.cancel(runId);
}
