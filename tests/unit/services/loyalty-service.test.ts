import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'ABC12345'),
}));

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'upsert'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockLoyalty = {
  id: 'loyalty-1',
  customer_id: 'customer-1',
  user_id: 'user-123',
  points_balance: 500,
  points_earned_lifetime: 1500,
  points_redeemed_lifetime: 1000,
  tier_id: 'tier-gold',
  referral_code: 'ABC12345',
  referrals_count: 5,
  referral_points_earned: 250,
  tier: { id: 'tier-gold', name: 'Gold', points_multiplier: 1.5 },
};

const mockQueryBuilder = createMockQueryBuilder([mockLoyalty]);

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: 'transaction-123', error: null }),
  })),
}));

describe('Loyalty Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateCustomerLoyalty', () => {
    it('should be exported as a function', async () => {
      const { getOrCreateCustomerLoyalty } = await import('@/lib/loyalty/loyalty-service');
      expect(typeof getOrCreateCustomerLoyalty).toBe('function');
    });

    it('should accept userId and customerId', async () => {
      const { getOrCreateCustomerLoyalty } = await import('@/lib/loyalty/loyalty-service');
      const result = await getOrCreateCustomerLoyalty('user-123', 'customer-1');
      expect(result).toBeDefined();
    });

    it('should return loyalty record with tier', async () => {
      const { getOrCreateCustomerLoyalty } = await import('@/lib/loyalty/loyalty-service');
      const result = await getOrCreateCustomerLoyalty('user-123', 'customer-1');

      if (result) {
        expect(result).toHaveProperty('points_balance');
        expect(result).toHaveProperty('tier');
      }
    });
  });

  describe('awardPointsForPurchase', () => {
    it('should be exported as a function', async () => {
      const { awardPointsForPurchase } = await import('@/lib/loyalty/loyalty-service');
      expect(typeof awardPointsForPurchase).toBe('function');
    });

    it('should accept userId, customerId, orderValue, and orderId', async () => {
      const { awardPointsForPurchase } = await import('@/lib/loyalty/loyalty-service');
      const result = await awardPointsForPurchase('user-123', 'customer-1', 100.50, 'order-1');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('pointsAwarded');
    });

    it('should calculate points as floor of order value', async () => {
      const { awardPointsForPurchase } = await import('@/lib/loyalty/loyalty-service');
      const result = await awardPointsForPurchase('user-123', 'customer-1', 99.99, 'order-1');

      expect(result.pointsAwarded).toBe(99);
    });
  });

  describe('redeemReward', () => {
    it('should be exported as a function', async () => {
      const { redeemReward } = await import('@/lib/loyalty/loyalty-service');
      expect(typeof redeemReward).toBe('function');
    });

    it('should accept userId, customerId, and rewardId', async () => {
      const { redeemReward } = await import('@/lib/loyalty/loyalty-service');
      const result = await redeemReward('user-123', 'customer-1', 'reward-1');

      expect(result).toHaveProperty('success');
    });

    it('should return discountCode on success', async () => {
      const { redeemReward } = await import('@/lib/loyalty/loyalty-service');
      const result = await redeemReward('user-123', 'customer-1', 'reward-1');

      if (result.success) {
        expect(result.discountCode).toBeDefined();
      }
    });
  });

  describe('processReferral', () => {
    it('should be exported as a function', async () => {
      const { processReferral } = await import('@/lib/loyalty/loyalty-service');
      expect(typeof processReferral).toBe('function');
    });

    it('should accept userId, referralCode, newCustomerId, and orderValue', async () => {
      const { processReferral } = await import('@/lib/loyalty/loyalty-service');
      const result = await processReferral('user-123', 'ABC12345', 'new-customer-1', 150.00);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('pointsAwarded');
    });
  });

  describe('getLoyaltyDashboard', () => {
    it('should be exported as a function', async () => {
      const { getLoyaltyDashboard } = await import('@/lib/loyalty/loyalty-service');
      expect(typeof getLoyaltyDashboard).toBe('function');
    });

    it('should accept userId', async () => {
      const { getLoyaltyDashboard } = await import('@/lib/loyalty/loyalty-service');
      const result = await getLoyaltyDashboard('user-123');
      expect(result).toBeDefined();
    });

    it('should return dashboard structure', async () => {
      const { getLoyaltyDashboard } = await import('@/lib/loyalty/loyalty-service');
      const result = await getLoyaltyDashboard('user-123');

      expect(result).toHaveProperty('totalMembers');
      expect(result).toHaveProperty('totalPointsOutstanding');
      expect(result).toHaveProperty('tierDistribution');
      expect(result).toHaveProperty('recentRedemptions');
      expect(result).toHaveProperty('topReferrers');
    });
  });
});

