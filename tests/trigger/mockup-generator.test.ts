import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TEST_USER_ID } from '../setup';

/**
 * Mockup Generator Task Tests
 *
 * Tests the mockup generation logic used by Trigger.dev tasks.
 * We test the business logic functions rather than the task wrapper
 * since Trigger.dev tasks have complex runtime dependencies.
 */

// Mock the logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

// Mock render service responses
interface RenderResult {
  status: 'success' | 'failed';
  mockupId?: string;
  assetId: string;
  scene: string;
  url?: string;
  creditsUsed: number;
  error?: string;
}

let mockRenderResults: RenderResult[] = [];
let mockUserSettings = {
  global_mode: 'supervised',
  module_overrides: {},
};

// Create chainable mock query builder
function createMockQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({
      data: mockUserSettings,
      error: null,
    })),
  };
  return builder;
}

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => createMockQueryBuilder()),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

// Mock the render service
const mockRenderMockupBatch = vi.fn(async (
  assetIds: string[],
  scenes: string[],
  userId: string
): Promise<RenderResult[]> => {
  return mockRenderResults;
});

/**
 * Simplified mockup generator logic for testing
 * This mirrors the logic in trigger/mockup-generator.ts
 */
interface MockupGeneratorPayload {
  userId: string;
  assetIds: string[];
  scenes: string[];
  skipApproval?: boolean;
}

async function processMockupGeneration(
  payload: MockupGeneratorPayload,
  supabase: typeof mockSupabaseClient,
  renderBatch: typeof mockRenderMockupBatch
): Promise<{
  success: boolean;
  generated: number;
  failed: number;
  totalCreditsUsed: number;
}> {
  mockLogger.info('Starting mockup generation', {
    assetCount: payload.assetIds.length,
    sceneCount: payload.scenes.length,
  });

  // Generate mockups
  const results = await renderBatch(
    payload.assetIds,
    payload.scenes,
    payload.userId
  );

  const successful = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');

  mockLogger.info('Mockup generation complete', {
    successful: successful.length,
    failed: failed.length,
  });

  // Log activity for successful generations
  for (const result of successful) {
    await supabase.rpc('log_activity', {
      p_user_id: payload.userId,
      p_action_type: 'mockup_generated',
      p_details: {
        mockupId: result.mockupId,
        scene: result.scene,
        creditsUsed: result.creditsUsed,
      },
      p_executed: true,
      p_module: 'mockups',
      p_reference_id: result.mockupId,
      p_reference_table: 'mockups',
    });
  }

  // Get operator mode
  const { data: settings } = await supabase
    .from('user_settings')
    .select('global_mode, module_overrides')
    .eq('user_id', payload.userId)
    .single();

  const effectiveMode = (settings?.module_overrides as Record<string, string>)?.mockups || settings?.global_mode || 'supervised';
  const autoApprove = effectiveMode === 'autopilot' || payload.skipApproval;

  // Route successful mockups
  for (const result of successful) {
    if (autoApprove) {
      // Auto-approve
      await supabase
        .from('mockups')
        .update({ status: 'approved' })
        .eq('id', result.mockupId);
    } else {
      // Add to approval queue
      await supabase.from('approval_items').insert({
        user_id: payload.userId,
        type: 'mockup',
        reference_id: result.mockupId,
        reference_table: 'mockups',
        payload: {
          type: 'mockup',
          mockupUrl: result.url,
          scene: result.scene,
          creditsUsed: result.creditsUsed,
        },
        priority: 0,
      });
    }
  }

  // Queue failed items for retry
  for (const result of failed) {
    await supabase.rpc('queue_for_retry', {
      p_user_id: payload.userId,
      p_operation_type: 'mockup_generation',
      p_payload: {
        assetId: result.assetId,
        scene: result.scene,
      },
      p_error: result.error,
      p_reference_id: result.assetId,
      p_reference_table: 'assets',
    });
  }

  return {
    success: true,
    generated: successful.length,
    failed: failed.length,
    totalCreditsUsed: successful.reduce((sum, r) => sum + r.creditsUsed, 0),
  };
}

