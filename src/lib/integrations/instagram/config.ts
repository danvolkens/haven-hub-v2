export const INSTAGRAM_CONFIG = {
  appId: process.env.INSTAGRAM_APP_ID || process.env.INSTAGRAM_CLIENT_ID || '',
  appSecret: process.env.INSTAGRAM_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '',
  scopes: [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
  ],
  apiVersion: 'v18.0',
};

export function getInstagramAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: INSTAGRAM_CONFIG.appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: INSTAGRAM_CONFIG.scopes.join(','),
    state,
  });

  return `https://www.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/dialog/oauth?${params.toString()}`;
}

export function getInstagramApiUrl(): string {
  return `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}`;
}
