export interface LandingPage {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  type: LandingPageType;
  headline: string;
  subheadline: string | null;
  body_content: string | null;
  lead_magnet_type: LeadMagnetType | null;
  lead_magnet_title: string | null;
  lead_magnet_file_url: string | null;
  lead_magnet_file_key: string | null;
  collection: 'grounding' | 'wholeness' | 'growth' | null;
  featured_image_url: string | null;
  custom_css: string | null;
  meta_title: string | null;
  meta_description: string | null;
  form_fields: FormField[];
  klaviyo_list_id: string | null;
  klaviyo_tags: string[];
  status: 'draft' | 'active' | 'archived';
  published_at: string | null;
  views: number;
  submissions: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export type LandingPageType = 'lead_magnet' | 'quiz' | 'newsletter' | 'product';
export type LeadMagnetType = 'ebook' | 'wallpaper' | 'printable' | 'guide' | 'checklist' | 'video';

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface Lead {
  id: string;
  user_id: string;
  landing_page_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  quiz_id: string | null;
  quiz_results: QuizResults | null;
  recommended_collection: string | null;
  status: LeadStatus;
  shopify_customer_id: string | null;
  converted_at: string | null;
  first_order_id: string | null;
  lifetime_value: number;
  klaviyo_profile_id: string | null;
  synced_to_klaviyo_at: string | null;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'subscribed' | 'customer' | 'unsubscribed';

export interface QuizResults {
  answers: Record<string, string | string[]>;
  scores: Record<string, number>;
  recommendation: string;
}

export interface FormSubmission {
  id: string;
  user_id: string;
  landing_page_id: string;
  lead_id: string | null;
  data: Record<string, string>;
  ip_address: string | null;
  user_agent: string | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface CreateLandingPageRequest {
  slug: string;
  name: string;
  type: LandingPageType;
  headline: string;
  subheadline?: string;
  bodyContent?: string;
  leadMagnetType?: LeadMagnetType;
  leadMagnetTitle?: string;
  collection?: 'grounding' | 'wholeness' | 'growth';
  formFields?: FormField[];
  klaviyoListId?: string;
  klaviyoTags?: string[];
}
