// Barrel export for all trigger tasks
// Tasks are auto-discovered from the trigger directory

export { designEngineTask } from './design-engine';
export { dailyDigestTask, dailyAnalysisTask } from './daily-digest';
// Additional tasks will be exported as they're created:
// export { mockupGeneratorTask } from './mockup-generator';
// export { winnerRefreshTask } from './winner-refresh';
// export { webhookProcessorTask } from './webhook-processor';
// export { exportGeneratorTask } from './export-generator';
