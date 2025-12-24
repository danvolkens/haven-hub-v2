export type ButtonStyle = 'rounded' | 'pill' | 'square' | 'outline';
export type Theme = 'light' | 'dark' | 'custom';

export interface LinkInBioConfig {
  id: string;
  user_id: string;
  title: string;
  bio?: string;
  avatar_url?: string;
  theme: Theme;
  background_color: string;
  text_color: string;
  accent_color: string;
  button_style: ButtonStyle;
  slug?: string;
  total_views: number;
  created_at: string;
  updated_at: string;
}

export interface LinkInBioLink {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description?: string;
  icon?: string;
  thumbnail_url?: string;
  position: number;
  is_active: boolean;
  is_featured: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
}
