export const SHOPIFY_CONFIG = {
  clientId: process.env.SHOPIFY_CLIENT_ID!,
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET!,
  scopes: [
    'read_products',
    'write_products',
    'read_orders',
    'read_customers',
    'write_customers',
    'read_inventory',
    'write_inventory',
    'read_content',
    'write_content',
  ].join(','),
  webhookTopics: [
    'orders/create',
    'orders/updated',
    'checkouts/create',
    'checkouts/update',
    'customers/create',
    'customers/update',
    'products/update',
    'app/uninstalled',
  ],
};

export function getShopifyAuthUrl(shop: string, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: SHOPIFY_CONFIG.clientId,
    scope: SHOPIFY_CONFIG.scopes,
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'per-user',
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export function getShopifyApiUrl(shop: string, version = '2024-01'): string {
  return `https://${shop}/admin/api/${version}`;
}
