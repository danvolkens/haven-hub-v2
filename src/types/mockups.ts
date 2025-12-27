export interface Mockup {
  id: string;
  user_id: string;
  asset_id: string;
  quote_id: string | null;
  scene: string;
  scene_config: SceneConfig;
  file_url: string;
  file_key: string;
  thumbnail_url: string | null;
  dm_render_id: string | null;
  dm_metadata: Record<string, unknown>;
  credits_used: number;
  quality_score: number | null;
  status: MockupStatus;
  error_message: string | null;
  total_pins: number;
  total_impressions: number;
  created_at: string;
  updated_at: string;
}

export type MockupStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'approved'
  | 'rejected';

export interface SceneConfig {
  smart_object?: string;
  default_size?: { width: number; height: number };
  position?: { x: number; y: number };
  rotation?: number;
  scale?: number;
}

export interface MockupSceneTemplate {
  id: string;
  user_id: string | null;
  scene_key: string;
  name: string;
  description: string | null;
  dm_template_id: string;
  dm_template_url: string | null;
  config: SceneConfig;
  preview_url: string | null;
  is_active: boolean;
  is_system: boolean;
  is_default: boolean;
  recommended_collections: string[];
  created_at: string;
  updated_at: string;
}

export interface MockupAutomationSettings {
  auto_generate: boolean;
  use_defaults: boolean;
  max_per_quote: number;
  notify_on_complete: boolean;
}

export interface CreditUsage {
  total_used: number;
  monthly_used: number;
  annual_budget: number;
  monthly_soft_limit: number;
  remaining_annual: number;
  remaining_monthly: number;
}

export interface MockupGenerationRequest {
  assetIds: string[];
  scenes: string[];
  skipApproval?: boolean;
}

export interface MockupGenerationResult {
  mockupId: string;
  assetId: string;
  scene: string;
  status: 'success' | 'failed';
  url?: string;
  error?: string;
  creditsUsed: number;
}
