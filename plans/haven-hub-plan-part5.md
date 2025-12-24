# Haven Hub: Complete Implementation Task Plan
## Part 5: Phases 5-8 (Setup Wizard, Error Management, Design System, Design Engine)

---

# Phase 5: Setup Wizard & Integrations

## Step 5.1: Create Integration Credentials Schema

- **Task**: Create database schema for storing OAuth tokens and API keys securely using Supabase Vault.

- **Files**:

### `supabase/migrations/004_integrations.sql`
```sql
-- ============================================================================
-- Migration: 004_integrations
-- Description: Integration credentials and connection status
-- Feature: 3 (Setup Wizard), Integrations
-- ============================================================================

-- ============================================================================
-- Integrations Table (public metadata, tokens in vault)
-- ============================================================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Integration type
  provider TEXT NOT NULL CHECK (provider IN (
    'shopify', 'pinterest', 'klaviyo', 'dynamic_mockups', 'resend', 'sky_pilot'
  )),
  
  -- Connection status
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'disconnected', 'connecting', 'connected', 'error', 'expired'
  )),
  
  -- Public metadata (no secrets)
  metadata JSONB NOT NULL DEFAULT '{}',
  -- For Shopify: { shop_domain, shop_name }
  -- For Pinterest: { account_name, board_count }
  -- For Klaviyo: { list_count }
  -- For Dynamic Mockups: { credits_remaining }
  
  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Token refresh tracking
  token_expires_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  
  -- Connection timestamps
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_integrations_user ON integrations(user_id);
CREATE INDEX idx_integrations_status ON integrations(user_id, status);
CREATE INDEX idx_integrations_expiring ON integrations(token_expires_at)
  WHERE status = 'connected' AND token_expires_at IS NOT NULL;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY integrations_select ON integrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY integrations_insert ON integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY integrations_update ON integrations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY integrations_delete ON integrations
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Vault functions for secure credential storage
-- ============================================================================

-- Store a credential in vault
CREATE OR REPLACE FUNCTION store_credential(
  p_user_id UUID,
  p_provider TEXT,
  p_credential_type TEXT,
  p_credential_value TEXT
)
RETURNS void AS $$
DECLARE
  v_secret_name TEXT;
BEGIN
  v_secret_name := 'haven_' || p_user_id || '_' || p_provider || '_' || p_credential_type;
  
  -- Delete existing secret if any
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  
  -- Insert new secret
  INSERT INTO vault.secrets (name, secret)
  VALUES (v_secret_name, p_credential_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retrieve a credential from vault
CREATE OR REPLACE FUNCTION get_credential(
  p_user_id UUID,
  p_provider TEXT,
  p_credential_type TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_secret_name TEXT;
  v_secret TEXT;
BEGIN
  v_secret_name := 'haven_' || p_user_id || '_' || p_provider || '_' || p_credential_type;
  
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = v_secret_name;
  
  RETURN v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete credentials for a provider
CREATE OR REPLACE FUNCTION delete_credentials(
  p_user_id UUID,
  p_provider TEXT
)
RETURNS void AS $$
DECLARE
  v_prefix TEXT;
BEGIN
  v_prefix := 'haven_' || p_user_id || '_' || p_provider || '_';
  
  DELETE FROM vault.secrets WHERE name LIKE v_prefix || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Shopify-specific: Webhooks tracking
-- ============================================================================
CREATE TABLE shopify_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shopify_webhook_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopify_webhooks_user ON shopify_webhooks(user_id);

ALTER TABLE shopify_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY shopify_webhooks_all ON shopify_webhooks
  FOR ALL USING (user_id = auth.uid());
```

### `types/integrations.ts`
```typescript
export type IntegrationProvider =
  | 'shopify'
  | 'pinterest'
  | 'klaviyo'
  | 'dynamic_mockups'
  | 'resend'
  | 'sky_pilot';

export type IntegrationStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'expired';

export interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  metadata: IntegrationMetadata;
  last_error: string | null;
  last_error_at: string | null;
  token_expires_at: string | null;
  last_refreshed_at: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationMetadata =
  | ShopifyMetadata
  | PinterestMetadata
  | KlaviyoMetadata
  | DynamicMockupsMetadata
  | ResendMetadata
  | SkyPilotMetadata;

export interface ShopifyMetadata {
  shop_domain: string;
  shop_name: string;
  access_scopes: string[];
}

export interface PinterestMetadata {
  account_name: string;
  account_id: string;
  board_count: number;
}

export interface KlaviyoMetadata {
  list_count: number;
  default_list_id?: string;
}

export interface DynamicMockupsMetadata {
  credits_remaining: number;
  plan: string;
}

export interface ResendMetadata {
  domain_verified: boolean;
  from_email: string;
}

export interface SkyPilotMetadata {
  connected: boolean;
}

export interface IntegrationConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  authType: 'oauth' | 'api_key';
  required: boolean;
  setupOrder: number;
  docsUrl: string;
}

export const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  {
    provider: 'shopify',
    name: 'Shopify',
    description: 'Connect your store for products, orders, and customer data',
    icon: 'shopify',
    authType: 'oauth',
    required: true,
    setupOrder: 1,
    docsUrl: 'https://docs.havenhold.com/integrations/shopify',
  },
  {
    provider: 'pinterest',
    name: 'Pinterest',
    description: 'Publish pins, manage boards, and track analytics',
    icon: 'pinterest',
    authType: 'oauth',
    required: true,
    setupOrder: 2,
    docsUrl: 'https://docs.havenhold.com/integrations/pinterest',
  },
  {
    provider: 'klaviyo',
    name: 'Klaviyo',
    description: 'Email marketing, flows, and customer segments',
    icon: 'klaviyo',
    authType: 'api_key',
    required: true,
    setupOrder: 3,
    docsUrl: 'https://docs.havenhold.com/integrations/klaviyo',
  },
  {
    provider: 'dynamic_mockups',
    name: 'Dynamic Mockups',
    description: 'Generate product mockups automatically',
    icon: 'dynamic_mockups',
    authType: 'api_key',
    required: true,
    setupOrder: 4,
    docsUrl: 'https://docs.havenhold.com/integrations/dynamic-mockups',
  },
  {
    provider: 'resend',
    name: 'Resend',
    description: 'Transactional emails and notifications',
    icon: 'resend',
    authType: 'api_key',
    required: false,
    setupOrder: 5,
    docsUrl: 'https://docs.havenhold.com/integrations/resend',
  },
  {
    provider: 'sky_pilot',
    name: 'Sky Pilot',
    description: 'Digital product delivery for Shopify',
    icon: 'sky_pilot',
    authType: 'api_key',
    required: false,
    setupOrder: 6,
    docsUrl: 'https://docs.havenhold.com/integrations/sky-pilot',
  },
];
```