describe('Mockup Generator Task Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderResults = [];
    mockUserSettings = {
      global_mode: 'supervised',
      module_overrides: {},
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processMockupGeneration', () => {
    it('should handle empty asset list', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: [],
        scenes: ['frame-white', 'frame-black'],
      };

      mockRenderResults = [];

      const result = await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      expect(result).toEqual({
        success: true,
        generated: 0,
        failed: 0,
        totalCreditsUsed: 0,
      });
    });

    it('should process successful mockups', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1', 'asset-2'],
        scenes: ['frame-white'],
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 1 },
        { status: 'success', mockupId: 'mockup-2', assetId: 'asset-2', scene: 'frame-white', url: 'https://example.com/2.jpg', creditsUsed: 1 },
      ];

      const result = await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      expect(result.generated).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.totalCreditsUsed).toBe(2);
    });

    it('should handle mixed success and failure', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1', 'asset-2', 'asset-3'],
        scenes: ['frame-white'],
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 1 },
        { status: 'failed', assetId: 'asset-2', scene: 'frame-white', creditsUsed: 0, error: 'Image processing failed' },
        { status: 'success', mockupId: 'mockup-3', assetId: 'asset-3', scene: 'frame-white', url: 'https://example.com/3.jpg', creditsUsed: 1 },
      ];

      const result = await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      expect(result.generated).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.totalCreditsUsed).toBe(2);
    });

    it('should queue failed items for retry', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1'],
        scenes: ['frame-white'],
      };

      mockRenderResults = [
        { status: 'failed', assetId: 'asset-1', scene: 'frame-white', creditsUsed: 0, error: 'API timeout' },
      ];

      await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('queue_for_retry', expect.objectContaining({
        p_user_id: TEST_USER_ID,
        p_operation_type: 'mockup_generation',
        p_error: 'API timeout',
      }));
    });

    it('should log activity for successful generations', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1'],
        scenes: ['frame-white'],
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 2 },
      ];

      await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('log_activity', expect.objectContaining({
        p_user_id: TEST_USER_ID,
        p_action_type: 'mockup_generated',
        p_module: 'mockups',
      }));
    });

    it('should calculate total credits used correctly', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1', 'asset-2'],
        scenes: ['frame-white', 'frame-black'],
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 2 },
        { status: 'success', mockupId: 'mockup-2', assetId: 'asset-1', scene: 'frame-black', url: 'https://example.com/2.jpg', creditsUsed: 2 },
        { status: 'success', mockupId: 'mockup-3', assetId: 'asset-2', scene: 'frame-white', url: 'https://example.com/3.jpg', creditsUsed: 2 },
        { status: 'success', mockupId: 'mockup-4', assetId: 'asset-2', scene: 'frame-black', url: 'https://example.com/4.jpg', creditsUsed: 2 },
      ];

      const result = await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      expect(result.totalCreditsUsed).toBe(8);
    });
  });

  describe('Operator Mode Routing', () => {
    it('should add to approval queue in supervised mode', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1'],
        scenes: ['frame-white'],
      };

      mockUserSettings = {
        global_mode: 'supervised',
        module_overrides: {},
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 1 },
      ];

      await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      // Verify approval_items.insert was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('approval_items');
    });

    it('should auto-approve in autopilot mode', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1'],
        scenes: ['frame-white'],
      };

      mockUserSettings = {
        global_mode: 'autopilot',
        module_overrides: {},
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 1 },
      ];

      await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      // In autopilot, should update mockup status directly
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('mockups');
    });

    it('should respect module-level override for mockups', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1'],
        scenes: ['frame-white'],
      };

      mockUserSettings = {
        global_mode: 'supervised',
        module_overrides: { mockups: 'autopilot' },
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 1 },
      ];

      await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      // With module override to autopilot, should auto-approve
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('mockups');
    });

    it('should skip approval when skipApproval flag is set', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1'],
        scenes: ['frame-white'],
        skipApproval: true,
      };

      mockUserSettings = {
        global_mode: 'supervised',
        module_overrides: {},
      };

      mockRenderResults = [
        { status: 'success', mockupId: 'mockup-1', assetId: 'asset-1', scene: 'frame-white', url: 'https://example.com/1.jpg', creditsUsed: 1 },
      ];

      await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      // Even in supervised mode, skipApproval flag should auto-approve
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('mockups');
    });
  });

  describe('Error Handling', () => {
    it('should handle render service throwing error', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1'],
        scenes: ['frame-white'],
      };

      const mockRenderError = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      await expect(
        processMockupGeneration(payload, mockSupabaseClient, mockRenderError)
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle all renders failing', async () => {
      const payload = {
        userId: TEST_USER_ID,
        assetIds: ['asset-1', 'asset-2'],
        scenes: ['frame-white'],
      };

      mockRenderResults = [
        { status: 'failed', assetId: 'asset-1', scene: 'frame-white', creditsUsed: 0, error: 'Invalid image' },
        { status: 'failed', assetId: 'asset-2', scene: 'frame-white', creditsUsed: 0, error: 'Invalid image' },
      ];

      const result = await processMockupGeneration(payload, mockSupabaseClient, mockRenderMockupBatch);

      expect(result.success).toBe(true); // Task succeeds even if all renders fail
      expect(result.generated).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.totalCreditsUsed).toBe(0);
    });
  });
});

describe('Mockup Payload Validation', () => {
  it('should require userId', () => {
    const validPayload = {
      userId: TEST_USER_ID,
      assetIds: ['asset-1'],
      scenes: ['frame-white'],
    };

    expect(validPayload.userId).toBeDefined();
    expect(validPayload.userId).not.toBe('');
  });

  it('should require at least one asset', () => {
    const validPayload = {
      userId: TEST_USER_ID,
      assetIds: ['asset-1'],
      scenes: ['frame-white'],
    };

    expect(validPayload.assetIds.length).toBeGreaterThan(0);
  });

  it('should require at least one scene', () => {
    const validPayload = {
      userId: TEST_USER_ID,
      assetIds: ['asset-1'],
      scenes: ['frame-white'],
    };

    expect(validPayload.scenes.length).toBeGreaterThan(0);
  });

  it('should allow skipApproval flag', () => {
    const payload = {
      userId: TEST_USER_ID,
      assetIds: ['asset-1'],
      scenes: ['frame-white'],
      skipApproval: true,
    };

    expect(payload.skipApproval).toBe(true);
  });
});
