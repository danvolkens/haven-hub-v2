export type PopupTriggerType =
  | 'exit_intent'
  | 'scroll_depth'
  | 'time_on_page'
  | 'page_views'
  | 'click'
  | 'manual';

export type PopupPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'top_left'
  | 'top_right'
  | 'bottom_left'
  | 'bottom_right';

export type PopupAnimation = 'fade' | 'slide_up' | 'slide_down' | 'zoom' | 'none';

export type PopupContentType = 'email_capture' | 'announcement' | 'discount' | 'quiz_cta';

export type PopupStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface PopupTriggerConfig {
  percentage?: number;  // for scroll_depth
  seconds?: number;     // for time_on_page
  count?: number;       // for page_views
  selector?: string;    // for click
}

export interface PopupContent {
  type: PopupContentType;
  headline?: string;
  body?: string;
  image_url?: string;
  cta_text?: string;
  cta_link?: string;
  discount_code?: string;
  email_placeholder?: string;
  success_message?: string;
}

export interface PopupTargeting {
  devices?: ('desktop' | 'mobile' | 'tablet')[];
  url_contains?: string[];
  url_excludes?: string[];
  referrer_contains?: string[];
  new_visitors_only?: boolean;
  returning_visitors_only?: boolean;
  exclude_if_converted?: boolean;
}

export interface PopupFrequencyCap {
  type: 'once_per_session' | 'once_per_day' | 'once_ever' | 'unlimited';
  max_impressions?: number;
}

export interface PopupStyle {
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  border_radius?: number;
  max_width?: number;
}

export interface Popup {
  id: string;
  user_id: string;
  name: string;
  trigger_type: PopupTriggerType;
  trigger_config: PopupTriggerConfig;
  content: PopupContent;
  targeting: PopupTargeting;
  frequency_cap: PopupFrequencyCap;
  position: PopupPosition;
  animation: PopupAnimation;
  overlay_opacity: number;
  close_on_overlay_click: boolean;
  show_close_button: boolean;
  style: PopupStyle;
  status: PopupStatus;
  start_at?: string;
  end_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PopupAnalytics {
  id: string;
  popup_id: string;
  date: string;
  impressions: number;
  closes: number;
  conversions: number;
  unique_impressions: number;
  unique_conversions: number;
}
