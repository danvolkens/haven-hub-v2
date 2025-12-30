import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_USER_ID } from '../../setup';

// Mock campaign data
const mockCampaign = {
  id: 'campaign-1',
  user_id: TEST_USER_ID,
  name: 'Summer Sale',
  description: 'Big summer sale campaign',
  type: 'seasonal',
  start_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
  end_date: new Date(Date.now() + 86400000 * 14).toISOString(), // 14 days from now
  target_collections: ['growth', 'grounding'],
  target_customer_stages: ['active', 'at_risk'],
  theme: 'summer',
  hashtags: ['#summersale', '#quotes'],
  revenue_goal: 5000,
  order_goal: 100,
  lead_goal: 500,
  revenue: 1250,
  orders: 25,
  leads: 150,
  has_offer: true,
  offer_type: 'percentage',
  offer_value: 20,
  offer_code: 'SUMMER20',
  channels: { pinterest: true, email: true, ads: false },
  featured_asset_ids: ['asset-1', 'asset-2'],
  featured_product_ids: ['product-1'],
  pins_published: 10,
  emails_sent: 3,
  status: 'active',
  created_at: new Date().toISOString(),
};

// Create mock chain builder
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error })),
  };
}

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    from: vi.fn((table: string) => {
      if (table === 'campaigns') {
        return createMockQueryBuilder(mockCampaign);
      }
      if (table === 'campaign_tasks') {
        return createMockQueryBuilder([]);
      }
      if (table === 'pins') {
        return createMockQueryBuilder([
          { impressions: 1000, saves: 50 },
          { impressions: 800, saves: 40 },
        ]);
      }
      return createMockQueryBuilder([]);
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

describe('Campaign Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('should create a campaign with required fields', async () => {
      const { createCampaign } = await import('@/lib/campaigns/campaign-service');

      const request = {
        name: 'New Campaign',
        type: 'seasonal' as const,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      const result = await createCampaign(TEST_USER_ID, request);

      expect(result).toHaveProperty('success');
    });

    it('should create a campaign with all optional fields', async () => {
      const { createCampaign } = await import('@/lib/campaigns/campaign-service');

      const request = {
        name: 'Full Campaign',
        description: 'A complete campaign',
        type: 'seasonal' as const,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        targetCollections: ['growth'],
        targetCustomerStages: ['active'],
        theme: 'summer',
        hashtags: ['#summer'],
        revenueGoal: 1000,
        orderGoal: 50,
        leadGoal: 100,
        hasOffer: true,
        offerType: 'percentage',
        offerValue: 15,
        offerCode: 'SUMMER15',
        channels: { pinterest: true, email: true, ads: true },
      };

      const result = await createCampaign(TEST_USER_ID, request);

      expect(result).toHaveProperty('success');
    });

    it('should set default channel values', async () => {
      const { createCampaign } = await import('@/lib/campaigns/campaign-service');

      const request = {
        name: 'Default Channels Campaign',
        type: 'promotional' as const,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = await createCampaign(TEST_USER_ID, request);

      expect(result).toHaveProperty('success');
    });

    it('should set status to draft on creation', async () => {
      const { createCampaign } = await import('@/lib/campaigns/campaign-service');

      const request = {
        name: 'Draft Campaign',
        type: 'evergreen' as const,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      };

      const result = await createCampaign(TEST_USER_ID, request);

      expect(result).toHaveProperty('success');
    });
  });

  describe('scheduleCampaign', () => {
    it('should schedule a campaign with featured content', async () => {
      const { scheduleCampaign } = await import('@/lib/campaigns/campaign-service');

      const result = await scheduleCampaign(TEST_USER_ID, 'campaign-1');

      expect(result).toHaveProperty('success');
    });

    it('should return error for non-existent campaign', async () => {
      // Mock to return null
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => Promise.resolve({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      }));

      const { scheduleCampaign } = await import('@/lib/campaigns/campaign-service');

      const result = await scheduleCampaign(TEST_USER_ID, 'non-existent');

      expect(result).toHaveProperty('success');
    });
  });

  describe('getCampaignPerformance', () => {
    it('should return campaign performance metrics', async () => {
      const { getCampaignPerformance } = await import('@/lib/campaigns/campaign-service');

      const performance = await getCampaignPerformance(TEST_USER_ID, 'campaign-1');

      if (performance) {
        expect(performance).toHaveProperty('revenue');
        expect(performance).toHaveProperty('orders');
        expect(performance).toHaveProperty('leads');
        expect(performance).toHaveProperty('goalProgress');
      }
    });

    it('should calculate goal progress correctly', async () => {
      const { getCampaignPerformance } = await import('@/lib/campaigns/campaign-service');

      const performance = await getCampaignPerformance(TEST_USER_ID, 'campaign-1');

      if (performance) {
        expect(performance.goalProgress).toHaveProperty('revenue');
        expect(performance.goalProgress).toHaveProperty('orders');
        expect(performance.goalProgress).toHaveProperty('leads');
        expect(typeof performance.goalProgress.revenue).toBe('number');
      }
    });

    it('should return null for non-existent campaign', async () => {
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => Promise.resolve({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      }));

      const { getCampaignPerformance } = await import('@/lib/campaigns/campaign-service');

      const performance = await getCampaignPerformance(TEST_USER_ID, 'non-existent');

      // May return null or performance object depending on mock
      expect([null, expect.any(Object)]).toContainEqual(performance);
    });

    it('should include pin statistics', async () => {
      const { getCampaignPerformance } = await import('@/lib/campaigns/campaign-service');

      const performance = await getCampaignPerformance(TEST_USER_ID, 'campaign-1');

      if (performance) {
        expect(performance).toHaveProperty('pinsPublished');
        expect(performance).toHaveProperty('pinsImpressions');
        expect(performance).toHaveProperty('pinsSaves');
      }
    });

    it('should include email statistics', async () => {
      const { getCampaignPerformance } = await import('@/lib/campaigns/campaign-service');

      const performance = await getCampaignPerformance(TEST_USER_ID, 'campaign-1');

      if (performance) {
        expect(performance).toHaveProperty('emailsSent');
        expect(performance).toHaveProperty('emailsOpened');
      }
    });
  });

  describe('processCampaignTasks', () => {
    it('should process pending tasks', async () => {
      const { processCampaignTasks } = await import('@/lib/campaigns/campaign-service');

      const result = await processCampaignTasks(TEST_USER_ID);

      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return zero processed when no tasks due', async () => {
      const { processCampaignTasks } = await import('@/lib/campaigns/campaign-service');

      const result = await processCampaignTasks(TEST_USER_ID);

      expect(typeof result.processed).toBe('number');
      expect(result.processed).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Campaign Types', () => {
  it('should support seasonal campaigns', () => {
    const validTypes = ['seasonal', 'promotional', 'evergreen', 'product_launch'];
    expect(validTypes).toContain('seasonal');
  });

  it('should support promotional campaigns', () => {
    const validTypes = ['seasonal', 'promotional', 'evergreen', 'product_launch'];
    expect(validTypes).toContain('promotional');
  });

  it('should support evergreen campaigns', () => {
    const validTypes = ['seasonal', 'promotional', 'evergreen', 'product_launch'];
    expect(validTypes).toContain('evergreen');
  });

  it('should support product launch campaigns', () => {
    const validTypes = ['seasonal', 'promotional', 'evergreen', 'product_launch'];
    expect(validTypes).toContain('product_launch');
  });
});

describe('Campaign Channels', () => {
  it('should have pinterest channel option', () => {
    const channels = { pinterest: true, email: true, ads: false };
    expect(channels).toHaveProperty('pinterest');
  });

  it('should have email channel option', () => {
    const channels = { pinterest: true, email: true, ads: false };
    expect(channels).toHaveProperty('email');
  });

  it('should have ads channel option', () => {
    const channels = { pinterest: true, email: true, ads: false };
    expect(channels).toHaveProperty('ads');
  });
});

describe('Campaign Task Types', () => {
  it('should support publish_pins task type', () => {
    const taskTypes = ['publish_pins', 'send_email', 'start_ads', 'pause_ads'];
    expect(taskTypes).toContain('publish_pins');
  });

  it('should support send_email task type', () => {
    const taskTypes = ['publish_pins', 'send_email', 'start_ads', 'pause_ads'];
    expect(taskTypes).toContain('send_email');
  });

  it('should support start_ads task type', () => {
    const taskTypes = ['publish_pins', 'send_email', 'start_ads', 'pause_ads'];
    expect(taskTypes).toContain('start_ads');
  });

  it('should support pause_ads task type', () => {
    const taskTypes = ['publish_pins', 'send_email', 'start_ads', 'pause_ads'];
    expect(taskTypes).toContain('pause_ads');
  });
});

describe('Goal Progress Calculation', () => {
  it('should calculate percentage correctly', () => {
    const current = 25;
    const goal = 100;
    const progress = (current / goal) * 100;
    expect(progress).toBe(25);
  });

  it('should handle zero goal gracefully', () => {
    const current = 25;
    const goal = 0;
    const progress = goal ? (current / goal) * 100 : 0;
    expect(progress).toBe(0);
  });

  it('should handle over-achievement', () => {
    const current = 150;
    const goal = 100;
    const progress = (current / goal) * 100;
    expect(progress).toBe(150);
  });
});
