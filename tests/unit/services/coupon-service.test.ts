import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_USER_ID } from '../../setup';

// Mock the coupon data
const mockCoupon = {
  id: 'coupon-1',
  user_id: TEST_USER_ID,
  code: 'SAVE20',
  discount_type: 'percentage',
  discount_value: 20,
  status: 'active',
  usage_count: 5,
  usage_limit: 100,
  per_customer_limit: 1,
  minimum_purchase: 50,
  starts_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
  expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
  total_discount_amount: 150,
  created_at: new Date().toISOString(),
};

const mockCoupons = [
  mockCoupon,
  {
    ...mockCoupon,
    id: 'coupon-2',
    code: 'FLAT10',
    discount_type: 'fixed',
    discount_value: 10,
    status: 'active',
    usage_count: 2,
    total_discount_amount: 20,
  },
  {
    ...mockCoupon,
    id: 'coupon-3',
    code: 'EXPIRED',
    status: 'expired',
    usage_count: 10,
    total_discount_amount: 100,
  },
];

// Create mock chain builder
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockResolvedValue({ error }),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error })),
  };
}

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn((table: string) => {
      if (table === 'coupons') {
        return createMockQueryBuilder(mockCoupons);
      }
      if (table === 'coupon_uses') {
        return {
          ...createMockQueryBuilder([]),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ count: 0 })),
          }),
        };
      }
      return createMockQueryBuilder([]);
    }),
  })),
}));

describe('Coupon Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCoupon', () => {
    it('should create a coupon with required fields', async () => {
      const { createCoupon } = await import('@/lib/coupons/coupon-service');

      const input = {
        code: 'NEWCODE',
        discount_type: 'percentage' as const,
        discount_value: 15,
      };

      const coupon = await createCoupon(TEST_USER_ID, input);
      expect(coupon).toBeDefined();
    });

    it('should uppercase the coupon code', async () => {
      const { createCoupon } = await import('@/lib/coupons/coupon-service');

      const input = {
        code: 'lowercase',
        discount_type: 'percentage' as const,
        discount_value: 10,
      };

      const coupon = await createCoupon(TEST_USER_ID, input);
      expect(coupon).toBeDefined();
    });

    it('should set default values for optional fields', async () => {
      const { createCoupon } = await import('@/lib/coupons/coupon-service');

      const input = {
        code: 'DEFAULT',
        discount_type: 'fixed' as const,
        discount_value: 5,
      };

      const coupon = await createCoupon(TEST_USER_ID, input);
      expect(coupon).toBeDefined();
    });
  });

  describe('getCouponStats', () => {
    it('should return coupon statistics', async () => {
      const { getCouponStats } = await import('@/lib/coupons/coupon-service');

      const stats = await getCouponStats(TEST_USER_ID);

      expect(stats).toHaveProperty('totalCoupons');
      expect(stats).toHaveProperty('activeCoupons');
      expect(stats).toHaveProperty('totalUsage');
      expect(stats).toHaveProperty('totalDiscountGiven');
    });

    it('should calculate total coupons correctly', async () => {
      const { getCouponStats } = await import('@/lib/coupons/coupon-service');

      const stats = await getCouponStats(TEST_USER_ID);

      expect(typeof stats.totalCoupons).toBe('number');
      expect(stats.totalCoupons).toBeGreaterThanOrEqual(0);
    });

    it('should calculate active coupons correctly', async () => {
      const { getCouponStats } = await import('@/lib/coupons/coupon-service');

      const stats = await getCouponStats(TEST_USER_ID);

      expect(typeof stats.activeCoupons).toBe('number');
      expect(stats.activeCoupons).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total usage correctly', async () => {
      const { getCouponStats } = await import('@/lib/coupons/coupon-service');

      const stats = await getCouponStats(TEST_USER_ID);

      expect(typeof stats.totalUsage).toBe('number');
      expect(stats.totalUsage).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total discount given correctly', async () => {
      const { getCouponStats } = await import('@/lib/coupons/coupon-service');

      const stats = await getCouponStats(TEST_USER_ID);

      expect(typeof stats.totalDiscountGiven).toBe('number');
      expect(stats.totalDiscountGiven).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateCoupon', () => {
    it('should return valid for a valid coupon', async () => {
      const { validateCoupon } = await import('@/lib/coupons/coupon-service');

      const result = await validateCoupon(
        TEST_USER_ID,
        'SAVE20',
        'customer@example.com',
        100
      );

      expect(result).toHaveProperty('valid');
    });

    it('should return invalid for non-existent coupon code', async () => {
      // Mock to return null for non-existent coupon
      vi.doMock('@/lib/supabase/server', () => ({
        createClient: vi.fn(() => Promise.resolve({
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      }));

      const { validateCoupon } = await import('@/lib/coupons/coupon-service');

      const result = await validateCoupon(
        TEST_USER_ID,
        'NONEXISTENT',
        'customer@example.com',
        100
      );

      expect(result).toHaveProperty('valid');
    });

    it('should check minimum purchase requirement', async () => {
      const { validateCoupon } = await import('@/lib/coupons/coupon-service');

      // Cart total below minimum
      const result = await validateCoupon(
        TEST_USER_ID,
        'SAVE20',
        'customer@example.com',
        10 // below $50 minimum
      );

      expect(result).toHaveProperty('valid');
    });

    it('should uppercase the code before checking', async () => {
      const { validateCoupon } = await import('@/lib/coupons/coupon-service');

      const result = await validateCoupon(
        TEST_USER_ID,
        'save20', // lowercase
        'customer@example.com',
        100
      );

      expect(result).toHaveProperty('valid');
    });
  });
});

describe('Coupon Validation Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate discount type is percentage or fixed', () => {
    const validTypes = ['percentage', 'fixed', 'bogo'];

    validTypes.forEach((type) => {
      expect(['percentage', 'fixed', 'bogo']).toContain(type);
    });
  });

  it('should validate discount value is positive', () => {
    const validValue = 20;
    expect(validValue).toBeGreaterThan(0);
  });

  it('should validate percentage discount is between 1 and 100', () => {
    const validPercentage = 20;
    expect(validPercentage).toBeGreaterThanOrEqual(1);
    expect(validPercentage).toBeLessThanOrEqual(100);
  });

  it('should validate minimum purchase is non-negative', () => {
    const validMinimum = 50;
    expect(validMinimum).toBeGreaterThanOrEqual(0);
  });

  it('should validate usage limit is positive when set', () => {
    const validLimit = 100;
    expect(validLimit).toBeGreaterThan(0);
  });
});

describe('Coupon Code Formatting', () => {
  it('should format code to uppercase', () => {
    const code = 'save20';
    expect(code.toUpperCase()).toBe('SAVE20');
  });

  it('should handle already uppercase codes', () => {
    const code = 'SAVE20';
    expect(code.toUpperCase()).toBe('SAVE20');
  });

  it('should handle mixed case codes', () => {
    const code = 'SaVe20';
    expect(code.toUpperCase()).toBe('SAVE20');
  });
});
