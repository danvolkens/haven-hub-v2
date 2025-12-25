import type { Collection, Mood } from '@/lib/constants';

export interface Quote {
  id: string;
  user_id: string;
  text: string;
  attribution: string | null;
  collection: Collection;
  mood: Mood;
  temporal_tags: string[];
  status: 'active' | 'archived' | 'generating';
  assets_generated: number;
  last_generated_at: string | null;
  generation_settings: GenerationSettings | null;
  total_pins: number;
  total_impressions: number;
  total_saves: number;
  total_clicks: number;
  best_performing_asset_id: string | null;
  imported_from: 'csv' | 'manual' | 'api' | null;
  import_batch_id: string | null;
  master_image_url: string | null;
  master_image_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationSettings {
  designRuleId: string;
  outputFormats: string[];
  printSizes: string[];
  generateMockups: boolean;
  mockupScenes: string[];
}

export interface Asset {
  id: string;
  user_id: string;
  quote_id: string;
  format: string;
  dimensions: { width: number; height: number };
  file_url: string;
  file_key: string;
  thumbnail_url: string | null;
  design_config: DesignConfig;
  template_id: string | null;
  quality_scores: QualityScores;
  overall_score: number | null;
  flags: string[];
  flag_reasons: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected' | 'published' | 'archived';
  total_pins: number;
  total_impressions: number;
  total_saves: number;
  total_clicks: number;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityScores {
  readability: number;
  contrast: number;
  composition: number;
  overall: number;
}

export interface DesignConfig {
  typography: TypographyConfig;
  colors: ColorConfig;
  layout: LayoutConfig;
  decorations: DecorationConfig;
}

export interface TypographyConfig {
  font_family: string;
  font_weight: number;
  font_size_base: number;
  line_height: number;
  letter_spacing: number;
  text_transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  attribution_font_family: string;
  attribution_font_size: number;
}

export interface ColorConfig {
  background: string;
  text: string;
  accent: string;
}

export interface LayoutConfig {
  padding: number;
  text_alignment: 'left' | 'center' | 'right';
  vertical_alignment: 'top' | 'center' | 'bottom';
  max_width_percent: number;
  include_attribution: boolean;
  include_logo: boolean;
  logo_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logo_size: number;
}

export interface DecorationConfig {
  border: boolean;
  border_width: number;
  border_color: string;
  shadow: boolean;
  background_pattern: string | null;
  corner_style: 'square' | 'rounded' | 'pill';
}

export interface DesignRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  applies_to_collections: Collection[];
  applies_to_moods: Mood[];
  typography: TypographyConfig;
  colors: Record<Collection, ColorConfig>;
  layout: LayoutConfig;
  decorations: DecorationConfig;
  output_formats: string[];
  print_sizes: string[];
  quality_thresholds: {
    min_readability: number;
    min_contrast: number;
    min_overall: number;
    auto_approve_threshold: number;
  };
  priority: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
