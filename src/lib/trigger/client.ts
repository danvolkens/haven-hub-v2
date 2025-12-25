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