- **Step Dependencies**: Step 2.1
- **User Instructions**: Enable Vault extension in Supabase Dashboard → Database → Extensions

---

## Step 5.2: Implement OAuth Flow for Shopify

- **Task**: Create the complete Shopify OAuth flow including install, callback, and webhook registration.

- **Files**:

### `lib/integrations/shopify/config.ts`
```typescript
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
```

### `lib/integrations/shopify/client.ts`
```typescript
import { getShopifyApiUrl } from './config';

interface ShopifyClientOptions {
  shop: string;
  accessToken: string;
}

export class ShopifyClient {
  private shop: string;
  private accessToken: string;
  private baseUrl: string;

  constructor({ shop, accessToken }: ShopifyClientOptions) {
    this.shop = shop;
    this.accessToken = accessToken;
    this.baseUrl = getShopifyApiUrl(shop);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.errors || `Shopify API error: ${response.status}`);
    }

    return response.json();
  }

  // Shop info
  async getShop() {
    return this.request<{ shop: ShopifyShop }>('/shop.json');
  }

  // Products
  async getProducts(params?: { limit?: number; since_id?: string }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return this.request<{ products: ShopifyProduct[] }>(`/products.json?${query}`);
  }

  async createProduct(product: Partial<ShopifyProduct>) {
    return this.request<{ product: ShopifyProduct }>('/products.json', {
      method: 'POST',
      body: JSON.stringify({ product }),
    });
  }

  async updateProduct(id: string, product: Partial<ShopifyProduct>) {
    return this.request<{ product: ShopifyProduct }>(`/products/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product }),
    });
  }

  // Collections
  async getCustomCollections() {
    return this.request<{ custom_collections: ShopifyCollection[] }>(
      '/custom_collections.json'
    );
  }

  async getSmartCollections() {
    return this.request<{ smart_collections: ShopifyCollection[] }>(
      '/smart_collections.json'
    );
  }

  // Customers
  async getCustomer(id: string) {
    return this.request<{ customer: ShopifyCustomer }>(`/customers/${id}.json`);
  }

  async searchCustomers(query: string) {
    return this.request<{ customers: ShopifyCustomer[] }>(
      `/customers/search.json?query=${encodeURIComponent(query)}`
    );
  }

  // Orders
  async getOrders(params?: { status?: string; limit?: number }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return this.request<{ orders: ShopifyOrder[] }>(`/orders.json?${query}`);
  }

  // Webhooks
  async getWebhooks() {
    return this.request<{ webhooks: ShopifyWebhook[] }>('/webhooks.json');
  }

  async createWebhook(topic: string, address: string) {
    return this.request<{ webhook: ShopifyWebhook }>('/webhooks.json', {
      method: 'POST',
      body: JSON.stringify({
        webhook: { topic, address, format: 'json' },
      }),
    });
  }

  async deleteWebhook(id: string) {
    return this.request(`/webhooks/${id}.json`, { method: 'DELETE' });
  }
}

// Types
export interface ShopifyShop {
  id: number;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  currency: string;
  timezone: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: 'active' | 'archived' | 'draft';
  tags: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: ShopifyOption[];
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
  inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

export interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  src: string;
  alt: string | null;
}

export interface ShopifyOption {
  id: number;
  product_id: number;
  name: string;
  values: string[];
}

export interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  body_html: string;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  tags: string;
}

export interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
  customer: ShopifyCustomer;
}

export interface ShopifyWebhook {
  id: number;
  address: string;
  topic: string;
  created_at: string;
  updated_at: string;
}
```

### `app/api/integrations/shopify/install/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { getShopifyAuthUrl, SHOPIFY_CONFIG } from '@/lib/integrations/shopify/config';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter required' }, { status: 400 });
    }

    // Validate shop domain format
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
    }

    // Generate and store state for CSRF protection
    const state = nanoid(32);
    const supabase = createServerSupabaseClient();

    // Store state in user's integration record
    await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        provider: 'shopify',
        status: 'connecting',
        metadata: { shop_domain: shop, oauth_state: state },
      });

    // Generate OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/shopify/callback`;
    const authUrl = getShopifyAuthUrl(shop, state, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Shopify install error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=shopify_install_failed`
    );
  }
}
```

### `app/api/integrations/shopify/callback/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getUserId } from '@/lib/auth/session';
import { SHOPIFY_CONFIG } from '@/lib/integrations/shopify/config';
import { ShopifyClient } from '@/lib/integrations/shopify/client';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const searchParams = request.nextUrl.searchParams;
    
    const shop = searchParams.get('shop');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');

    if (!shop || !code || !state) {
      throw new Error('Missing required parameters');
    }

    // Verify HMAC
    const queryParams = new URLSearchParams(searchParams);
    queryParams.delete('hmac');
    queryParams.sort();
    
    const message = queryParams.toString();
    const generatedHmac = crypto
      .createHmac('sha256', SHOPIFY_CONFIG.clientSecret)
      .update(message)
      .digest('hex');

    if (hmac !== generatedHmac) {
      throw new Error('HMAC validation failed');
    }

    // Verify state matches stored state
    const supabase = createServerSupabaseClient();
    const { data: integration } = await supabase
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', 'shopify')
      .single();

    if (!integration || integration.metadata.oauth_state !== state) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CONFIG.clientId,
        client_secret: SHOPIFY_CONFIG.clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const { access_token, scope } = await tokenResponse.json();

    // Get shop info
    const client = new ShopifyClient({ shop, accessToken: access_token });
    const { shop: shopInfo } = await client.getShop();

    // Store access token securely in vault
    const adminClient = getAdminClient();
    await adminClient.rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'shopify',
      p_credential_type: 'access_token',
      p_credential_value: access_token,
    });

    // Update integration record
    await supabase
      .from('integrations')
      .update({
        status: 'connected',
        metadata: {
          shop_domain: shop,
          shop_name: shopInfo.name,
          access_scopes: scope.split(','),
        },
        connected_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq('user_id', userId)
      .eq('provider', 'shopify');

    // Register webhooks
    await registerShopifyWebhooks(userId, shop, access_token);

    // Update setup progress
    await supabase
      .from('user_settings')
      .update({
        setup_progress: supabase.sql`jsonb_set(setup_progress, '{shopify}', '"completed"')`,
      })
      .eq('user_id', userId);

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'shopify', shop },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?success=shopify_connected`
    );
  } catch (error) {
    console.error('Shopify callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=shopify_callback_failed`
    );
  }
}

