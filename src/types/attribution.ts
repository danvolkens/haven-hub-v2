export interface AttributionEvent {
  id: string;
  user_id: string;
  event_type: AttributionEventType;
  source_type: AttributionSourceType;
  source_id: string | null;
  quote_id: string | null;
  asset_id: string | null;
  product_id: string | null;
  customer_id: string | null;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  attribution_window: '1d' | '7d' | '28d' | '90d';
  order_id: string | null;
  order_total: number | null;
  occurred_at: string;
  created_at: string;
}

export type AttributionEventType =
  | 'impression'
  | 'click'
  | 'save'
  | 'add_to_cart'
  | 'checkout'
  | 'purchase';

export type AttributionSourceType =
  | 'pin'
  | 'ad'
  | 'email'
  | 'landing_page'
  | 'direct';

export interface ContentPerformance {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;
  period_type: 'day' | 'week' | 'month';
  period_start: string;
  impressions: number;
  clicks: number;
  saves: number;
  add_to_carts: number;
  checkouts: number;
  purchases: number;
  revenue: number;
  ctr: number | null;
  conversion_rate: number | null;
  revenue_per_impression: number | null;
  created_at: string;
  updated_at: string;
}

export type ContentType = 'quote' | 'asset' | 'pin' | 'product' | 'collection';

export interface AttributionModel {
  id: string;
  user_id: string;
  name: string;
  model_type: AttributionModelType;
  window_days: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AttributionModelType =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based';

export interface RevenueAttribution {
  id: string;
  user_id: string;
  order_id: string;
  order_total: number;
  order_date: string;
  customer_id: string | null;
  model_id: string | null;
  content_type: string;
  content_id: string;
  attribution_weight: number;
  attributed_revenue: number;
  touchpoint_type: string;
  touchpoint_id: string | null;
  touchpoint_at: string;
  created_at: string;
}

export interface TopPerformingContent {
  content_id: string;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  ctr: number;
  conversion_rate: number;
}