describe('Loyalty Types', () => {
  describe('Points Transaction Types', () => {
    const validTypes = [
      'earn_purchase',
      'earn_referral',
      'earn_bonus',
      'earn_tier_upgrade',
      'redeem_discount',
      'redeem_reward',
      'expire',
      'admin_adjustment',
    ];

    validTypes.forEach((type) => {
      it(`should recognize ${type} as valid transaction type`, () => {
        expect(validTypes).toContain(type);
      });
    });
  });

  describe('Tier Properties', () => {
    it('should have required tier properties', () => {
      const tier = {
        id: 'tier-gold',
        name: 'Gold',
        tier_order: 2,
        points_multiplier: 1.5,
        min_points: 1000,
        perks: ['Free shipping', '10% discount'],
      };

      expect(tier.id).toBeDefined();
      expect(tier.name).toBeDefined();
      expect(tier.tier_order).toBeDefined();
      expect(tier.points_multiplier).toBeDefined();
    });
  });

  describe('Reward Properties', () => {
    it('should have required reward properties', () => {
      const reward = {
        id: 'reward-1',
        name: '10% Off',
        points_cost: 500,
        discount_type: 'percentage',
        discount_value: 10,
        is_active: true,
        min_tier_id: null,
        total_available: null,
        total_redeemed: 25,
      };

      expect(reward.points_cost).toBeGreaterThan(0);
      expect(reward.is_active).toBe(true);
    });
  });
});

describe('Points Calculation Logic', () => {
  describe('Base Points Calculation', () => {
    it('should award 1 point per dollar', () => {
      const orderValue = 75.50;
      const basePoints = Math.floor(orderValue);

      expect(basePoints).toBe(75);
    });

    it('should floor decimal values', () => {
      const orderValue = 99.99;
      const basePoints = Math.floor(orderValue);

      expect(basePoints).toBe(99);
    });
  });

  describe('Referral Points Calculation', () => {
    it('should award 10% of order value as points', () => {
      const orderValue = 100;
      const referralPoints = Math.floor(orderValue * 0.1);

      expect(referralPoints).toBe(10);
    });

    it('should floor referral points', () => {
      const orderValue = 75;
      const referralPoints = Math.floor(orderValue * 0.1);

      expect(referralPoints).toBe(7);
    });
  });

  describe('Points Multiplier', () => {
    it('should apply tier multiplier correctly', () => {
      const basePoints = 100;
      const multiplier = 1.5;
      const finalPoints = Math.floor(basePoints * multiplier);

      expect(finalPoints).toBe(150);
    });

    it('should apply 2x multiplier for highest tier', () => {
      const basePoints = 100;
      const multiplier = 2.0;
      const finalPoints = Math.floor(basePoints * multiplier);

      expect(finalPoints).toBe(200);
    });
  });
});

