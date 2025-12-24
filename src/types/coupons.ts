export type CouponDiscountType =
  | 'percentage'
  | 'fixed_amount'
  | 'free_shipping'
  | 'buy_x_get_y';

export type CouponStatus = 'draft' | 'active' | 'paused' | 'expired' | 'depleted';

export interface Coupon {
  id: string;
  user_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value?: number;
  buy_quantity?: number;
  get_quantity?: number;
  usage_limit?: number;
  per_customer_limit?: number;
  usage_count: number;
  minimum_purchase?: number;
  minimum_quantity?: number;
  collection_ids?: string[];
  product_ids?: string[];
  exclude_sale_items: boolean;
  first_time_only: boolean;
  starts_at: string;
  expires_at?: string;
  shopify_discount_id?: string;
  shopify_synced_at?: string;
  status: CouponStatus;
  total_discount_amount: number;
  total_orders: number;
  description?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CouponUse {
  id: string;
  coupon_id: string;
  customer_id?: string;
  customer_email: string;
  order_id?: string;
  shopify_order_id?: string;
  discount_amount: number;
  order_total?: number;
  used_at: string;
}

export interface CreateCouponInput {
  code: string;
  discount_type: CouponDiscountType;
  discount_value?: number;
  buy_quantity?: number;
  get_quantity?: number;
  usage_limit?: number;
  per_customer_limit?: number;
  minimum_purchase?: number;
  minimum_quantity?: number;
  collection_ids?: string[];
  product_ids?: string[];
  exclude_sale_items?: boolean;
  first_time_only?: boolean;
  starts_at?: string;
  expires_at?: string;
  description?: string;
  internal_notes?: string;
}
