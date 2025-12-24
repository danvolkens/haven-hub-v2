export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'other';
export type ContentType = 'post' | 'reel' | 'story' | 'video' | 'tweet';

export interface CrossPlatformContent {
  id: string;
  user_id: string;
  platform: Platform;
  original_url: string;
  content_type: ContentType;
  title?: string;
  description?: string;
  image_url?: string;
  video_url?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate?: number;
  performance_score?: number;
  is_winner: boolean;
  winner_detected_at?: string;
  adapted_to_pinterest: boolean;
  pinterest_pin_id?: string;
  adapted_at?: string;
  posted_at?: string;
  metrics_updated_at?: string;
  created_at: string;
  updated_at: string;
}