async function registerShopifyWebhooks(
  userId: string,
  shop: string,
  accessToken: string
) {
  const client = new ShopifyClient({ shop, accessToken });
  const supabase = createServerSupabaseClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  for (const topic of SHOPIFY_CONFIG.webhookTopics) {
    try {
      const address = `${baseUrl}/api/webhooks/shopify?topic=${topic}`;
      const { webhook } = await client.createWebhook(topic, address);

      await supabase.from('shopify_webhooks').insert({
        user_id: userId,
        shopify_webhook_id: String(webhook.id),
        topic,
        address,
      });
    } catch (error) {
      console.error(`Failed to register webhook ${topic}:`, error);
    }
  }
}
```

- **Step Dependencies**: Step 5.1
- **User Instructions**: 
  1. Create Shopify Partner account and app
  2. Add SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET to .env.local
  3. Set allowed redirect URLs in Shopify Partner Dashboard

---

## Step 5.3: Implement Pinterest OAuth Flow

- **Task**: Create the complete Pinterest OAuth flow with board sync.

- **Files**:

### `lib/integrations/pinterest/config.ts`
```typescript
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
```

### `lib/integrations/pinterest/client.ts`
```typescript
import { getPinterestApiUrl } from './config';

interface PinterestClientOptions {
  accessToken: string;
}

export class PinterestClient {
  private accessToken: string;
  private baseUrl: string;

  constructor({ accessToken }: PinterestClientOptions) {
    this.accessToken = accessToken;
    this.baseUrl = getPinterestApiUrl();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Pinterest API error: ${response.status}`);
    }

    return response.json();
  }

  // User account
  async getUserAccount(): Promise<PinterestUser> {
    return this.request('/user_account');
  }

  // Boards
  async getBoards(params?: { page_size?: number; bookmark?: string }): Promise<PinterestPagedResponse<PinterestBoard>> {
    const query = new URLSearchParams(params as Record<string, string>);
    return this.request(`/boards?${query}`);
  }

  async createBoard(board: CreateBoardRequest): Promise<PinterestBoard> {
    return this.request('/boards', {
      method: 'POST',
      body: JSON.stringify(board),
    });
  }

  // Pins
  async createPin(pin: CreatePinRequest): Promise<PinterestPin> {
    return this.request('/pins', {
      method: 'POST',
      body: JSON.stringify(pin),
    });
  }

  async getPin(pinId: string): Promise<PinterestPin> {
    return this.request(`/pins/${pinId}`);
  }

  async deletePin(pinId: string): Promise<void> {
    await this.request(`/pins/${pinId}`, { method: 'DELETE' });
  }

  // Analytics
  async getPinAnalytics(
    pinId: string,
    params: {
      start_date: string;
      end_date: string;
      metric_types: string[];
    }
  ): Promise<PinterestPinAnalytics> {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      metric_types: params.metric_types.join(','),
    });
    return this.request(`/pins/${pinId}/analytics?${query}`);
  }

  async getUserAccountAnalytics(params: {
    start_date: string;
    end_date: string;
    metric_types: string[];
  }): Promise<PinterestAccountAnalytics> {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      metric_types: params.metric_types.join(','),
    });
    return this.request(`/user_account/analytics?${query}`);
  }

  // Ads
  async getAdAccounts(): Promise<PinterestPagedResponse<PinterestAdAccount>> {
    return this.request('/ad_accounts');
  }

  async createAdCampaign(
    adAccountId: string,
    campaign: CreateCampaignRequest
  ): Promise<PinterestCampaign> {
    return this.request(`/ad_accounts/${adAccountId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(campaign),
    });
  }
}

// Types
export interface PinterestUser {
  account_type: string;
  profile_image: string;
  website_url: string;
  username: string;
  business_name: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
  pin_count: number;
  follower_count: number;
}

export interface PinterestPin {
  id: string;
  created_at: string;
  link: string;
  title: string;
  description: string;
  board_id: string;
  media: {
    media_type: 'image' | 'video';
    source: {
      source_type: string;
      url: string;
    };
  };
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export interface CreatePinRequest {
  board_id: string;
  media_source: {
    source_type: 'image_url';
    url: string;
  };
  title?: string;
  description?: string;
  link?: string;
  alt_text?: string;
}

export interface PinterestPinAnalytics {
  all_time: {
    impressions: number;
    saves: number;
    clicks: number;
  };
  daily_metrics: Array<{
    date: string;
    data_status: string;
    metrics: {
      IMPRESSION: number;
      SAVE: number;
      PIN_CLICK: number;
      OUTBOUND_CLICK: number;
    };
  }>;
}

export interface PinterestAccountAnalytics {
  all_time: {
    impressions: number;
    engagements: number;
  };
}

export interface PinterestAdAccount {
  id: string;
  name: string;
  currency: string;
  status: string;
}

export interface PinterestCampaign {
  id: string;
  name: string;
  status: string;
  lifetime_spend_cap: number;
  daily_spend_cap: number;
}

export interface CreateCampaignRequest {
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  lifetime_spend_cap?: number;
  daily_spend_cap?: number;
  objective_type: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSIONS';
}

export interface PinterestPagedResponse<T> {
  items: T[];
  bookmark?: string;
}
```

### `app/api/integrations/pinterest/callback/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getUserId } from '@/lib/auth/session';
import { PINTEREST_CONFIG } from '@/lib/integrations/pinterest/config';
import { PinterestClient } from '@/lib/integrations/pinterest/client';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const searchParams = request.nextUrl.searchParams;
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      throw new Error('Missing required parameters');
    }

    // Verify state
    const supabase = createServerSupabaseClient();
    const { data: integration } = await supabase
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', 'pinterest')
      .single();

    if (!integration || integration.metadata.oauth_state !== state) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/pinterest/callback`;
    
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${PINTEREST_CONFIG.clientId}:${PINTEREST_CONFIG.clientSecret}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json();

    // Get user account info
    const client = new PinterestClient({ accessToken: access_token });
    const user = await client.getUserAccount();
    const { items: boards } = await client.getBoards({ page_size: 100 });

    // Store tokens securely
    const adminClient = getAdminClient();
    await adminClient.rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'access_token',
      p_credential_value: access_token,
    });
    await adminClient.rpc('store_credential', {
      p_user_id: userId,
      p_provider: 'pinterest',
      p_credential_type: 'refresh_token',
      p_credential_value: refresh_token,
    });

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update integration record
    await supabase
      .from('integrations')
      .update({
        status: 'connected',
        metadata: {
          account_name: user.business_name || user.username,
          account_id: user.username,
          board_count: boards.length,
        },
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      })
      .eq('user_id', userId)
      .eq('provider', 'pinterest');

    // Sync boards to local database
    await syncPinterestBoards(userId, boards);

    // Update setup progress
    await supabase
      .from('user_settings')
      .update({
        setup_progress: supabase.sql`jsonb_set(setup_progress, '{pinterest}', '"completed"')`,
      })
      .eq('user_id', userId);

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'integration_connected',
      p_details: { provider: 'pinterest', accountName: user.username },
      p_executed: true,
      p_module: 'settings',
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?success=pinterest_connected`
    );
  } catch (error) {
    console.error('Pinterest callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=pinterest_callback_failed`
    );
  }
}

