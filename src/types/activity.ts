// Action type definitions for type-safe activity logging

export type ActionType =
  // Mode & Settings
  | 'mode_change'
  | 'guardrail_update'
  // Design Engine
  | 'asset_generated'
  | 'asset_approved'
  | 'asset_rejected'
  // Pinterest
  | 'pin_scheduled'
  | 'pin_published'
  | 'pin_failed'
  // Mockups
  | 'mockup_generated'
  | 'mockup_credits_reserved'
  // Products
  | 'product_created'
  | 'product_published'
  | 'product_retired'
  // Ads
  | 'ad_campaign_created'
  | 'ad_campaign_paused'
  | 'ad_budget_warning'
  // Analytics
  | 'winner_variation_created'
  // Customer Journey
  | 'sequence_triggered'
  // Alerts
  | 'alert_created'
  | 'alert_sent'
  // Integrations
  | 'integration_connected'
  | 'integration_disconnected'
  // Export
  | 'export_created'
  // Retry
  | 'retry_queued'
  | 'retry_resolved'
  | 'retry_failed';

export type Module =
  | 'pinterest'
  | 'design_engine'
  | 'mockups'
  | 'ads'
  | 'products'
  | 'ugc'
  | 'quiz'
  | 'leads'
  | 'customers'
  | 'campaigns'
  | 'settings';

// Type-safe detail structures for each action type
export interface ModeChangeDetails {
  from: string;
  to: string;
  gracePeriodUsed: boolean;
  pendingOperationsCount?: number;
}

export interface GuardrailUpdateDetails {
  guardrailKey: string;
  from: number | null;
  to: number | null;
}

export interface AssetGeneratedDetails {
  quoteId: string;
  assetCount: number;
  formats: string[];
  qualityScores: Record<string, number>;
  autoApproved: boolean;
}

export interface AssetApprovedDetails {
  assetId: string;
  quoteId: string;
  format: string;
}

export interface PinScheduledDetails {
  pinId: string;
  boardId: string;
  boardName: string;
  scheduledTime: string;
  copyVariantUsed?: string;
}

export interface PinPublishedDetails {
  pinId: string;
  pinterestPinId: string;
  boardId: string;
}

export interface PinFailedDetails {
  pinId: string;
  error: string;
  retryQueued: boolean;
}

export interface MockupGeneratedDetails {
  mockupId: string;
  quoteId: string;
  scene: string;
  creditsUsed: number;
}

export interface ProductCreatedDetails {
  productId: string;
  shopifyProductId: string;
  quoteId: string;
  collection: string;
  status: 'draft' | 'active';
}

export interface SequenceTriggeredDetails {
  sequenceType: 'quiz_completion' | 'cart_abandonment' | 'post_purchase' | 'win_back' | 'lead_nurturing';
  customerId?: string;
  email: string;
  klaviyoFlowId: string;
}

export interface AlertCreatedDetails {
  alertType: string;
  threshold: string;
  currentValue: number;
  entityId?: string;
  entityType?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: ActionType;
  module: Module | null;
  details: Record<string, unknown>;
  executed: boolean;
  operator_mode: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reference_id: string | null;
  reference_table: string | null;
  created_at: string;
}
