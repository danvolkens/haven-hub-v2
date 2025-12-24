export interface WinbackCampaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_stages: string[];
  min_days_inactive: number;
  max_days_inactive: number | null;
  min_lifetime_value: number | null;
  target_collections: string[];
  incentive_type: IncentiveType | null;
  incentive_value: number | null;
  discount_code: string | null;
  klaviyo_flow_id: string;
  send_delay_days: number;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  customers_targeted: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  customers_recovered: number;
  revenue_recovered: number;
  created_at: string;
  updated_at: string;
}

export type IncentiveType =
  | 'percentage_discount'
  | 'fixed_discount'
  | 'free_shipping'
  | 'gift_with_purchase'
  | 'exclusive_product';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface WinbackRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  user_id: string;
  status: RecipientStatus;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  recovered_at: string | null;
  recovery_order_id: string | null;
  recovery_order_value: number | null;
  discount_code_used: string | null;
  created_at: string;
  updated_at: string;
}

export type RecipientStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'clicked'
  | 'recovered'
  | 'unsubscribed'
  | 'expired';

export interface CreateWinbackCampaignRequest {
  name: string;
  description?: string;
  targetStages?: string[];
  minDaysInactive: number;
  maxDaysInactive?: number;
  minLifetimeValue?: number;
  targetCollections?: string[];
  incentiveType?: IncentiveType;
  incentiveValue?: number;
  discountCode?: string;
  klaviyoFlowId: string;
  sendDelayDays?: number;
  startsAt?: string;
  endsAt?: string;
}