async function syncPinterestBoards(userId: string, boards: Array<{ id: string; name: string; pin_count: number }>) {
  const supabase = createServerSupabaseClient();

  // Upsert boards
  for (const board of boards) {
    await supabase.from('pinterest_boards').upsert({
      user_id: userId,
      pinterest_board_id: board.id,
      name: board.name,
      pin_count: board.pin_count,
      synced_at: new Date().toISOString(),
    });
  }
}
```

- **Step Dependencies**: Step 5.2
- **User Instructions**: 
  1. Create Pinterest Developer account and app
  2. Add PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET to .env.local
  3. Set OAuth redirect URL in Pinterest Developer Dashboard

---

## Step 5.4: Create Setup Wizard Flow

- **Task**: Build the multi-step setup wizard with progress tracking.

- **Files**:

### `app/(dashboard)/dashboard/setup/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Key,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  Label,
  Badge,
} from '@/components/ui';
import { PageContainer } from '@/components/layout/page-container';
import { api } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { INTEGRATION_CONFIGS, type IntegrationProvider, type Integration } from '@/types/integrations';
import { useToast } from '@/components/providers/toast-provider';

interface SetupProgress {
  shopify: string;
  pinterest: string;
  klaviyo: string;
  dynamic_mockups: string;
  resend: string;
  design_rules: string;
  operator_mode: string;
  import: string;
}

const SETUP_STEPS = [
  { key: 'shopify', label: 'Connect Shopify', type: 'integration' },
  { key: 'pinterest', label: 'Connect Pinterest', type: 'integration' },
  { key: 'klaviyo', label: 'Connect Klaviyo', type: 'integration' },
  { key: 'dynamic_mockups', label: 'Connect Dynamic Mockups', type: 'integration' },
  { key: 'design_rules', label: 'Configure Design Rules', type: 'config' },
  { key: 'operator_mode', label: 'Set Operator Mode', type: 'config' },
] as const;

export default function SetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Fetch setup progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['setup-progress'],
    queryFn: () => api.get<{ setup_progress: SetupProgress }>('/settings/setup-progress'),
  });

  // Fetch integrations
  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get<Integration[]>('/integrations'),
  });

  // Find first incomplete step
  useEffect(() => {
    if (progress) {
      const firstIncomplete = SETUP_STEPS.findIndex(
        (step) => progress.setup_progress[step.key as keyof SetupProgress] !== 'completed'
      );
      if (firstIncomplete !== -1) {
        setCurrentStep(firstIncomplete);
      }
    }
  }, [progress]);

  const currentStepConfig = SETUP_STEPS[currentStep];
  const isComplete = progress?.setup_progress[currentStepConfig?.key as keyof SetupProgress] === 'completed';
  const integration = integrations?.find(
    (i) => i.provider === currentStepConfig?.key
  );

  const completedCount = progress
    ? Object.values(progress.setup_progress).filter((v) => v === 'completed').length
    : 0;
  const totalSteps = SETUP_STEPS.length;
  const progressPercent = (completedCount / totalSteps) * 100;

  const handleSkip = async () => {
    await api.patch(`/settings/setup-progress/${currentStepConfig.key}`, {
      status: 'skipped',
    });
    queryClient.invalidateQueries({ queryKey: ['setup-progress'] });
    
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      router.push('/dashboard');
    }
  };

  const handleComplete = () => {
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      router.push('/dashboard');
    }
  };

  if (progressLoading) {
    return (
      <PageContainer title="Setup" description="Setting up Haven Hub...">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-sage" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Welcome to Haven Hub"
      description="Let's get your marketing operations set up"
    >
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body-sm text-[var(--color-text-secondary)]">
              Setup Progress
            </span>
            <span className="text-body-sm font-medium">
              {completedCount} of {totalSteps} complete
            </span>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-sage transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8">
          {SETUP_STEPS.map((step, index) => {
            const stepStatus = progress?.setup_progress[step.key as keyof SetupProgress];
            const isCompleted = stepStatus === 'completed';
            const isSkipped = stepStatus === 'skipped';
            const isCurrent = index === currentStep;

            return (
              <button
                key={step.key}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'flex flex-col items-center gap-1 transition-colors',
                  isCurrent ? 'text-sage' : 'text-[var(--color-text-tertiary)]'
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors',
                    isCompleted && 'bg-sage border-sage text-white',
                    isSkipped && 'bg-elevated border-[var(--color-border)]',
                    isCurrent && !isCompleted && 'border-sage',
                    !isCurrent && !isCompleted && !isSkipped && 'border-[var(--color-border)]'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-body-sm">{index + 1}</span>
                  )}
                </div>
                <span className="text-caption hidden sm:block">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current step content */}
        <Card className="mb-6">
          <CardHeader
            title={currentStepConfig.label}
            description={getStepDescription(currentStepConfig.key)}
          />
          <CardContent>
            {currentStepConfig.type === 'integration' ? (
              <IntegrationStep
                provider={currentStepConfig.key as IntegrationProvider}
                integration={integration}
                onComplete={handleComplete}
              />
            ) : currentStepConfig.key === 'design_rules' ? (
              <DesignRulesStep onComplete={handleComplete} />
            ) : currentStepConfig.key === 'operator_mode' ? (
              <OperatorModeStep onComplete={handleComplete} />
            ) : null}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip for now
              </Button>
            )}
            {isComplete && currentStep < SETUP_STEPS.length - 1 && (
              <Button onClick={handleComplete} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continue
              </Button>
            )}
            {currentStep === SETUP_STEPS.length - 1 && (
              <Button onClick={() => router.push('/dashboard')}>
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function IntegrationStep({
  provider,
  integration,
  onComplete,
}: {
  provider: IntegrationProvider;
  integration?: Integration;
  onComplete: () => void;
}) {
  const config = INTEGRATION_CONFIGS.find((c) => c.provider === provider)!;
  const isConnected = integration?.status === 'connected';
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleOAuthConnect = () => {
    window.location.href = `/api/integrations/${provider}/install`;
  };

  const handleApiKeyConnect = async () => {
    setIsLoading(true);
    try {
      await api.post(`/integrations/${provider}/connect`, { apiKey });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['setup-progress'] });
      toast(`${config.name} connected successfully`, 'success');
      onComplete();
    } catch (error) {
      toast(`Failed to connect ${config.name}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-md bg-success/10 border border-success/20">
        <CheckCircle className="h-5 w-5 text-success" />
        <div>
          <p className="text-body font-medium">Connected to {config.name}</p>
          {integration?.metadata && (
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              {JSON.stringify(integration.metadata).slice(0, 50)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-body text-[var(--color-text-secondary)]">
        {config.description}
      </p>

      {config.authType === 'oauth' ? (
        <Button onClick={handleOAuthConnect} rightIcon={<ExternalLink className="h-4 w-4" />}>
          Connect {config.name}
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${config.name} API key`}
              leftIcon={<Key className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleApiKeyConnect} isLoading={isLoading}>
              Connect
            </Button>
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm text-sage hover:underline"
            >
              Where do I find this?
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function DesignRulesStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-body text-[var(--color-text-secondary)]">
        Configure default design rules for your quote-to-asset pipeline.
        You can customize these later in Settings.
      </p>
      <Button onClick={onComplete}>Use Default Rules</Button>
    </div>
  );
}

function OperatorModeStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-body text-[var(--color-text-secondary)]">
        Choose how Haven Hub handles automated actions. You can change this anytime.
      </p>
      <div className="space-y-2">
        <Button onClick={onComplete} className="w-full justify-start">
          <div className="text-left">
            <p className="font-medium">Supervised (Recommended for new users)</p>
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              Review all automated actions before they execute
            </p>
          </div>
        </Button>
      </div>
    </div>
  );
}

