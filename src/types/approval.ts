import type { ApprovalItemType, ApprovalStatus } from '@/lib/constants';
import type { Collection } from '@/lib/constants';

export interface ApprovalItem {
  id: string;
  user_id: string;
  type: ApprovalItemType;
  status: ApprovalStatus;
  reference_id: string;
  reference_table: string;
  payload: ApprovalPayload;
  confidence_score: number | null;
  flags: string[];
  flag_reasons: Record<string, string>;
  priority: number;
  collection: Collection | null;
  processed_at: string | null;
  processed_by: 'user' | 'system' | 'auto' | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalPayload =
  | AssetApprovalPayload
  | MockupApprovalPayload
  | PinApprovalPayload
  | UgcApprovalPayload
  | ProductApprovalPayload;

export interface AssetApprovalPayload {
  type: 'asset';
  quoteId: string;
  quoteText: string;
  assetUrl: string;
  thumbnailUrl: string;
  format: string;
  size: string;
  collection: Collection;
  mood: string;
  qualityScores: {
    readability: number;
    contrast: number;
    composition: number;
    overall: number;
  };
}

export interface MockupApprovalPayload {
  type: 'mockup';
  quoteId: string;
  assetId: string;
  mockupUrl: string;
  thumbnailUrl: string;
  scene: string;
  creditsUsed: number;
}

export interface PinApprovalPayload {
  type: 'pin';
  assetUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  boardName: string;
  scheduledTime: string | null;
  copyVariant: string | null;
}

export interface UgcApprovalPayload {
  type: 'ugc';
  photoUrl: string;
  thumbnailUrl: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  productName: string;
  submittedAt: string;
  moderationScore: number | null;
}

export interface ProductApprovalPayload {
  type: 'product';
  title: string;
  description: string;
  price: number;
  images: string[];
  collection: Collection;
  variants: Array<{
    title: string;
    price: number;
    sku: string;
  }>;
}

export interface ApprovalCounts {
  total: number;
  asset: number;
  mockup: number;
  pin: number;
  ugc: number;
  product: number;
}

export type ApprovalAction = 'approve' | 'reject' | 'skip';

export interface ApprovalFilters {
  type?: ApprovalItemType;
  collection?: Collection;
  flagged?: boolean;
}
