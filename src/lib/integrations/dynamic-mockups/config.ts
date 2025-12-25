export const DM_CONFIG = {
  apiKey: process.env.DYNAMIC_MOCKUPS_API_KEY!,
  baseUrl: 'https://app.dynamicmockups.com/api/v1',
  creditsPerRender: 1,
  maxBatchSize: 10,
  timeoutMs: 120000, // 2 minutes
};
