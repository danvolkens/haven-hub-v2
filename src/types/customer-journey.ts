export interface Customer {
  id: string;
  user_id: string;
  shopify_customer_id: string | null;
  lead_id: string | null;
  klaviyo_profile_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  stage: CustomerStage;
  became_lead_at: string | null;
  became_customer_at: string | null;
  became_repeat_at: string | null;
  became_vip_at: string | null;
  became_at_risk_at: string | null;
  became_churned_at: string | null;
  total_orders: number;
  lifetime_value: number;
  average_order_value: number | null;
  primary_collection: 'grounding' | 'wholeness' | 'growth' | null;
  collection_scores: CollectionScores;
  last_email_open_at: string | null;
  last_email_click_at: string | null;
  last_site_visit_at: string | null;
  last_purchase_at: string | null;
  email_subscribed: boolean;
  sms_subscribed: boolean;
  created_at: string;
  updated_at: string;
}

export type CustomerStage =
  | 'visitor'
  | 'lead'
  | 'prospect'
  | 'customer'
  | 'repeat'
  | 'vip'
  | 'at_risk'
  | 'churned';

export interface CollectionScores {
  grounding: number;
  wholeness: number;
  growth: number;
}

export interface Touchpoint {
  id: string;
  user_id: string;
  customer_id: string;
  type: TouchpointType;
  channel: TouchpointChannel;
  reference_id: string | null;
  reference_type: string | null;
  metadata: Record<string, unknown>;
  value: number | null;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  occurred_at: string;
  created_at: string;
}

export type TouchpointType =
  | 'page_view'
  | 'email_open'
  | 'email_click'
  | 'pin_save'
  | 'pin_click'
  | 'ad_click'
  | 'quiz_start'
  | 'quiz_complete'
  | 'lead_capture'
  | 'cart_add'
  | 'checkout_start'
  | 'checkout_abandon'
  | 'purchase'
  | 'review'
  | 'support_ticket';

export type TouchpointChannel =
  | 'organic'
  | 'pinterest'
  | 'email'
  | 'ads'
  | 'direct'
  | 'referral'
  | 'social';

export interface StageTransition {
  id: string;
  user_id: string;
  customer_id: string;
  from_stage: CustomerStage;
  to_stage: CustomerStage;
  trigger_type: string;
  trigger_reference_id: string | null;
  transitioned_at: string;
}

export interface CustomerSegment {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  criteria: SegmentCriteria;
  klaviyo_segment_id: string | null;
  sync_enabled: boolean;
  last_synced_at: string | null;
  customer_count: number;
  is_dynamic: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SegmentCriteria {
  stages?: CustomerStage[];
  collections?: string[];
  min_ltv?: number;
  max_ltv?: number;
  min_orders?: number;
  max_orders?: number;
  min_days_since_purchase?: number;
  max_days_since_purchase?: number;
  email_subscribed?: boolean;
}

export interface SegmentMembership {
  id: string;
  segment_id: string;
  customer_id: string;
  added_at: string;
  removed_at: string | null;
}

export interface JourneyAnalytics {
  stageDistribution: Record<string, number>;
  collectionDistribution: Record<string, number>;
  conversionFunnel: {
    visitors: number;
    leads: number;
    customers: number;
    repeat: number;
  };
  atRiskCount: number;
  avgLifetimeValue: number;
}
