export const PINTEREST_CONFIG = {
  clientId: process.env.PINTEREST_CLIENT_ID!,
  clientSecret: process.env.PINTEREST_CLIENT_SECRET!,
  scopes: [
    'boards:read',
    'boards:write',
    'pins:read',
    'pins:write',
    'user_accounts:read',
    'ads:read',
    'ads:write',
  ],
  apiVersion: 'v5',
};

export function getPinterestAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: PINTEREST_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: PINTEREST_CONFIG.scopes.join(','),
    state,
  });

  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

export function getPinterestApiUrl(): string {
  return `https://api.pinterest.com/${PINTEREST_CONFIG.apiVersion}`;
}
