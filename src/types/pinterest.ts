export interface PinterestBoard {
  id: string;
  user_id: string;
  pinterest_board_id: string;
  name: string;
  description: string | null;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
  pin_count: number;
  follower_count: number;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  is_primary: boolean;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pin {
  id: string;
  user_id: string;
  asset_id: string | null;
  mockup_id: string | null;
  quote_id: string | null;
  pinterest_pin_id: string | null;
  pinterest_board_id: string;
  board_id: string | null;
  title: string;
  description: string | null;
  link: string | null;
  alt_text: string | null;
  image_url: string;
  copy_variant: string | null;
  copy_template_id: string | null;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  status: PinStatus;
  scheduled_for: string | null;
  published_at: string | null;
  impressions: number;
  saves: number;
  clicks: number;
  outbound_clicks: number;
  engagement_rate: number | null;
  last_metrics_sync: string | null;
  performance_tier: 'top' | 'good' | 'average' | 'underperformer' | null;
  last_error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export type PinStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'retired';

export interface PinSchedule {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  time_slots: TimeSlot[];
  timezone: string;
  max_pins_per_day: number;
  rotate_collections: boolean;
  collection_weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  day: number; // 0-6, Sunday = 0
  hour: number;
  minute: number;
}

export interface PinCopyTemplate {
  id: string;
  user_id: string;
  name: string;
  variant: string;
  title_template: string;
  description_template: string;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  mood: string | null;
  times_used: number;
  total_impressions: number;
  total_saves: number;
  total_clicks: number;
  avg_engagement_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePinRequest {
  assetId?: string;
  mockupId?: string;
  boardId: string;
  title: string;
  description?: string;
  link?: string;
  scheduledFor?: string;
  copyTemplateId?: string;
}

export interface SchedulePinRequest {
  pinIds: string[];
  startFrom?: string;
  respectSchedule?: boolean;
}
