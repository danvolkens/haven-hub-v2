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
