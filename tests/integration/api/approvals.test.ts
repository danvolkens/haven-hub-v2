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
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: dataArray, error, count: dataArray.length }),
    single: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: dataArray[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length })),
  };
}

const mockApprovalItems = [
  {
    id: 'approval-1',
    type: 'pin',
    status: 'pending',
    user_id: TEST_USER_ID,
    priority: 1,
    flags: {},
    content: { title: 'Test Pin' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'approval-2',
    type: 'asset',
    status: 'pending',
    user_id: TEST_USER_ID,
    priority: 0,
    flags: {},
    content: { subject: 'Test Asset' },
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
      if (table === 'approval_items') {
        return createMockQueryBuilder(mockApprovalItems);
      }
      return createMockQueryBuilder([]);
    }),
  })),
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: TEST_USER_ID } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'approval_items') {
        return createMockQueryBuilder(mockApprovalItems);
      }
      return createMockQueryBuilder([]);
    }),
  })),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as any);
}

describe('Approvals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/approvals', () => {
    it('returns list of pending approval items', async () => {
      const { GET } = await import('@/app/api/approvals/route');
      const request = createMockRequest('http://localhost:3000/api/approvals');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('returns pagination info', async () => {
      const { GET } = await import('@/app/api/approvals/route');
      const request = createMockRequest('http://localhost:3000/api/approvals?limit=10&offset=0');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });
  });
});

describe('Approvals API - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns items with expected structure', async () => {
    const { GET } = await import('@/app/api/approvals/route');
    const request = createMockRequest('http://localhost:3000/api/approvals');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.items && data.items.length > 0) {
      expect(data.items[0]).toHaveProperty('id');
      expect(data.items[0]).toHaveProperty('type');
      expect(data.items[0]).toHaveProperty('status');
    }
  });

  it('rejects invalid type parameter', async () => {
    const { GET } = await import('@/app/api/approvals/route');
    const request = createMockRequest('http://localhost:3000/api/approvals?type=invalid');

    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('rejects invalid limit parameter', async () => {
    const { GET } = await import('@/app/api/approvals/route');
    const request = createMockRequest('http://localhost:3000/api/approvals?limit=500');

    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
