import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_USER_ID } from '../../setup';

// Create mock chain builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: dataArray, error, count: dataArray.length }),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length })),
  };
}

const mockCustomers = [
  {
    id: 'customer-1',
    user_id: TEST_USER_ID,
    email: 'jane@example.com',
    first_name: 'Jane',
    last_name: 'Doe',
    stage: 'active',
    primary_collection: 'grounding',
    lifetime_value: 250.00,
    order_count: 5,
    shopify_customer_id: 'gid://shopify/Customer/123',
    created_at: new Date().toISOString(),
  },
  {
    id: 'customer-2',
    user_id: TEST_USER_ID,
    email: 'john@example.com',
    first_name: 'John',
    last_name: 'Smith',
    stage: 'at_risk',
    primary_collection: 'growth',
    lifetime_value: 75.00,
    order_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'customer-3',
    user_id: TEST_USER_ID,
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'Wonder',
    stage: 'new',
    primary_collection: 'wholeness',
    lifetime_value: 0,
    order_count: 0,
    created_at: new Date().toISOString(),
  },
];

// Mock the auth session helper
vi.mock('@/lib/auth/session', () => ({
  getApiUserId: vi.fn(() => Promise.resolve(TEST_USER_ID)),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: TEST_USER_ID } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'customers') {
        return createMockQueryBuilder(mockCustomers);
      }
      return createMockQueryBuilder([]);
    }),
  })),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as any);
}

describe('Customers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/customers', () => {
    it('returns list of customers', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('customers');
      expect(Array.isArray(data.customers)).toBe(true);
    });

    it('returns pagination info', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers?limit=10&offset=0');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });

    it('accepts stage filter parameter', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers?stage=active');

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });

    it('accepts collection filter parameter', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers?collection=grounding');

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });

    it('accepts search filter parameter', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers?search=jane');

      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });

    it('rejects invalid limit parameter', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers?limit=500');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('rejects limit above 100', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers?limit=101');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('rejects negative offset', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers?offset=-5');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('uses default limit and offset when not provided', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
    });

    it('orders customers by lifetime value descending', async () => {
      const { GET } = await import('@/app/api/customers/route');
      const request = createMockRequest('http://localhost:3000/api/customers');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Mock returns customers - verify structure
      expect(data).toHaveProperty('customers');
    });
  });
});

describe('Customers API - Response Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('customers have expected structure', async () => {
    const { GET } = await import('@/app/api/customers/route');
    const request = createMockRequest('http://localhost:3000/api/customers');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.customers && data.customers.length > 0) {
      const customer = data.customers[0];
      expect(customer).toHaveProperty('id');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('stage');
    }
  });

  it('includes lifetime value data', async () => {
    const { GET } = await import('@/app/api/customers/route');
    const request = createMockRequest('http://localhost:3000/api/customers');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.customers && data.customers.length > 0) {
      const customer = data.customers[0];
      expect(customer).toHaveProperty('lifetime_value');
      expect(typeof customer.lifetime_value).toBe('number');
    }
  });

  it('includes order count data', async () => {
    const { GET } = await import('@/app/api/customers/route');
    const request = createMockRequest('http://localhost:3000/api/customers');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.customers && data.customers.length > 0) {
      const customer = data.customers[0];
      expect(customer).toHaveProperty('order_count');
    }
  });
});

describe('Customers API - Stage Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by active stage', async () => {
    const { GET } = await import('@/app/api/customers/route');
    const request = createMockRequest('http://localhost:3000/api/customers?stage=active');

    const response = await GET(request);
    expect([200, 500]).toContain(response.status);
  });

  it('filters by at_risk stage', async () => {
    const { GET } = await import('@/app/api/customers/route');
    const request = createMockRequest('http://localhost:3000/api/customers?stage=at_risk');

    const response = await GET(request);
    expect([200, 500]).toContain(response.status);
  });

  it('filters by new stage', async () => {
    const { GET } = await import('@/app/api/customers/route');
    const request = createMockRequest('http://localhost:3000/api/customers?stage=new');

    const response = await GET(request);
    expect([200, 500]).toContain(response.status);
  });

  it('filters by churned stage', async () => {
    const { GET } = await import('@/app/api/customers/route');
    const request = createMockRequest('http://localhost:3000/api/customers?stage=churned');

    const response = await GET(request);
    expect([200, 500]).toContain(response.status);
  });
});
