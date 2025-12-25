export const TIKTOK_CONFIG = {
  clientKey: process.env.TIKTOK_CLIENT_KEY!,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
  scopes: [
    'user.info.basic',
    'user.info.profile',
    'video.list',
    'video.insights',
  ],
  apiVersion: 'v2',
};

export function getTikTokAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_key: TIKTOK_CONFIG.clientKey,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: TIKTOK_CONFIG.scopes.join(','),
    state,
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export function getTikTokApiUrl(): string {
  return `https://open.tiktokapis.com/${TIKTOK_CONFIG.apiVersion}`;
}
