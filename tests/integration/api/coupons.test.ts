import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';

// Mock the coupon service
vi.mock('@/lib/coupons/coupon-service', () => ({
  createCoupon: vi.fn(),
  getCouponStats: vi.fn(),
}));

// Mock Supabase auth
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  })),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Coupons API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/coupons', () => {
    it('returns list of coupons', async () => {
      const { GET } = await import('@/app/api/coupons/route');
      const request = createMockRequest('http://localhost:3000/api/coupons');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('coupons');
      expect(Array.isArray(data.coupons)).toBe(true);
    });
  });

  describe('POST /api/coupons', () => {
    it('creates a new coupon', async () => {
      const { createCoupon } = await import('@/lib/coupons/coupon-service');
      const mockedCreateCoupon = vi.mocked(createCoupon);
      mockedCreateCoupon.mockResolvedValue({
        id: 'new-id',
        code: 'TEST20',
        discount_type: 'percentage',
        discount_value: 20,
        user_id: TEST_USER_ID,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      const { POST } = await import('@/app/api/coupons/route');
      const request = createMockRequest('http://localhost:3000/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: 'TEST20',
          discount_type: 'percentage',
          discount_value: 20,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.coupon).toBeDefined();
      expect(data.coupon.code).toBe('TEST20');
    });

    it('returns error when coupon creation fails', async () => {
      const { createCoupon } = await import('@/lib/coupons/coupon-service');
      const mockedCreateCoupon = vi.mocked(createCoupon);
      mockedCreateCoupon.mockRejectedValue(new Error('Invalid coupon code format'));

      const { POST } = await import('@/app/api/coupons/route');
      const request = createMockRequest('http://localhost:3000/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: 'invalid code!',
          discount_type: 'percentage',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
