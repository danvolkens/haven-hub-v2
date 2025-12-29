/**
 * Approval Test Fixtures
 * Sample approval data for testing
 */

import { TEST_USER_ID } from '../setup';

export type ApprovalType = 'pin' | 'asset' | 'mockup' | 'email' | 'campaign';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalItem {
  id: string;
  user_id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  priority: number;
  content: Record<string, unknown>;
  flags: Record<string, unknown>;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export const mockApprovalItems: Record<string, ApprovalItem> = {
  pendingPin: {
    id: 'approval-pin-1',
    user_id: TEST_USER_ID,
    type: 'pin',
    status: 'pending',
    priority: 1,
    content: {
      title: 'New Product Announcement',
      description: 'Check out our latest product!',
      image_url: 'https://example.com/images/pin.jpg',
      link: 'https://example.com/product',
      board_id: 'board-1',
    },
    flags: {
      ai_generated: true,
      quality_score: 85,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  pendingAsset: {
    id: 'approval-asset-1',
    user_id: TEST_USER_ID,
    type: 'asset',
    status: 'pending',
    priority: 0,
    content: {
      asset_type: 'image',
      file_url: 'https://example.com/images/asset.jpg',
      file_name: 'product-mockup.jpg',
      file_size: 256000,
      dimensions: { width: 1000, height: 1500 },
    },
    flags: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  pendingMockup: {
    id: 'approval-mockup-1',
    user_id: TEST_USER_ID,
    type: 'mockup',
    status: 'pending',
    priority: 2,
    content: {
      template_id: 'template-1',
      template_name: 'Cozy Pillow Mockup',
      quote_id: 'quote-1',
      quote_text: 'Live, Laugh, Love',
      rendered_url: 'https://example.com/mockups/rendered.jpg',
    },
    flags: {
      auto_generated: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  pendingEmail: {
    id: 'approval-email-1',
    user_id: TEST_USER_ID,
    type: 'email',
    status: 'pending',
    priority: 1,
    content: {
      workflow_id: 'workflow-1',
      workflow_name: 'Welcome Series',
      email_type: 'welcome',
      subject: 'Welcome to Our Store!',
      preview_text: 'Thanks for joining us...',
      html_preview_url: 'https://example.com/email-preview',
    },
    flags: {
      recipient_count: 150,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  approved: {
    id: 'approval-approved-1',
    user_id: TEST_USER_ID,
    type: 'pin',
    status: 'approved',
    priority: 0,
    content: {
      title: 'Approved Pin',
      description: 'This pin was approved',
    },
    flags: {},
    approved_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  rejected: {
    id: 'approval-rejected-1',
    user_id: TEST_USER_ID,
    type: 'asset',
    status: 'rejected',
    priority: 0,
    content: {
      asset_type: 'image',
      file_url: 'https://example.com/images/rejected.jpg',
    },
    flags: {},
    rejected_at: new Date().toISOString(),
    rejection_reason: 'Image quality too low',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  expired: {
    id: 'approval-expired-1',
    user_id: TEST_USER_ID,
    type: 'campaign',
    status: 'expired',
    priority: 0,
    content: {
      campaign_name: 'Expired Campaign',
    },
    flags: {},
    expires_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
};

/**
 * Get all pending approval items
 */
export function getPendingApprovals(): ApprovalItem[] {
  return Object.values(mockApprovalItems).filter(
    (item) => item.status === 'pending'
  );
}

/**
 * Create a list of approval items with various types
 */
export function createApprovalList(
  count: number,
  options?: {
    status?: ApprovalStatus;
    type?: ApprovalType;
    userId?: string;
  }
): ApprovalItem[] {
  const { status = 'pending', type, userId = TEST_USER_ID } = options || {};
  const types: ApprovalType[] = ['pin', 'asset', 'mockup', 'email', 'campaign'];

  return Array.from({ length: count }, (_, i) => ({
    id: `approval-${status}-${i + 1}`,
    user_id: userId,
    type: type || types[i % types.length],
    status,
    priority: Math.floor(Math.random() * 3),
    content: {
      title: `Test Approval ${i + 1}`,
      description: `Description for approval ${i + 1}`,
    },
    flags: {},
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Create approval counts by type
 */
export function createApprovalCounts() {
  return {
    total: 25,
    by_type: {
      pin: 10,
      asset: 5,
      mockup: 5,
      email: 3,
      campaign: 2,
    },
    by_priority: {
      high: 8,
      medium: 10,
      low: 7,
    },
  };
}

/**
 * Create mock approval action result
 */
export function createApprovalActionResult(
  id: string,
  action: 'approve' | 'reject',
  success = true
) {
  return {
    id,
    action,
    success,
    message: success
      ? `Item ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      : `Failed to ${action} item`,
    timestamp: new Date().toISOString(),
  };
}