function getStepDescription(key: string): string {
  const descriptions: Record<string, string> = {
    shopify: 'Connect your Shopify store to sync products, orders, and customers',
    pinterest: 'Connect Pinterest to publish pins and track performance',
    klaviyo: 'Connect Klaviyo for email marketing automation',
    dynamic_mockups: 'Connect Dynamic Mockups to generate product images',
    design_rules: 'Set default styles, colors, and layouts for generated assets',
    operator_mode: 'Choose how much automation you want',
  };
  return descriptions[key] || '';
}
```

- **Step Dependencies**: Step 5.3
- **User Instructions**: None

---

# Phase 6: Error Management & Exports

## Step 6.1: Create Retry Queue Schema

- **Task**: Create database schema for the error retry queue with exponential backoff.

- **Files**:

### `supabase/migrations/005_retry_queue.sql`
```sql
-- ============================================================================
-- Migration: 005_retry_queue
-- Description: Retry queue for failed operations with exponential backoff
-- Feature: 4 (Error Management)
-- ============================================================================

CREATE TABLE retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Operation details
  operation_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'resolved', 'failed')),
  
  -- Retry tracking
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Worker claiming (for concurrent safety)
  worker_id TEXT,
  claimed_at TIMESTAMPTZ,
  
  -- Reference to original entity
  reference_id UUID,
  reference_table TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary query: pending items ready for retry
CREATE INDEX idx_retry_queue_pending 
  ON retry_queue(user_id, status, next_retry_at)
  WHERE status = 'pending';

-- Find by worker
CREATE INDEX idx_retry_queue_worker
  ON retry_queue(worker_id, status)
  WHERE worker_id IS NOT NULL;

-- Find by operation type
CREATE INDEX idx_retry_queue_operation
  ON retry_queue(user_id, operation_type, status);

-- Find by reference
CREATE INDEX idx_retry_queue_reference
  ON retry_queue(reference_id, reference_table)
  WHERE reference_id IS NOT NULL;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY retry_queue_select ON retry_queue
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY retry_queue_insert ON retry_queue
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY retry_queue_update ON retry_queue
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================
CREATE TRIGGER retry_queue_updated_at
  BEFORE UPDATE ON retry_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Claim items for processing (concurrent-safe)
-- ============================================================================
CREATE OR REPLACE FUNCTION claim_retry_items(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF retry_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE retry_queue
  SET 
    status = 'processing',
    worker_id = p_worker_id,
    claimed_at = NOW(),
    attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM retry_queue
    WHERE status = 'pending'
      AND next_retry_at <= NOW()
    ORDER BY next_retry_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Queue an operation for retry
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_for_retry(
  p_user_id UUID,
  p_operation_type TEXT,
  p_payload JSONB,
  p_error TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_table TEXT DEFAULT NULL,
  p_max_attempts INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO retry_queue (
    user_id,
    operation_type,
    payload,
    last_error,
    reference_id,
    reference_table,
    max_attempts
  ) VALUES (
    p_user_id,
    p_operation_type,
    p_payload,
    p_error,
    p_reference_id,
    p_reference_table,
    p_max_attempts
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Scheduled Exports Table
-- ============================================================================
CREATE TABLE scheduled_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Export configuration
  export_type TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'json')),
  field_selection TEXT[],
  date_range_type TEXT CHECK (date_range_type IN ('last_week', 'last_month', 'all_time')),
  
  -- Schedule
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Delivery
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'download')),
  delivery_email TEXT,
  
  -- Tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_exports_next_run 
  ON scheduled_exports(next_run_at)
  WHERE enabled = true;

ALTER TABLE scheduled_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_exports_all ON scheduled_exports
  FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER scheduled_exports_updated_at
  BEFORE UPDATE ON scheduled_exports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- **Step Dependencies**: Step 2.1
- **User Instructions**: Run migration

---

## Step 6.2: Create Error Management API and UI

- **Task**: Build the error management dashboard with retry controls.

- **Files**:

