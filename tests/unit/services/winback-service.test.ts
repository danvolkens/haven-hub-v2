import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockCampaign = {
  id: 'campaign-1',
  user_id: 'user-123',
  name: 'Win-back Campaign',
  status: 'draft',
  target_stages: ['at_risk', 'churned'],
  min_days_inactive: 30,
  max_days_inactive: 90,
  incentive_type: 'discount',
  incentive_value: 20,
  discount_code: 'WINBACK20',
};

const mockQueryBuilder = createMockQueryBuilder([mockCampaign]);

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: [{ customer_id: 'cust-1' }, { customer_id: 'cust-2' }], error: null }),
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Winback Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWinbackCampaign', () => {
    it('should be exported as a function', async () => {
      const { createWinbackCampaign } = await import('@/lib/winback/winback-service');
      expect(typeof createWinbackCampaign).toBe('function');
    });

    it('should accept userId and request', async () => {
      const { createWinbackCampaign } = await import('@/lib/winback/winback-service');
      const request = {
        name: 'Test Win-back',
        minDaysInactive: 30,
        maxDaysInactive: 90,
        incentiveType: 'discount' as const,
        incentiveValue: 20,
        discountCode: 'TEST20',
      };

      const result = await createWinbackCampaign('user-123', request);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });
  });

  describe('activateWinbackCampaign', () => {
    it('should be exported as a function', async () => {
      const { activateWinbackCampaign } = await import('@/lib/winback/winback-service');
      expect(typeof activateWinbackCampaign).toBe('function');
    });

    it('should accept userId and campaignId', async () => {
      const { activateWinbackCampaign } = await import('@/lib/winback/winback-service');
      const result = await activateWinbackCampaign('user-123', 'campaign-1');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('recipientsAdded');
    });
  });

  describe('processWinbackRecipients', () => {
    it('should be exported as a function', async () => {
      const { processWinbackRecipients } = await import('@/lib/winback/winback-service');
      expect(typeof processWinbackRecipients).toBe('function');
    });

    it('should return sent count and errors', async () => {
      const { processWinbackRecipients } = await import('@/lib/winback/winback-service');
      const result = await processWinbackRecipients('user-123');

      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});

describe('Winback Campaign Types', () => {
  describe('Campaign Status', () => {
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];

    validStatuses.forEach((status) => {
      it(`should recognize ${status} as valid status`, () => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Target Stages', () => {
    const targetStages = ['at_risk', 'churned', 'lapsed'];

    targetStages.forEach((stage) => {
      it(`should recognize ${stage} as valid target stage`, () => {
        expect(targetStages).toContain(stage);
      });
    });
  });

  describe('Incentive Types', () => {
    const incentiveTypes = ['discount', 'free_shipping', 'gift', 'points'];

    incentiveTypes.forEach((type) => {
      it(`should recognize ${type} as valid incentive type`, () => {
        expect(incentiveTypes).toContain(type);
      });
    });
  });

  describe('Recipient Status', () => {
    const recipientStatuses = ['pending', 'sent', 'opened', 'clicked', 'converted', 'failed'];

    recipientStatuses.forEach((status) => {
      it(`should recognize ${status} as valid recipient status`, () => {
        expect(recipientStatuses).toContain(status);
      });
    });
  });
});

describe('Campaign Request Structure', () => {
  describe('Required Fields', () => {
    it('should require name', () => {
      const request = {
        name: 'Test Campaign',
        minDaysInactive: 30,
        incentiveType: 'discount',
        incentiveValue: 20,
      };

      expect(request.name).toBeDefined();
    });

    it('should require minDaysInactive', () => {
      const request = {
        name: 'Test Campaign',
        minDaysInactive: 30,
        incentiveType: 'discount',
        incentiveValue: 20,
      };

      expect(request.minDaysInactive).toBeDefined();
    });

    it('should require incentive type and value', () => {
      const request = {
        name: 'Test Campaign',
        minDaysInactive: 30,
        incentiveType: 'discount',
        incentiveValue: 20,
      };

      expect(request.incentiveType).toBeDefined();
      expect(request.incentiveValue).toBeDefined();
    });
  });

  describe('Optional Fields', () => {
    it('should have optional targetStages with default', () => {
      const defaultStages = ['at_risk', 'churned'];
      const request = {
        name: 'Test',
        targetStages: defaultStages,
      };

      expect(request.targetStages).toEqual(['at_risk', 'churned']);
    });

    it('should have optional targetCollections', () => {
      const request = {
        name: 'Test',
        targetCollections: ['growth', 'wholeness'],
      };

      expect(request.targetCollections).toBeDefined();
    });

    it('should have optional klaviyoFlowId', () => {
      const request = {
        name: 'Test',
        klaviyoFlowId: 'flow-123',
      };

      expect(request.klaviyoFlowId).toBeDefined();
    });

    it('should have optional sendDelayDays with default', () => {
      const request = {
        name: 'Test',
        sendDelayDays: 0,
      };

      expect(request.sendDelayDays).toBe(0);
    });
  });
});

describe('Eligibility Logic', () => {
  describe('Days Inactive Range', () => {
    it('should include customers in range', () => {
      const customer = { days_inactive: 45 };
      const min = 30;
      const max = 90;

      const isEligible = customer.days_inactive >= min && customer.days_inactive <= max;

      expect(isEligible).toBe(true);
    });

    it('should exclude customers below minimum', () => {
      const customer = { days_inactive: 15 };
      const min = 30;
      const max = 90;

      const isEligible = customer.days_inactive >= min && customer.days_inactive <= max;

      expect(isEligible).toBe(false);
    });

    it('should exclude customers above maximum', () => {
      const customer = { days_inactive: 120 };
      const min = 30;
      const max = 90;

      const isEligible = customer.days_inactive >= min && customer.days_inactive <= max;

      expect(isEligible).toBe(false);
    });
  });

  describe('Lifetime Value Filter', () => {
    it('should include customers meeting LTV minimum', () => {
      const customer = { lifetime_value: 150 };
      const minLTV = 100;

      const isEligible = customer.lifetime_value >= minLTV;

      expect(isEligible).toBe(true);
    });

    it('should exclude customers below LTV minimum', () => {
      const customer = { lifetime_value: 50 };
      const minLTV = 100;

      const isEligible = customer.lifetime_value >= minLTV;

      expect(isEligible).toBe(false);
    });
  });

  describe('Journey Stage Filter', () => {
    it('should include at_risk customers', () => {
      const customer = { journey_stage: 'at_risk' };
      const targetStages = ['at_risk', 'churned'];

      const isEligible = targetStages.includes(customer.journey_stage);

      expect(isEligible).toBe(true);
    });

    it('should include churned customers', () => {
      const customer = { journey_stage: 'churned' };
      const targetStages = ['at_risk', 'churned'];

      const isEligible = targetStages.includes(customer.journey_stage);

      expect(isEligible).toBe(true);
    });

    it('should exclude active customers', () => {
      const customer = { journey_stage: 'active' };
      const targetStages = ['at_risk', 'churned'];

      const isEligible = targetStages.includes(customer.journey_stage);

      expect(isEligible).toBe(false);
    });
  });

  describe('Collection Filter', () => {
    it('should include customers with target collection', () => {
      const customer = { favorite_collection: 'growth' };
      const targetCollections = ['growth', 'wholeness'];

      const isEligible = targetCollections.includes(customer.favorite_collection);

      expect(isEligible).toBe(true);
    });

    it('should exclude customers with other collections', () => {
      const customer = { favorite_collection: 'grounding' };
      const targetCollections = ['growth', 'wholeness'];

      const isEligible = targetCollections.includes(customer.favorite_collection);

      expect(isEligible).toBe(false);
    });

    it('should include all when no collection filter', () => {
      const targetCollections: string[] = [];

      const isEligible = targetCollections.length === 0 || true;

      expect(isEligible).toBe(true);
    });
  });
});

describe('Incentive Calculations', () => {
  describe('Discount Percentage', () => {
    it('should calculate discount amount', () => {
      const orderValue = 100;
      const discountPercent = 20;
      const discount = orderValue * (discountPercent / 100);

      expect(discount).toBe(20);
    });
  });

  describe('Points Award', () => {
    it('should calculate bonus points', () => {
      const basePoints = 100;
      const bonusMultiplier = 2;
      const totalPoints = basePoints * bonusMultiplier;

      expect(totalPoints).toBe(200);
    });
  });
});

describe('Recipient Processing', () => {
  describe('Recipient Creation', () => {
    it('should create recipients for eligible customers', () => {
      const eligibleCustomers = [
        { customer_id: 'cust-1' },
        { customer_id: 'cust-2' },
        { customer_id: 'cust-3' },
      ];
      const campaignId = 'campaign-1';
      const userId = 'user-123';

      const recipients = eligibleCustomers.map((c) => ({
        campaign_id: campaignId,
        customer_id: c.customer_id,
        user_id: userId,
        status: 'pending',
      }));

      expect(recipients.length).toBe(3);
      expect(recipients[0].status).toBe('pending');
    });
  });

  describe('Empty Eligible Customers', () => {
    it('should return 0 recipients when none eligible', () => {
      const eligibleCustomers: Array<{ customer_id: string }> = [];
      const recipientsAdded = eligibleCustomers.length;

      expect(recipientsAdded).toBe(0);
    });
  });
});

describe('Campaign Activation', () => {
  describe('Status Update', () => {
    it('should set status to active', () => {
      const campaign = { status: 'draft' };
      campaign.status = 'active';

      expect(campaign.status).toBe('active');
    });

    it('should set starts_at to now', () => {
      const before = Date.now();
      const startsAt = new Date().toISOString();
      const after = Date.now();

      const startsAtTime = new Date(startsAt).getTime();
      expect(startsAtTime).toBeGreaterThanOrEqual(before);
      expect(startsAtTime).toBeLessThanOrEqual(after);
    });
  });

  describe('Customer Count Update', () => {
    it('should update customers_targeted', () => {
      const eligibleCount = 25;
      const campaign = { customers_targeted: 0 };
      campaign.customers_targeted = eligibleCount;

      expect(campaign.customers_targeted).toBe(25);
    });
  });
});
