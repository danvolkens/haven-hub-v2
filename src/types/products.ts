export interface Product {
  id: string;
  user_id: string;
  quote_id: string | null;
  asset_id: string | null;
  shopify_product_id: string | null;
  shopify_product_gid: string | null;
  shopify_handle: string | null;
  title: string;
  description: string | null;
  product_type: string;
  vendor: string;
  tags: string[];
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  status: ProductStatus;
  published_at: string | null;
  retired_at: string | null;
  retire_reason: string | null;
  total_views: number;
  total_orders: number;
  total_revenue: number;
  last_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export type ProductStatus = 'draft' | 'pending' | 'active' | 'retired' | 'archived';

export interface ProductVariant {
  id: string;
  product_id: string;
  user_id: string;
  shopify_variant_id: string | null;
  shopify_variant_gid: string | null;
  title: string;
  sku: string | null;
  size: string;
  frame_style: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  inventory_policy: string;
  is_digital: boolean;
  digital_file_url: string | null;
  digital_file_key: string | null;
  sky_pilot_asset_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  user_id: string;
  shopify_image_id: string | null;
  position: number;
  src: string;
  alt: string | null;
  source_type: 'asset' | 'mockup' | 'upload';
  source_id: string | null;
  created_at: string;
}

export interface ProductPricing {
  id: string;
  user_id: string | null;
  size: string;
  base_price: number;
  framed_price: number | null;
  digital_price: number | null;
  cost: number | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  quoteId?: string;
  assetId?: string;
  title: string;
  description?: string;
  collection?: 'grounding' | 'wholeness' | 'growth';
  tags?: string[];
  variants: Array<{
    size: string;
    frame_style?: string;
    price: number;
    is_digital?: boolean;
  }>;
  imageIds?: string[]; // asset or mockup IDs
  publishImmediately?: boolean;
}