### `app/api/errors/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const { data, error, count } = await supabase
      .from('retry_queue')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get counts by status
    const { data: statusCounts } = await supabase
      .from('retry_queue')
      .select('status')
      .eq('user_id', userId);
    
    const counts = {
      pending: 0,
      processing: 0,
      resolved: 0,
      failed: 0,
    };
    
    statusCounts?.forEach((item) => {
      counts[item.status as keyof typeof counts]++;
    });
    
    return NextResponse.json({
      items: data,
      total: count,
      counts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `app/api/errors/[id]/retry/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const userId = await getUserId();
    
    // Reset item for immediate retry
    const { data, error } = await supabase
      .from('retry_queue')
      .update({
        status: 'pending',
        next_retry_at: new Date().toISOString(),
        worker_id: null,
        claimed_at: null,
      })
      .eq('id', params.id)
      .eq('user_id', userId)
      .in('status', ['failed', 'pending'])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
```

### `components/errors/error-queue-list.tsx`
```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { api } from '@/lib/fetcher';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useToast } from '@/components/providers/toast-provider';

interface RetryItem {
  id: string;
  operation_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_retry_at: string;
  created_at: string;
}

interface ErrorQueueResponse {
  items: RetryItem[];
  total: number;
  counts: {
    pending: number;
    processing: number;
    resolved: number;
    failed: number;
  };
}

export function ErrorQueueList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['error-queue'],
    queryFn: () => api.get<ErrorQueueResponse>('/errors'),
    refetchInterval: 30000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/errors/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-queue'] });
      toast('Item queued for retry', 'success');
    },
    onError: () => {
      toast('Failed to retry item', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  const { items = [], counts = { pending: 0, processing: 0, resolved: 0, failed: 0 } } = data || {};

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-metric">{counts.pending}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-info animate-spin" />
            <div>
              <p className="text-metric">{counts.processing}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Processing</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            <div>
              <p className="text-metric">{counts.resolved}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Resolved</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-error" />
            <div>
              <p className="text-metric">{counts.failed}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">Failed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <Check className="h-12 w-12 text-success mx-auto mb-3" />
          <h3 className="text-h3 mb-1">No errors</h3>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            All operations are running smoothly
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                    <span className="font-medium">{item.operation_type}</span>
                    <Badge
                      variant={
                        item.status === 'failed' ? 'error' :
                        item.status === 'processing' ? 'info' :
                        'warning'
                      }
                      size="sm"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  
                  {item.last_error && (
                    <p className="mt-1 text-body-sm text-error line-clamp-2">
                      {item.last_error}
                    </p>
                  )}
                  
                  <div className="mt-2 flex items-center gap-4 text-caption text-[var(--color-text-tertiary)]">
                    <span>Attempts: {item.attempts}/{item.max_attempts}</span>
                    <span>Created: {formatRelativeTime(item.created_at)}</span>
                    {item.status === 'pending' && (
                      <span>Next retry: {formatRelativeTime(item.next_retry_at)}</span>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0">
                  {(item.status === 'failed' || item.status === 'pending') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => retryMutation.mutate(item.id)}
                      isLoading={retryMutation.isPending}
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                      Retry Now
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- **Step Dependencies**: Step 6.1
- **User Instructions**: None

---

## Step 6.3: Implement Data Export System

- **Task**: Create streaming export functionality for large datasets with format and field selection.

- **Files**:

### `lib/export/export-config.ts`
```typescript
// Export configuration for each data type

export type ExportType = 
  | 'leads'
  | 'customers'
  | 'orders'
  | 'pins'
  | 'quotes'
  | 'assets'
  | 'analytics';

export type ExportFormat = 'csv' | 'json';

export interface ExportField {
  key: string;
  label: string;
  default: boolean;
  formatter?: (value: any) => string;
}

export interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  fields: ExportField[];
  defaultDateRange: number; // days
  maxRecords: number;
}

export const EXPORT_CONFIGS: Record<ExportType, ExportConfig> = {
  leads: {
    type: 'leads',
    label: 'Leads',
    description: 'Quiz responses and email subscribers',
    defaultDateRange: 30,
    maxRecords: 50000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'email', label: 'Email', default: true },
      { key: 'segment', label: 'Segment', default: true },
      { key: 'source', label: 'Source', default: true },
      { key: 'quiz_completed', label: 'Quiz Completed', default: true },
      { key: 'converted', label: 'Converted to Customer', default: true },
      { key: 'created_at', label: 'Created At', default: true },
      { key: 'utm_source', label: 'UTM Source', default: false },
      { key: 'utm_medium', label: 'UTM Medium', default: false },
      { key: 'utm_campaign', label: 'UTM Campaign', default: false },
    ],
  },
  customers: {
    type: 'customers',
    label: 'Customers',
    description: 'Customer profiles and purchase history',
    defaultDateRange: 90,
    maxRecords: 50000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'email', label: 'Email', default: true },
      { key: 'shopify_customer_id', label: 'Shopify ID', default: true },
      { key: 'segment', label: 'Segment', default: true },
      { key: 'order_count', label: 'Order Count', default: true },
      { key: 'total_spent', label: 'Total Spent', default: true },
      { key: 'first_order_at', label: 'First Order', default: true },
      { key: 'last_order_at', label: 'Last Order', default: true },
      { key: 'journey_stage', label: 'Journey Stage', default: true },
      { key: 'loyalty_tier', label: 'Loyalty Tier', default: false },
      { key: 'lifetime_points', label: 'Lifetime Points', default: false },
    ],
  },
  orders: {
    type: 'orders',
    label: 'Orders',
    description: 'Order history with line items',
    defaultDateRange: 90,
    maxRecords: 100000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'shopify_order_id', label: 'Shopify Order ID', default: true },
      { key: 'customer_email', label: 'Customer Email', default: true },
      { key: 'total', label: 'Total', default: true },
      { key: 'subtotal', label: 'Subtotal', default: true },
      { key: 'discount_total', label: 'Discount', default: true },
      { key: 'item_count', label: 'Item Count', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'created_at', label: 'Created At', default: true },
      { key: 'attribution_channel', label: 'Attribution Channel', default: false },
      { key: 'coupon_code', label: 'Coupon Code', default: false },
    ],
  },
  pins: {
    type: 'pins',
    label: 'Pinterest Pins',
    description: 'Pin performance and scheduling data',
    defaultDateRange: 30,
    maxRecords: 10000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'title', label: 'Title', default: true },
      { key: 'board_name', label: 'Board', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'impressions', label: 'Impressions', default: true },
      { key: 'saves', label: 'Saves', default: true },
      { key: 'clicks', label: 'Clicks', default: true },
      { key: 'engagement_rate', label: 'Engagement Rate', default: true },
      { key: 'published_at', label: 'Published At', default: true },
      { key: 'link', label: 'Link', default: false },
      { key: 'pinterest_pin_id', label: 'Pinterest ID', default: false },
    ],
  },
  quotes: {
    type: 'quotes',
    label: 'Quotes',
    description: 'Quote content and generation data',
    defaultDateRange: 90,
    maxRecords: 10000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'text', label: 'Text', default: true },
      { key: 'attribution', label: 'Attribution', default: true },
      { key: 'collection', label: 'Collection', default: true },
      { key: 'mood', label: 'Mood', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'assets_count', label: 'Assets Generated', default: true },
      { key: 'created_at', label: 'Created At', default: true },
    ],
  },
  assets: {
    type: 'assets',
    label: 'Assets',
    description: 'Generated design assets',
    defaultDateRange: 90,
    maxRecords: 50000,
    fields: [
      { key: 'id', label: 'ID', default: true },
      { key: 'quote_text', label: 'Quote', default: true },
      { key: 'format', label: 'Format', default: true },
      { key: 'status', label: 'Status', default: true },
      { key: 'quality_score', label: 'Quality Score', default: true },
      { key: 'url', label: 'URL', default: true },
      { key: 'created_at', label: 'Created At', default: true },
    ],
  },
  analytics: {
    type: 'analytics',
    label: 'Analytics',
    description: 'Daily performance metrics',
    defaultDateRange: 30,
    maxRecords: 1000,
    fields: [
      { key: 'date', label: 'Date', default: true },
      { key: 'revenue', label: 'Revenue', default: true },
      { key: 'orders', label: 'Orders', default: true },
      { key: 'new_customers', label: 'New Customers', default: true },
      { key: 'new_leads', label: 'New Leads', default: true },
      { key: 'quiz_completions', label: 'Quiz Completions', default: true },
      { key: 'pin_impressions', label: 'Pin Impressions', default: true },
      { key: 'pin_clicks', label: 'Pin Clicks', default: true },
    ],
  },
};
```

### `lib/export/export-service.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { EXPORT_CONFIGS, ExportType, ExportFormat, ExportField } from './export-config';

