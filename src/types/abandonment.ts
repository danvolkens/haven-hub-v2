export interface AbandonedCheckout {
  id: string;
  user_id: string;
  shopify_checkout_id: string;
  shopify_checkout_token: string | null;
  email: string;
  customer_id: string | null;
  lead_id: string | null;
  cart_total: number;
  cart_items: CartItem[];
  checkout_url: string | null;
  abandoned_at: string;
  status: AbandonmentStatus;
  sequence_triggered_at: string | null;
  klaviyo_flow_id: string | null;
  recovered_at: string | null;
  recovered_order_id: string | null;
  recovered_order_total: number | null;
  created_at: string;
  updated_at: string;
}

export type AbandonmentStatus = 'abandoned' | 'sequence_triggered' | 'recovered' | 'expired';

export interface CartItem {
  product_id: string;
  variant_id: string;
  title: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export interface AbandonmentSequence {
  id: string;
  user_id: string;
  name: string;
  trigger_delay_hours: number;
  klaviyo_flow_id: string;
  min_cart_value: number | null;
  max_cart_value: number | null;
  target_collections: string[];
  is_active: boolean;
  checkouts_triggered: number;
  checkouts_recovered: number;
  revenue_recovered: number;
  recovery_rate: number;
  created_at: string;
  updated_at: string;
}
