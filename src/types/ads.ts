export interface PinterestAdAccount {
  id: string;
  user_id: string;
  pinterest_ad_account_id: string;
  name: string;
  currency: string;
  status: string;
  total_spend: number;
  current_week_spend: number;
  current_month_spend: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdCampaign {
  id: string;
  user_id: string;
  ad_account_id: string;
  pinterest_campaign_id: string | null;
  name: string;
  objective: CampaignObjective;
  daily_spend_cap: number | null;
  lifetime_spend_cap: number | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  total_spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  is_seasonal: boolean;
  seasonal_event: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  ad_groups?: AdGroup[];
}

export type CampaignObjective = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSIONS' | 'CATALOG_SALES';
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface AdGroup {
  id: string;
  user_id: string;
  campaign_id: string;
  pinterest_ad_group_id: string | null;
  name: string;
  targeting: AdTargeting;
  bid_strategy: string;
  bid_amount: number | null;
  budget_type: 'DAILY' | 'LIFETIME';
  budget_amount: number | null;
  status: CampaignStatus;
  total_spend: number;
  impressions: number;
  clicks: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  promoted_pins?: PromotedPin[];
}

export interface AdTargeting {
  interests?: string[];
  keywords?: string[];
  demographics?: {
    genders?: string[];
    age_ranges?: string[];
  };
  locations?: string[];
}

export interface PromotedPin {
  id: string;
  user_id: string;
  ad_group_id: string;
  pin_id: string | null;
  pinterest_ad_id: string | null;
  pinterest_pin_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'REJECTED';
  rejection_reason: string | null;
  destination_url: string | null;
  tracking_params: Record<string, string>;
  total_spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  adAccountId: string;
  name: string;
  objective: CampaignObjective;
  dailySpendCap?: number;
  lifetimeSpendCap?: number;
  startDate?: string;
  endDate?: string;
  collection?: 'grounding' | 'wholeness' | 'growth';
  isSeasonal?: boolean;
  seasonalEvent?: string;
}

export interface AdSpendCheck {
  allowed: boolean;
  weekly_remaining: number | null;
  monthly_remaining: number | null;
  message: string;
}