export interface ExportOptions {
  type: ExportType;
  format: ExportFormat;
  fields: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  recordCount: number;
}

// Get query for each export type
function getExportQuery(
  supabase: any,
  type: ExportType,
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const start = startDate?.toISOString();
  const end = endDate?.toISOString();

  switch (type) {
    case 'leads':
      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) leadsQuery = leadsQuery.gte('created_at', start);
      if (end) leadsQuery = leadsQuery.lte('created_at', end);
      return leadsQuery;

    case 'customers':
      let customersQuery = supabase
        .from('customers')
        .select(`
          *,
          customer_loyalty(tier, points_balance, lifetime_points_earned)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) customersQuery = customersQuery.gte('created_at', start);
      if (end) customersQuery = customersQuery.lte('created_at', end);
      return customersQuery;

    case 'orders':
      let ordersQuery = supabase
        .from('customer_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) ordersQuery = ordersQuery.gte('created_at', start);
      if (end) ordersQuery = ordersQuery.lte('created_at', end);
      return ordersQuery;

    case 'pins':
      let pinsQuery = supabase
        .from('pins')
        .select(`
          *,
          boards(name),
          pin_analytics(impressions, saves, clicks, engagement_rate)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) pinsQuery = pinsQuery.gte('created_at', start);
      if (end) pinsQuery = pinsQuery.lte('created_at', end);
      return pinsQuery;

    case 'quotes':
      let quotesQuery = supabase
        .from('quotes')
        .select(`
          *,
          assets(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) quotesQuery = quotesQuery.gte('created_at', start);
      if (end) quotesQuery = quotesQuery.lte('created_at', end);
      return quotesQuery;

    case 'assets':
      let assetsQuery = supabase
        .from('assets')
        .select(`
          *,
          quotes(text)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (start) assetsQuery = assetsQuery.gte('created_at', start);
      if (end) assetsQuery = assetsQuery.lte('created_at', end);
      return assetsQuery;

    case 'analytics':
      let analyticsQuery = supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (start) analyticsQuery = analyticsQuery.gte('date', start.split('T')[0]);
      if (end) analyticsQuery = analyticsQuery.lte('date', end.split('T')[0]);
      return analyticsQuery;

    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

// Transform row data based on field selection
function transformRow(row: any, type: ExportType, fields: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const field of fields) {
    switch (type) {
      case 'pins':
        if (field === 'board_name') {
          result[field] = row.boards?.name || '';
        } else if (['impressions', 'saves', 'clicks', 'engagement_rate'].includes(field)) {
          result[field] = row.pin_analytics?.[0]?.[field] || 0;
        } else {
          result[field] = row[field];
        }
        break;

      case 'customers':
        if (field === 'loyalty_tier') {
          result[field] = row.customer_loyalty?.tier || 'none';
        } else if (field === 'lifetime_points') {
          result[field] = row.customer_loyalty?.lifetime_points_earned || 0;
        } else {
          result[field] = row[field];
        }
        break;

      case 'assets':
        if (field === 'quote_text') {
          result[field] = row.quotes?.text || '';
        } else {
          result[field] = row[field];
        }
        break;

      case 'quotes':
        if (field === 'assets_count') {
          result[field] = row.assets?.[0]?.count || 0;
        } else {
          result[field] = row[field];
        }
        break;

      default:
        result[field] = row[field];
    }
  }

  return result;
}

// Format value for CSV
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Generate CSV output
function generateCSV(data: Record<string, any>[], fields: string[]): string {
  const config = EXPORT_CONFIGS[data[0]?.type as ExportType];
  const fieldLabels = fields.map(f => {
    const field = config?.fields.find(cf => cf.key === f);
    return field?.label || f;
  });

  const header = fieldLabels.join(',');
  const rows = data.map(row => 
    fields.map(f => formatCSVValue(row[f])).join(',')
  );

  return [header, ...rows].join('\n');
}

// Generate JSON output
function generateJSON(data: Record<string, any>[]): string {
  return JSON.stringify(data, null, 2);
}

// Main export function
export async function generateExport(
  userId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const supabase = createClient();
  const config = EXPORT_CONFIGS[options.type];
  
  if (!config) {
    throw new Error(`Invalid export type: ${options.type}`);
  }

  // Validate fields
  const validFields = config.fields.map(f => f.key);
  const selectedFields = options.fields.filter(f => validFields.includes(f));
  
  if (selectedFields.length === 0) {
    // Use default fields
    selectedFields.push(...config.fields.filter(f => f.default).map(f => f.key));
  }

  // Build and execute query
  const query = getExportQuery(
    supabase,
    options.type,
    userId,
    options.startDate,
    options.endDate
  );

  const limit = Math.min(options.limit || config.maxRecords, config.maxRecords);
  const { data, error } = await query.limit(limit);

  if (error) {
    throw new Error(`Export query failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    // Return empty file
    const emptyData = options.format === 'csv' 
      ? selectedFields.join(',')
      : '[]';
    
    return {
      data: emptyData,
      filename: `${options.type}-export-${Date.now()}.${options.format}`,
      mimeType: options.format === 'csv' ? 'text/csv' : 'application/json',
      recordCount: 0,
    };
  }

  // Transform data
  const transformedData = data.map(row => 
    transformRow(row, options.type, selectedFields)
  );

  // Generate output
  const output = options.format === 'csv'
    ? generateCSV(transformedData, selectedFields)
    : generateJSON(transformedData);

  const timestamp = new Date().toISOString().split('T')[0];
  
  return {
    data: output,
    filename: `${options.type}-export-${timestamp}.${options.format}`,
    mimeType: options.format === 'csv' ? 'text/csv' : 'application/json',
    recordCount: transformedData.length,
  };
}

// Record export in history
export async function recordExport(
  userId: string,
  options: ExportOptions,
  recordCount: number
): Promise<void> {
  const supabase = createClient();
  
  await supabase.from('export_history').insert({
    user_id: userId,
    export_type: options.type,
    format: options.format,
    fields: options.fields,
    start_date: options.startDate?.toISOString(),
    end_date: options.endDate?.toISOString(),
    record_count: recordCount,
    created_at: new Date().toISOString(),
  });
}
```

### `app/api/export/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExport, recordExport, ExportOptions } from '@/lib/export/export-service';
import { EXPORT_CONFIGS, ExportType, ExportFormat } from '@/lib/export/export-config';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as ExportType;
  const format = (searchParams.get('format') || 'csv') as ExportFormat;
  const fields = searchParams.get('fields')?.split(',') || [];
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = searchParams.get('limit');

  // Validate type
  if (!type || !EXPORT_CONFIGS[type]) {
    return NextResponse.json(
      { error: 'Invalid export type' },
      { status: 400 }
    );
  }

  // Validate format
  if (!['csv', 'json'].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Must be csv or json' },
      { status: 400 }
    );
  }

  try {
    const options: ExportOptions = {
      type,
      format,
      fields,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    const result = await generateExport(user.id, options);

    // Record export in history
    await recordExport(user.id, options, result.recordCount);

    // Return file as download
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Record-Count': String(result.recordCount),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

// Get export configuration
export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return all export configs
  return NextResponse.json({
    configs: Object.values(EXPORT_CONFIGS),
  });
}
```

- **Step Dependencies**: Step 6.2
- **User Instructions**: None

---

## Step 6.4: Build Data Export UI

- **Task**: Create the UI for configuring and triggering data exports.

- **Files**:

### `hooks/use-export.ts`
```typescript
'use client';

import { useState } from 'react';
import { EXPORT_CONFIGS, ExportType, ExportFormat } from '@/lib/export/export-config';

interface ExportState {
  isExporting: boolean;
  progress: number;
  error: string | null;
}

export function useExport() {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    error: null,
  });

  const triggerExport = async (options: {
    type: ExportType;
    format: ExportFormat;
    fields: string[];
    startDate?: Date;
    endDate?: Date;
  }) => {
    setState({ isExporting: true, progress: 0, error: null });

    try {
      const params = new URLSearchParams({
        type: options.type,
        format: options.format,
        fields: options.fields.join(','),
      });

      if (options.startDate) {
        params.set('startDate', options.startDate.toISOString());
      }
      if (options.endDate) {
        params.set('endDate', options.endDate.toISOString());
      }

      setState(s => ({ ...s, progress: 30 }));

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      setState(s => ({ ...s, progress: 80 }));

      // Get filename from header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `export-${Date.now()}.${options.format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setState({ isExporting: false, progress: 100, error: null });

      // Get record count from header
      const recordCount = parseInt(response.headers.get('X-Record-Count') || '0', 10);
      return { success: true, recordCount };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setState({ isExporting: false, progress: 0, error: message });
      return { success: false, error: message };
    }
  };

  return {
    ...state,
    triggerExport,
    configs: EXPORT_CONFIGS,
  };
}
```

### `components/export/export-form.tsx`
```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { useExport } from '@/hooks/use-export';
import { EXPORT_CONFIGS, ExportType, ExportFormat } from '@/lib/export/export-config';
import { Download, FileSpreadsheet, FileJson, Calendar, CheckSquare } from 'lucide-react';

export function ExportForm() {
  const { isExporting, progress, error, triggerExport, configs } = useExport();
  
  const [exportType, setExportType] = useState<ExportType>('leads');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const config = EXPORT_CONFIGS[exportType];

  // Initialize selected fields when type changes
  const handleTypeChange = (type: ExportType) => {
    setExportType(type);
    const newConfig = EXPORT_CONFIGS[type];
    setSelectedFields(newConfig.fields.filter(f => f.default).map(f => f.key));
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(config.fields.map(f => f.key));
  };

  const selectDefaultFields = () => {
    setSelectedFields(config.fields.filter(f => f.default).map(f => f.key));
  };

  const handleExport = async () => {
    await triggerExport({
      type: exportType,
      format,
      fields: selectedFields.length > 0 
        ? selectedFields 
        : config.fields.filter(f => f.default).map(f => f.key),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  };

  // Initialize default fields on mount
  useState(() => {
    handleTypeChange('leads');
  });

  return (
    <div className="space-y-6">
      {/* Export Type Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">1. Select Data Type</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.values(EXPORT_CONFIGS).map((cfg) => (
            <button
              key={cfg.type}
              onClick={() => handleTypeChange(cfg.type)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                exportType === cfg.type
                  ? 'border-sage-500 bg-sage-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{cfg.label}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {cfg.description}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Format & Date Range */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">2. Format & Date Range</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Format */}
          <div>
            <Label className="mb-2">Export Format</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  format === 'csv'
                    ? 'border-sage-500 bg-sage-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className="h-5 w-5" />
                CSV
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  format === 'json'
                    ? 'border-sage-500 bg-sage-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileJson className="h-5 w-5" />
                JSON
              </button>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <Label htmlFor="startDate" className="mb-2">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <Label htmlFor="endDate" className="mb-2">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Field Selection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">3. Select Fields</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAllFields}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectDefaultFields}>
              Default Only
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {config.fields.map((field) => (
            <label
              key={field.key}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedFields.includes(field.key)
                  ? 'border-sage-500 bg-sage-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Checkbox
                checked={selectedFields.includes(field.key)}
                onCheckedChange={() => toggleField(field.key)}
              />
              <span className="text-sm">
                {field.label}
                {field.default && (
                  <span className="text-xs text-muted-foreground ml-1">(default)</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Export Button & Progress */}
      <Card className="p-6">
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {isExporting && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Exporting...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
            {' • '}
            Max {config.maxRecords.toLocaleString()} records
          </div>
          
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedFields.length === 0}
            className="min-w-[150px]"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

### `app/(dashboard)/dashboard/settings/data/page.tsx`
```tsx
import { Metadata } from 'next';
import { ExportForm } from '@/components/export/export-form';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = {
  title: 'Data Export | Haven Hub',
  description: 'Export your data',
};

export default function DataExportPage() {
  return (
    <PageContainer
      title="Data Export"
      description="Export your data in CSV or JSON format"
    >
      <ExportForm />
    </PageContainer>
  );
}
```

- **Step Dependencies**: Step 6.3
- **User Instructions**: None

---

**Part 5 Summary**

This part covers:

**Phase 5 (Setup Wizard & Integrations):**
- Integration credentials schema with Vault-based secure storage
- Complete Shopify OAuth flow with webhook registration
- Complete Pinterest OAuth flow with board sync
- Multi-step setup wizard with progress tracking

**Phase 6 (Error Management & Exports):**
- Retry queue schema with exponential backoff
- Concurrent-safe item claiming function
- Error management API endpoints
- Error queue list component with retry controls
- Data export service with streaming support (CSV/JSON)
- Export configuration for all data types
- Data export UI with field selection and date filtering

---

**Part 5 ends here.**

**Remaining phases to be covered in Part 6:**
- Phase 7: Design System Foundation
- Phase 8: Design Engine Pipeline
