export interface DesignTemplate {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  preview_url?: string;
  type: 'quote' | 'product' | 'announcement';
  category?: string;
  layout: TemplateLayout;
  typography: TemplateTypography;
  colors: TemplateColors;
  decorations: TemplateDecorations;
  compatible_formats: string[];
  compatible_moods: string[];
  is_system: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateLayout {
  text_position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  text_alignment: 'center' | 'left' | 'right';
  padding: { top: number; right: number; bottom: number; left: number };
  attribution_position?: 'below' | 'inline' | 'hidden';
}

export interface TemplateTypography {
  font_family: string;
  font_size_scale: number;
  line_height?: number;
  letter_spacing?: number;
  text_transform?: 'none' | 'uppercase' | 'lowercase';
}

export interface TemplateColors {
  background: string;
  text: string;
  accent?: string;
  gradient?: { from: string; to: string; direction: string };
}

export interface TemplateDecorations {
  border?: { width: number; color: string; radius: number };
  shadow?: { x: number; y: number; blur: number; color: string };
  overlay?: { color: string; opacity: number };
}
