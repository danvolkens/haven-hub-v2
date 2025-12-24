export const DM_CONFIG = {
  apiKey: process.env.DYNAMIC_MOCKUPS_API_KEY!,
  baseUrl: 'https://api.dynamicmockups.com/v1',
  creditsPerRender: 1,
  maxBatchSize: 10,
  timeoutMs: 120000, // 2 minutes
};
