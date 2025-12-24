export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: CampaignType;
  start_date: string;
  end_date: string;
  target_collections: string[];
  target_customer_stages: string[];
  theme: string | null;
  hashtags: string[];
  revenue_goal: number | null;
  order_goal: number | null;
  lead_goal: number | null;
  has_offer: boolean;
  offer_type: OfferType | null;
  offer_value: number | null;
  offer_code: string | null;
  featured_quote_ids: string[];
  featured_asset_ids: string[];
  featured_product_ids: string[];
  channels: CampaignChannels;
  status: CampaignStatus;
  revenue: number;
  orders: number;
  leads: number;
  pins_published: number;
  emails_sent: number;
  created_at: string;
  updated_at: string;
}

export type CampaignType = 'seasonal' | 'launch' | 'flash_sale' | 'collection' | 'evergreen';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type OfferType = 'percentage_discount' | 'fixed_discount' | 'free_shipping' | 'bogo' | 'gift_with_purchase';

export interface CampaignChannels {
  pinterest: boolean;
  email: boolean;
  ads: boolean;
}

export interface CampaignTask {
  id: string;
  campaign_id: string;
  user_id: string;
  type: TaskType;
  title: string;
  description: string | null;
  scheduled_at: string;
  config: Record<string, unknown>;
  status: TaskStatus;
  executed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskType =
  | 'publish_pins'
  | 'send_email'
  | 'start_ads'
  | 'pause_ads'
  | 'update_products'
  | 'social_post'
  | 'custom';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface SeasonalTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  typical_start_month: number;
  typical_start_day: number;
  typical_duration_days: number;
  default_theme: string | null;
  default_hashtags: string[];
  suggested_collections: string[];
  headline_templates: string[];
  description_templates: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: CampaignType;
  startDate: string;
  endDate: string;
  targetCollections?: string[];
  targetCustomerStages?: string[];
  theme?: string;
  hashtags?: string[];
  revenueGoal?: number;
  orderGoal?: number;
  leadGoal?: number;
  hasOffer?: boolean;
  offerType?: OfferType;
  offerValue?: number;
  offerCode?: string;
  channels?: Partial<CampaignChannels>;
}