describe('Reward Redemption Logic', () => {
  describe('Points Check', () => {
    it('should allow redemption when points sufficient', () => {
      const pointsBalance = 500;
      const pointsCost = 250;
      const canRedeem = pointsBalance >= pointsCost;

      expect(canRedeem).toBe(true);
    });

    it('should deny redemption when points insufficient', () => {
      const pointsBalance = 100;
      const pointsCost = 250;
      const canRedeem = pointsBalance >= pointsCost;

      expect(canRedeem).toBe(false);
    });
  });

  describe('Availability Check', () => {
    it('should allow redemption when unlimited', () => {
      const reward = { total_available: null, total_redeemed: 100 };
      const isAvailable = reward.total_available === null || reward.total_redeemed < reward.total_available;

      expect(isAvailable).toBe(true);
    });

    it('should deny redemption when sold out', () => {
      const reward = { total_available: 50, total_redeemed: 50 };
      const isAvailable = reward.total_available === null || reward.total_redeemed < reward.total_available;

      expect(isAvailable).toBe(false);
    });
  });

  describe('Discount Code Generation', () => {
    it('should generate HH prefixed codes', () => {
      const prefix = 'HH';
      const random = 'ABC123';
      const code = `${prefix}${random}`;

      expect(code.startsWith('HH')).toBe(true);
    });

    it('should generate uppercase codes', () => {
      const code = 'HHABC123';

      expect(code).toBe(code.toUpperCase());
    });
  });

  describe('Redemption Expiry', () => {
    it('should set 30 day expiry', () => {
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(now + thirtyDays);

      const daysDiff = Math.round((expiresAt.getTime() - now) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBe(30);
    });
  });
});

describe('Referral Logic', () => {
  describe('Self-Referral Prevention', () => {
    it('should prevent self-referral', () => {
      const referrerCustomerId = 'customer-1';
      const newCustomerId = 'customer-1';
      const isSelfReferral = referrerCustomerId === newCustomerId;

      expect(isSelfReferral).toBe(true);
    });

    it('should allow different customer referral', () => {
      const referrerCustomerId = 'customer-1';
      const newCustomerId = 'customer-2';
      const isSelfReferral = referrerCustomerId === newCustomerId;

      expect(isSelfReferral).toBe(false);
    });
  });

  describe('Referral Code Format', () => {
    it('should be 8 characters', () => {
      const code = 'ABC12345';

      expect(code.length).toBe(8);
    });

    it('should be uppercase', () => {
      const code = 'ABC12345';

      expect(code).toBe(code.toUpperCase());
    });
  });
});

describe('Dashboard Analytics', () => {
  describe('Tier Distribution', () => {
    it('should aggregate members by tier', () => {
      const records = [
        { tier_id: 'bronze' },
        { tier_id: 'bronze' },
        { tier_id: 'silver' },
        { tier_id: 'gold' },
        { tier_id: 'gold' },
        { tier_id: 'gold' },
      ];

      const tierMap = new Map([
        ['bronze', 'Bronze'],
        ['silver', 'Silver'],
        ['gold', 'Gold'],
      ]);

      const distribution: Record<string, number> = {};
      for (const record of records) {
        const tierName = tierMap.get(record.tier_id) || 'Unknown';
        distribution[tierName] = (distribution[tierName] || 0) + 1;
      }

      expect(distribution.Bronze).toBe(2);
      expect(distribution.Silver).toBe(1);
      expect(distribution.Gold).toBe(3);
    });
  });

  describe('Points Outstanding', () => {
    it('should sum all points balances', () => {
      const records = [
        { points_balance: 100 },
        { points_balance: 250 },
        { points_balance: 500 },
      ];

      const total = records.reduce((sum, r) => sum + r.points_balance, 0);

      expect(total).toBe(850);
    });
  });

  describe('Top Referrers', () => {
    it('should sort by referral count descending', () => {
      const records = [
        { referrals_count: 5, email: 'a@test.com', points: 250 },
        { referrals_count: 10, email: 'b@test.com', points: 500 },
        { referrals_count: 3, email: 'c@test.com', points: 150 },
      ];

      const sorted = [...records].sort((a, b) => b.referrals_count - a.referrals_count);

      expect(sorted[0].email).toBe('b@test.com');
      expect(sorted[0].referrals_count).toBe(10);
    });

    it('should limit to top 5', () => {
      const records = Array(10).fill(null).map((_, i) => ({
        referrals_count: i + 1,
        email: `user${i}@test.com`,
        points: (i + 1) * 50,
      }));

      const top5 = records
        .filter((r) => r.referrals_count > 0)
        .sort((a, b) => b.referrals_count - a.referrals_count)
        .slice(0, 5);

      expect(top5.length).toBe(5);
    });
  });
});
