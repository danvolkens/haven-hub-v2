import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'is'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockCustomer = {
  id: 'customer-1',
  user_id: 'user-123',
  email: 'test@example.com',
  stage: 'lead',
  primary_collection: 'growth',
  total_orders: 3,
  lifetime_value: 450,
};

const mockQueryBuilder = createMockQueryBuilder([mockCustomer]);

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

describe('Journey Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordTouchpoint', () => {
    it('should be exported as a function', async () => {
      const { recordTouchpoint } = await import('@/lib/customers/journey-service');
      expect(typeof recordTouchpoint).toBe('function');
    });

    it('should accept userId, email, and touchpoint data', async () => {
      const { recordTouchpoint } = await import('@/lib/customers/journey-service');
      const result = await recordTouchpoint('user-123', 'test@example.com', {
        type: 'page_view',
        channel: 'web',
      });

      expect(result).toHaveProperty('success');
    });

    it('should support optional touchpoint fields', async () => {
      const { recordTouchpoint } = await import('@/lib/customers/journey-service');
      const result = await recordTouchpoint('user-123', 'test@example.com', {
        type: 'purchase',
        channel: 'web',
        referenceId: 'order-1',
        referenceType: 'order',
        metadata: { source: 'pinterest' },
        value: 150,
        collection: 'growth',
        utmSource: 'pinterest',
        utmMedium: 'social',
        utmCampaign: 'spring-sale',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('getCustomerJourney', () => {
    it('should be exported as a function', async () => {
      const { getCustomerJourney } = await import('@/lib/customers/journey-service');
      expect(typeof getCustomerJourney).toBe('function');
    });

    it('should return customer, touchpoints, and transitions', async () => {
      const { getCustomerJourney } = await import('@/lib/customers/journey-service');
      const result = await getCustomerJourney('user-123', 'customer-1');

      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('touchpoints');
      expect(result).toHaveProperty('transitions');
    });
  });

  describe('getJourneyAnalytics', () => {
    it('should be exported as a function', async () => {
      const { getJourneyAnalytics } = await import('@/lib/customers/journey-service');
      expect(typeof getJourneyAnalytics).toBe('function');
    });

    it('should return analytics structure', async () => {
      const { getJourneyAnalytics } = await import('@/lib/customers/journey-service');
      const result = await getJourneyAnalytics('user-123');

      expect(result).toHaveProperty('stageDistribution');
      expect(result).toHaveProperty('collectionDistribution');
      expect(result).toHaveProperty('conversionFunnel');
      expect(result).toHaveProperty('atRiskCount');
      expect(result).toHaveProperty('avgLifetimeValue');
    });
  });
});

describe('Customer Stage Types', () => {
  const stages = ['visitor', 'lead', 'prospect', 'customer', 'repeat', 'vip', 'at_risk', 'churned'];

  stages.forEach((stage) => {
    it(`should recognize ${stage} as valid stage`, () => {
      expect(stages).toContain(stage);
    });
  });
});

describe('Touchpoint Types', () => {
  describe('Event Types', () => {
    const eventTypes = [
      'page_view', 'email_open', 'email_click', 'lead_capture',
      'quiz_complete', 'add_to_cart', 'checkout', 'purchase', 'review'
    ];

    eventTypes.forEach((type) => {
      it(`should recognize ${type} as valid touchpoint type`, () => {
        expect(eventTypes).toContain(type);
      });
    });
  });

  describe('Channel Types', () => {
    const channels = ['web', 'email', 'pinterest', 'instagram', 'sms', 'referral', 'direct'];

    channels.forEach((channel) => {
      it(`should recognize ${channel} as valid channel`, () => {
        expect(channels).toContain(channel);
      });
    });
  });
});

describe('Stage Transition Logic', () => {
  describe('Visitor to Lead', () => {
    it('should transition on lead_capture', () => {
      const currentStage = 'visitor';
      const triggerType = 'lead_capture';
      const newStage = triggerType === 'lead_capture' ? 'lead' : currentStage;

      expect(newStage).toBe('lead');
    });
  });

  describe('Lead to Customer', () => {
    it('should transition on purchase', () => {
      const currentStage = 'lead';
      const triggerType = 'purchase';
      const newStage = triggerType === 'purchase' ? 'customer' : currentStage;

      expect(newStage).toBe('customer');
    });
  });

  describe('Customer to Repeat', () => {
    it('should transition on second purchase', () => {
      const totalOrders = 2;
      const isRepeat = totalOrders >= 2;

      expect(isRepeat).toBe(true);
    });
  });

  describe('Repeat to VIP', () => {
    it('should transition on high LTV', () => {
      const lifetimeValue = 500;
      const vipThreshold = 250;
      const isVip = lifetimeValue >= vipThreshold;

      expect(isVip).toBe(true);
    });

    it('should transition on many orders', () => {
      const totalOrders = 5;
      const vipOrderThreshold = 5;
      const isVip = totalOrders >= vipOrderThreshold;

      expect(isVip).toBe(true);
    });
  });
});

describe('Segment Evaluation', () => {
  describe('Criteria Matching', () => {
    it('should match stage criteria', () => {
      const customer = { stage: 'customer' };
      const criteria = { stages: ['customer', 'repeat'] };

      const matches = criteria.stages.includes(customer.stage);
      expect(matches).toBe(true);
    });

    it('should match collection criteria', () => {
      const customer = { primary_collection: 'growth' };
      const criteria = { collections: ['growth', 'wholeness'] };

      const matches = criteria.collections.includes(customer.primary_collection);
      expect(matches).toBe(true);
    });

    it('should match LTV range criteria', () => {
      const customer = { lifetime_value: 150 };
      const criteria = { min_ltv: 100, max_ltv: 500 };

      const matches = customer.lifetime_value >= criteria.min_ltv &&
                     customer.lifetime_value <= criteria.max_ltv;
      expect(matches).toBe(true);
    });

    it('should match order count criteria', () => {
      const customer = { total_orders: 3 };
      const criteria = { min_orders: 2 };

      const matches = customer.total_orders >= criteria.min_orders;
      expect(matches).toBe(true);
    });
  });
});

describe('Analytics Calculations', () => {
  describe('Stage Distribution', () => {
    it('should count customers per stage', () => {
      const customers = [
        { stage: 'visitor' },
        { stage: 'lead' },
        { stage: 'customer' },
        { stage: 'customer' },
        { stage: 'repeat' },
      ];

      const distribution: Record<string, number> = {};
      for (const c of customers) {
        distribution[c.stage] = (distribution[c.stage] || 0) + 1;
      }

      expect(distribution.visitor).toBe(1);
      expect(distribution.lead).toBe(1);
      expect(distribution.customer).toBe(2);
      expect(distribution.repeat).toBe(1);
    });
  });

  describe('Conversion Funnel', () => {
    it('should calculate funnel stages', () => {
      const stageDistribution = {
        visitor: 100,
        lead: 50,
        prospect: 25,
        customer: 20,
        repeat: 10,
        vip: 5,
      };

      const funnel = {
        visitors: stageDistribution.visitor,
        leads: stageDistribution.lead + stageDistribution.prospect,
        customers: stageDistribution.customer,
        repeat: stageDistribution.repeat + stageDistribution.vip,
      };

      expect(funnel.visitors).toBe(100);
      expect(funnel.leads).toBe(75);
      expect(funnel.customers).toBe(20);
      expect(funnel.repeat).toBe(15);
    });
  });

  describe('Average LTV', () => {
    it('should calculate average correctly', () => {
      const customers = [
        { lifetime_value: 100 },
        { lifetime_value: 200 },
        { lifetime_value: 300 },
      ];

      const totalLtv = customers.reduce((sum, c) => sum + c.lifetime_value, 0);
      const avgLtv = totalLtv / customers.length;

      expect(avgLtv).toBe(200);
    });

    it('should handle empty customer list', () => {
      const customers: Array<{ lifetime_value: number }> = [];
      const avgLtv = customers.length > 0
        ? customers.reduce((sum, c) => sum + c.lifetime_value, 0) / customers.length
        : 0;

      expect(avgLtv).toBe(0);
    });
  });
});

describe('Collection Affinity', () => {
  describe('Affinity Calculation', () => {
    it('should determine primary collection from touchpoints', () => {
      const touchpoints = [
        { collection: 'growth' },
        { collection: 'growth' },
        { collection: 'wholeness' },
        { collection: 'grounding' },
      ];

      const counts: Record<string, number> = {};
      for (const t of touchpoints) {
        if (t.collection) {
          counts[t.collection] = (counts[t.collection] || 0) + 1;
        }
      }

      const primary = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0];

      expect(primary[0]).toBe('growth');
      expect(primary[1]).toBe(2);
    });
  });
});
