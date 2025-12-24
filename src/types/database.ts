// Add these types to the existing types/database.ts file

export type OperatorMode = 'supervised' | 'assisted' | 'autopilot';

export type SetupStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ModuleOverrides {
  pinterest?: OperatorMode;
  design_engine?: OperatorMode;
  mockups?: OperatorMode;
  ads?: OperatorMode;
  products?: OperatorMode;
  ugc?: OperatorMode;
}

export interface Guardrails {
  daily_pin_limit: number;
  weekly_ad_spend_cap: number;
  monthly_ad_spend_cap: number | null;
  annual_mockup_budget: number;
  monthly_mockup_soft_limit: number;
  auto_retire_days: number;
  abandonment_window_hours: number;
  duplicate_content_days: number;
}

export interface SetupProgress {
  shopify: SetupStepStatus;
  pinterest: SetupStepStatus;
  klaviyo: SetupStepStatus;
  dynamic_mockups: SetupStepStatus;
  resend: SetupStepStatus;
  design_rules: SetupStepStatus;
  operator_mode: SetupStepStatus;
  import: SetupStepStatus;
}

export interface DigestSections {
  metrics: boolean;
  scheduled_content: boolean;
  overnight_activity: boolean;
  pending_approvals: boolean;
  ad_spend: boolean;
  alerts: boolean;
  mockup_credits: boolean;
}

export interface DigestPreferences {
  enabled: boolean;
  send_hour: number; // 6-10
  frequency: 'daily' | 'weekdays' | 'weekly';
  sections: DigestSections;
}

export interface NotificationPreferences {
  email_alerts: boolean;
  alert_delivery: 'immediate' | 'daily';
  retry_failure_notifications: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  global_mode: OperatorMode;
  module_overrides: ModuleOverrides;
  transitioning_to: OperatorMode | null;
  transition_started_at: string | null;
  guardrails: Guardrails;
  timezone: string;
  setup_progress: SetupProgress;
  setup_completed_at: string | null;
  digest_preferences: DigestPreferences;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

// Guardrail defaults as constants (matching migration)
export const GUARDRAIL_DEFAULTS: Guardrails = {
  daily_pin_limit: 5,
  weekly_ad_spend_cap: 100,
  monthly_ad_spend_cap: null,
  annual_mockup_budget: 3500,
  monthly_mockup_soft_limit: 292,
  auto_retire_days: 7,
  abandonment_window_hours: 1,
  duplicate_content_days: 30,
};
