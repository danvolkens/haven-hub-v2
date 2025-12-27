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
  handle: string;
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
  compare_at_price: string | null;
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
