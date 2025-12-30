export const INSTAGRAM_CONFIG = {
  appId: process.env.INSTAGRAM_APP_ID || process.env.INSTAGRAM_CLIENT_ID || '',
  appSecret: process.env.INSTAGRAM_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || '',
  configId: process.env.INSTAGRAM_CONFIG_ID || '', // Facebook Business Login config
  scopes: [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
  ],
  apiVersion: 'v21.0', // Updated to latest stable version
};

export function getInstagramAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: INSTAGRAM_CONFIG.appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });

  // Use config_id for Facebook Business Login (required for Live apps)
  // If config_id is set, Facebook handles scopes via the config
  if (INSTAGRAM_CONFIG.configId) {
    params.set('config_id', INSTAGRAM_CONFIG.configId);
  } else {
    // Fallback to scope-based auth (works in Development mode)
    params.set('scope', INSTAGRAM_CONFIG.scopes.join(','));
  }

  return `https://www.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/dialog/oauth?${params.toString()}`;
}

export function getInstagramApiUrl(): string {
  return `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}`;
}
